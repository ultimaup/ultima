const crypto = require('crypto')
const { promisify } = require('util')
const commandExists = require('command-exists')
const SSHConfig = require('ssh-config')
const fse = require('fs-extra')
const homedir = require('os').homedir()
const hostname = require('os').hostname()
const path = require('path')
const { program } = require('commander')
const graphqlFetch = require('graphql-fetch')

const { cli } = require('cli-ux')
const jwtdecode = require('jwt-decode')

const config = require('../../config')

const generateKeyPair = promisify(crypto.generateKeyPair)

const ensureKP = async (user, token) => {
    const hasGit = await commandExists('git')

    if (hasGit) {
        cli.debug('found git in path')
        
        const sshDir =  path.resolve(homedir, '.ssh')
        const keyExists = await fse.exists(path.resolve(sshDir, `ultima_${user}`))

        if (keyExists) {
            cli.debug('found ssh key')
            return true
        } else {
            cli.debug('generating ssh key')
            const { privateKey, publicKey } = await generateKeyPair("ed25519", {
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                },
            })

            cli.debug('generated ssh key, writing')

            await fse.outputFile(path.resolve(sshDir, `ultima_${user}`), privateKey)
            await fse.outputFile(path.resolve(sshDir, `ultima_${user}.pub`), publicKey)

            cli.debug('written ssh keys')
        }

        // add key to ssh config
        let configTxt = ''
        const configLoc = path.resolve(sshDir, 'config')

        if (fse.exists(configLoc)) {
            cli.debug('found existing ssh config')
            configTxt = await fse.readFile(configLoc)
        }

        const config = SSHConfig.parse(configTxt)
        
        const serverUrl = new URL(program.server)
        const Host = serverUrl.host

        let needsWrite = false
        if (config.find({ Host })) {
            cli.debug('found existing ultima entry in ssh config')
            const ultimaBlock = config.compute({ Host })

            if (ultimaBlock.IdentityFile[0] !== `~/.ssh/ultima_${user}`) {
                config.remove({ Host })
                needsWrite = true
                cli.debug('existing ultima entry points to different user, removing')
            } else {
                cli.debug('existing ultima entry points to current user')
            }
        } else {
            needsWrite = true
        }

        if (needsWrite) {
            cli.debug('creating new ultima entry in ssh config')
            config.append({
                Host,
                HostName: Host,
                User: 'ultima',
                IdentityFile: `~/.ssh/ultima_${user}`
            })
            const newSSHConfig = SSHConfig.stringify(config)
            await fse.outputFile(configLoc, newSSHConfig)
        }

        // add to gitea
        
        const title = `ultima-cli-${hostname}`
        const gqlFetch = graphqlFetch(`${program.server}/graphql`)

        const gqlResult = await gqlFetch(`
            mutation addSSHkey:($key: String, $title: String) {
                addSSHkey:(key: $key, title: $title)
            }
        `, { title, key: publicKey }, { 
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })

        if (gqlResult) {
            cli.debug('added ssh key to ultima')
        } else {
            cli.error('failed adding ssh key to ultima')
        }
    } else {
        cli.error(`git not found, please install git, make sure it's in your $PATH, and try again. (This won't be the case in the final release)`)
    }
}

const login = async token => {
    const user = jwtdecode(token)
    cli.log(`Welcome ${user.username}`)

    const cfg = await config.get()
    await config.set({
        ...cfg,
        token,
    })

    await ensureKP(user, token)

    cli.log(`You can now use the ultima cli to develop your projects.`)
}

module.exports = login
