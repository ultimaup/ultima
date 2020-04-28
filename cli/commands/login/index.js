const { promisify } = require('util')
const commandExists = require('command-exists')
const SSHConfig = require('ssh-config')
const fse = require('fs-extra')
const homedir = require('os').homedir()
const hostname = require('os').hostname()
const path = require('path')
const { cli } = require('cli-ux')
const jwtdecode = require('jwt-decode')
const uuid = require('uuid').v4
const child_process = require('child_process')

const config = require('../../config')
const graphqlFetch = require('../../utils/gqlFetch')

const getSSHHost = require('./getSSHHost')

const exec = promisify(child_process.exec)

const ensureKP = async (user, token) => {
    const hasGit = await commandExists('git')
    const hasKeyscan = await commandExists('ssh-keyscan')
    const {username} = user

    if (hasGit) {
        cli.debug('found git in path')

        const sshDir =  path.resolve(homedir, '.ssh')
        const keyExists = await fse.exists(path.resolve(sshDir, `ultima_${username}`))

        let publicKey

        if (keyExists) {
            cli.debug('found ssh key')
            return true
        } else {
            cli.debug('generating ssh key')

            const pubKeyLoc = path.resolve(sshDir, `ultima_${username}.pub`)
            const privKeyLoc = path.resolve(sshDir, `ultima_${username}`)
            
            await exec(`ssh-keygen -t ed25519 -f ${privKeyLoc} -q -N ""`)
            publicKey = await fse.readFile(pubKeyLoc, 'utf8')
            cli.debug('generated ssh key, writing')

            await fse.chmod(privKeyLoc, 0o600)
            await fse.chmod(pubKeyLoc, 0o644)

            cli.debug('written ssh keys')
        }

        // add key to ssh config
        let configTxt = ''
        const configLoc = path.resolve(sshDir, 'config')

        if (await fse.exists(configLoc)) {
            cli.debug('found existing ssh config')
            configTxt = await fse.readFile(configLoc, 'utf8')
        }

        const config = SSHConfig.parse(configTxt)

        const sshHost = await getSSHHost({ token })
        const Host = sshHost.host

        let needsWrite = false
        if (config.find({ Host })) {
            cli.debug('found existing ultima entry in ssh config')
            const ultimaBlock = config.compute(Host)
            if (ultimaBlock.IdentityFile[0] !== `~/.ssh/ultima_${username}`) {
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
            const c = {
                Host,
                HostName: Host,
                User: sshHost.user,
                IdentityFile: `~/.ssh/ultima_${username}`
            }
            if (sshHost.port) {
                c.Port = sshHost.port
            }
            config.append(c)
            await fse.outputFile(configLoc, config.toString(), { encoding: 'utf8' })
        }

        // add to gitea
        if (publicKey) {
            const title = `ultima-cli-${hostname}-${uuid().split('-')[0]}`
            const gqlFetch = graphqlFetch({ token })
    
            const gqlResult = await gqlFetch(`
                mutation addSSHkey($key: String, $title: String) {
                    addSSHkey(key: $key, title: $title)
                }
            `, { title, key: publicKey })
    
            if (gqlResult) {
                cli.debug('added ssh key to ultima')
            } else {
                cli.error('failed adding ssh key to ultima')
            }
        }

        if (hasKeyscan) {
            await exec(`ssh-keyscan -H ${Host}${sshHost.port ? ` -p ${sshHost.port}` : ''} >> ~/.ssh/known_hosts`)
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
