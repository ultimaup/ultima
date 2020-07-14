const { cli } = require('cli-ux')
const jwtdecode = require('jwt-decode')
const { program } = require('commander')

const config = require('../../config')
const graphqlFetch = require('../../utils/gqlFetch')

const checkSession = async id => {
    const gqlFetch = graphqlFetch()
    const gqlResult = await gqlFetch(`
        query getLoginSession($id: ID!) {
            getLoginSession(id: $id) {
                id
                token
            }
        }
    `, { id })

    return gqlResult.data.getLoginSession.token
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const doLogin = async (grants) => {
    const gqlFetch = graphqlFetch()
    
    const gqlResult = await gqlFetch(`
        mutation createLoginSession {
            createLoginSession {
                id
            }
        }
    `, {})

    const sessionId = gqlResult.data.createLoginSession.id

    const authlink = `${program.server}/auth/cli?sessionId=${sessionId}${grants ? `&grants=${grants}` : ''}`
    cli.log(`Please go here to login:`)
    await cli.url(authlink, authlink)
    try {
        await cli.open(authlink)
    } catch (e) {
        
    }

    await cli.action.start('Waiting for login completion')

    let token
    while (!token) {
        token = await checkSession(sessionId)
        if (!token) {
            await wait(500)
        }
    }

    await cli.action.stop()

    const cfg = await config.get()
    await config.set({
        ...cfg,
        token,
    })

    return token
}

const login = async () => {
    cli.log(`Welcome to the Ultima CLI`)
    const token = await doLogin()

    const user = jwtdecode(token)
    cli.log(`Welcome ${user.username}`)

    cli.log(`You can now use the ultima cli to develop your projects.`)
}

module.exports = login
