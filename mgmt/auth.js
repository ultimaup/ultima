const { Router } = require('express')
const querystring = require('querystring')
const cookieParser = require('cookie-parser')

const User = require('./db/User')
const jwt = require('./jwt')

const { 
    githubCodeToAuth,
    githubGet,
} = require('./github')
const kibana = require('./kibana')
const s3 = require('./s3')
const { genBucketPass } = require('./ci')
const uuid = require('uuid').v4

const {
    AUTH_REDIRECT,
    GITHUB_CLIENT_ID,
    GITHUB_OAUTH_CLIENT_ID,
    GITEA_COOKIE_NAME,
    GITHUB_APP_NAME,
    BILLING_DISABLED,
} = process.env

const router = new Router()

router.get('/auth/github', async (req, res) => {
    res.redirect(302, `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}`)
})

router.get('/auth/github-oauth', async (req, res) => {
    const { grants } = req.query
    const scope = []
    if (grants.includes('repo')) {
        scope.push('repo')
    }
    if (grants.includes('keys')) {
        scope.push('write:public_key')
    }
    res.redirect(302, `https://github.com/login/oauth/authorize?client_id=${GITHUB_OAUTH_CLIENT_ID}&scope=${[
        'read:user',
        'user:email',
        ...scope,
    ].join('%20')}`)
})

router.get('/vcs/:vcs', async (req, res) => {
    const { vcs } = req.params
    if (vcs === 'github') {
        return res.redirect(`https://github.com/apps/${GITHUB_APP_NAME}/installations/new`, 302)
    } else {
        return res.status(404).send('unknown vcs')
    }
})

const loginSessions = {}
const getLoginSession = id => loginSessions[id]
const setLoginSession = ({ id, token }) => {
    loginSessions[id] = {
        id,
        token,
    }

    setTimeout(() => {
        delete loginSessions[id]
    }, 30000)
}

const createLoginSession = () => {
    const id = uuid()
    loginSessions[id] = {
        id,
    }
    return loginSessions[id]
}

router.get('/auth/cli', async (req, res) => {
    const { sessionId, grants } = req.query
    res.cookie('ultima_cli_sessionId', sessionId, { httpOnly: true })
    res.redirect(`/auth/github${grants ? `-oauth?grants=${grants}` : ''}`, 302)
})

router.get('/auth/github-redirect', cookieParser(), async (req, res) => {
    const { code } = req.query
    const auth = await githubCodeToAuth(code)

    const { access_token } = auth
    let { avatar_url: imageUrl, login: username, name, email } = await githubGet('https://api.github.com/user', access_token)
    
    if (!username) {
        throw new Error('invalid code')
    }

    if (!email) {
        // try get their primary private email
        try {
            const emails = await githubGet('https://api.github.com/user/emails', access_token)
            const primaryEmail = emails.find(e => e.primary)
            email = primaryEmail.email
        } catch (e) {
            //
        }
    }
    
    const u = {
        username,
        imageUrl,
        name,
        email,
    }

    if (BILLING_DISABLED) {
        u.tier = 'business'
    }

    // create or get user
    const user = await User.ensure(u)

    // get token for user
    const token = await jwt.sign({
        ...user.toJSON(),
        githubAccessToken: access_token,
    })

    if (!user.activated) {
        return res.redirect(302, `${AUTH_REDIRECT}?${querystring.encode({
            token,
            waitlist: true,
        })}`)
    }

    // ensure kibana user
    const { sid } = await kibana.ensureKibanaUser({ email, username, fullName: name, password: user.id })

    // ensure minio user
    await s3.ensureFileUserExists(username, genBucketPass(username))

    let redirectUrl = `${AUTH_REDIRECT}?${querystring.encode({
        token,
    })}`
    const { ultima_cli_sessionId } = req.cookies
    if (ultima_cli_sessionId) {
        setLoginSession({
            id: ultima_cli_sessionId,
            token,
        })
        redirectUrl = `${redirectUrl}&backTo=cli`
        res.cookie('ultima_cli_sessionId', null, { httpOnly: true, maxAge: 0 })
    }
    
    res.cookie('sid', sid, { httpOnly: true, path: '/kibana' })
    res.cookie('ultima_token', token, { httpOnly: true })

    res.redirect(302, redirectUrl)
})

router.get('/auth/logout', (req, res) => {
    res.cookie(GITEA_COOKIE_NAME, null, { httpOnly: true, maxAge: 0 })
    res.cookie('sid', null, { httpOnly: true, path: '/kibana',  maxAge: 0 })
    res.cookie('ultima_token', null, { httpOnly: true,  maxAge: 0 })

    res.redirect(302, '/')
})

router.get('/auth/me', async (req, res) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ')[1]
        if (!token) {
            res.json(null)
        } else {
            try {
                const user = await jwt.verify(token)
                res.json(user)
            } catch (e) {
                res.json(null)
            }
        }
    } else {
        res.json(null)
    }
})

router.use('/kibana', cookieParser())

router.get('/kibana/*', async (req, res) => {    
    const { ultima_token } = req.cookies

    if (ultima_token) {
        try {
            const { email, username, name, id } = await jwt.verify(ultima_token)
    
            const { sid } = await kibana.ensureKibanaUser({ email, username, fullName: name, password: id })
            res.cookie('sid', sid, { httpOnly: true, path: '/kibana' })
            if (req.query.next) {
                return res.redirect(302, req.query.next)
            }
        } catch (e) {
            
        }
    }

    res.redirect(302, req.query.next ? `/user/login?redirect_to=${req.query.next}` : '/user/login')
})

const ensureResourceAccess = async (username, fullNames) => {
    if (!fullNames.length) {
        return
    }

    await Promise.all([
        kibana.ensureUserCanAccessRepos(username, fullNames.map(l => l.split('.').join('-'))),
        s3.ensureUserCanAccessRepos(username, fullNames),
    ])
}

module.exports = {
    router,
    getLoginSession,
    createLoginSession,
    ensureResourceAccess,
}