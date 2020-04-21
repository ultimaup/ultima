const { Router } = require('express')
const querystring = require('querystring')

const User = require('./db/User')
const jwt = require('./jwt')
const { ensureGiteaUserExists, getGiteaSession } = require('./gitea')
const { 
    githubCodeToAuth,
    githubGet,
} = require('./github')
const kibana = require('./kibana')

const {
    AUTH_REDIRECT,
    GITHUB_CLIENT_ID,
    GITEA_COOKIE_NAME,
} = process.env

const router = new Router()

router.get('/auth/github', async (req, res) => {
    res.redirect(302, `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}`)
})

router.get('/auth/github-redirect', async (req, res) => {
    const { code } = req.query
    const auth = await githubCodeToAuth(code)

    const { access_token } = auth
    const { avatar_url: imageUrl, login: username, name, email } = await githubGet('https://api.github.com/user', access_token)

    if (!username) {
        throw new Error('invalid code')
    }
    // create or get user
    const user = await User.ensure({
        username,
        imageUrl,
        name,
        email,
    })

    // get token for user
    const token = await jwt.sign(user.toJSON())

    // ensure gitea user
    await ensureGiteaUserExists({ id: user.id, username, imageUrl, name, email })

    // ensure kibana user
    await ensureKibanaUser({ email, username, fullName: name, password: user.id })

    const sessionId = await getGiteaSession(username, user.id)

    res.cookie(GITEA_COOKIE_NAME, sessionId, { httpOnly: true })

    const redirectUrl = `${AUTH_REDIRECT}?${querystring.encode({
        token,
    })}`

    res.redirect(302, redirectUrl)
})

router.get('/auth/logout', (req, res) => {
    res.cookie(GITEA_COOKIE_NAME, null, { httpOnly: true, maxAge: 0 })
    res.redirect(302, '/')
})

module.exports = app => {
    app.use(router)
}