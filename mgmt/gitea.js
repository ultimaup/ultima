const got = require('got')
const { CookieJar } = require('tough-cookie')

const {
	GITEA_MACHINE_USER,
	GITEA_MACHINE_PASSWORD,

	GITEA_URL,
	GITEA_COOKIE_NAME,
} = process.env

const base64 = str => Buffer.from(str).toString('base64')

const giteaFetch = (endpoint, opts, asUser) => {
	const conf = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Basic ${base64(`${GITEA_MACHINE_USER}:${GITEA_MACHINE_PASSWORD}`)}`,
			...(asUser ? {
				Sudo: asUser,
			} : {}),
			...(opts.headers || {}),
		},
		...opts,
	}

	return got(`${GITEA_URL}${endpoint}`, conf)
}

const giteaStream = (url, asUser) => (
	got.stream(url, {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Basic ${base64(`${GITEA_MACHINE_USER}:${GITEA_MACHINE_PASSWORD}`)}`,
			...(asUser ? {
				Sudo: asUser,
			} : {}),
		},
	})
)

const giteaPost = (url, body, asUser) => (
	got.post(url, {
		body: body,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Basic ${base64(`${GITEA_MACHINE_USER}:${GITEA_MACHINE_PASSWORD}`)}`,
			...(asUser ? {
				Sudo: asUser,
			} : {}),
		},
	})
)

const giteaApiReq = (endpoint, { method, body }) => (
	giteaPost(`${GITEA_URL}${endpoint}`, JSON.stringify(body))
	.then(r => {
		if (r.status > 399) {
			throw new Error(`${r.status}`)
		}
	
		return r
	})
	.then(r => r.json())
)

const registerUser = ({ id, username, imageUrl, name, email }) => (
	giteaFetch('/api/v1/admin/users', {
        method: 'post',
        body: JSON.stringify({
            email,
            "full_name": name,
            "login_name": username,
            username,
            avatar_url: imageUrl,
            "must_change_password": false,
            "password": id,
            "send_notify": false,
            "source_id": 0,
        })
    })
)

const ensureGiteaUserExists = async ({ id, username, imageUrl, name, email }) => {
    try {
		const r = await giteaFetch('/api/v1/user', {}, username)
        return true
    } catch (e) {
        if (!e.message.includes('404')) {
			console.error('gitea registration check failed', e)
            throw e
        }
    }
	try {
		await registerUser({ id, username, imageUrl, name, email })
	} catch (e) {
		console.error('gitea registration failed', e)
		throw e
	}

    await giteaFetch('/api/v1/user', {}, username)
}

const getGiteaSession = async (username, password) => {
    const cookieJar = new CookieJar()

    await giteaFetch('/user/login', { cookieJar, headers: { Authorization: undefined } })

    const _csrf = cookieJar.toJSON().cookies.find(({ key }) => key === '_csrf').value
    const sessionId = cookieJar.toJSON().cookies.find(({ key }) => key === GITEA_COOKIE_NAME).value

    const loggedIn = await got.post(`${GITEA_URL}/user/login`, {
        cookieJar,
        form: {
            "user_name": username,
            password,
            _csrf,
        },
        followRedirect: false,
	})
	
    if (loggedIn.statusCode === 302) {
        return sessionId
    } else {
        return null
    }
}

const reportStatus = (fullName, hash, { targetUrl, context, description }, state) => {
	return giteaApiReq(`/api/v1/repos/${fullName}/statuses/${hash}`, {
		method: 'post',
		body: {
			target_url: targetUrl, 
			context,
			description,
			state,
		},
	})
}

module.exports = {
	ensureGiteaUserExists,
	getGiteaSession,
	reportStatus,
	giteaStream,
}
