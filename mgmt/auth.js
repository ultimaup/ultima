const { Router } = require('express')
const querystring = require('querystring')

const User = require('./db/User')
const jwt = require('./jwt')
const { ensureGiteaUserExists, getGiteaSession } = require('./gitea')
const { 
    githubCodeToAuth,
    githubGet,
} = require('./github')

const {
    AUTH_REDIRECT,
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

    // create or get user
    const user = await User.ensure({
        username,
        imageUrl,
        name,
        email,
    })

    // get token for user
    const token = jwt.sign(user)

    // ensure gitea user
    await ensureGiteaUserExists({ id: user.id, username, imageUrl, name, email })

    const giteaSessionId = await getGiteaSession(username, user.id)

    const redirectUrl = `${AUTH_REDIRECT}${querystring.encode({
        token,
        giteaSessionId,
    })}`

    res.redirect(302, redirectUrl)
})

module.exports = app => {
    app.use(router)
}