const got = require('got')
const { CookieJar } = require('tough-cookie')

const {
	GITEA_MACHINE_USER,
	GITEA_MACHINE_PASSWORD,

	GITEA_URL,
	GITEA_COOKIE_NAME,
	TEMPLATE_OWNER_GITEA_USERNAME,
} = process.env

const base64 = str => Buffer.from(str).toString('base64')

const giteaFetch = (endpoint, opts = {}, asUser) => {
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

const idToPassword = id => `${id}1A`

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
            "password": idToPassword(id),
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

const getCsrf = cookieJar => cookieJar.toJSON().cookies.find(({ key }) => key === '_csrf').value

const getLoginCookiejar = async (username, userId) => {
	const password = idToPassword(userId)
    const cookieJar = new CookieJar()

    await giteaFetch('/user/login', { cookieJar, headers: { Authorization: undefined } })

    const _csrf = getCsrf(cookieJar)
    const loggedIn = await got.post(`${GITEA_URL}/user/login`, {
        cookieJar,
        form: {
            "user_name": username,
            password,
            _csrf,
        },
        followRedirect: false,
	})

	return {
		cookieJar,
		loggedIn,
	}
}

const getGiteaSession = async (username, userId) => {
	const { cookieJar, loggedIn } = await getLoginCookiejar(username, userId)
    const sessionId = cookieJar.toJSON().cookies.find(({ key }) => key === GITEA_COOKIE_NAME).value

    if (loggedIn.statusCode === 302) {
        return sessionId
    } else {
        return null
    }
}

const reportStatus = (fullName, hash, { targetUrl, context, description }, state) => {
	return giteaFetch(`/api/v1/repos/${fullName}/statuses/${hash}`, {
		method: 'post',
		body: {
			target_url: targetUrl, 
			context,
			description,
			state,
		},
	})
}

const addSshKey = (username, { key, readOnly = false, title }) => {
	return giteaFetch(`/api/v1/admin/users/${username}/keys`, {
		method: 'post',
		body: JSON.stringify({
			key,
			read_only: readOnly,
			title,
		}),
	}).json()
}

let templateUser

const listTemplateRepos = async () => {
	if (!templateUser) {
		templateUser = await getUser(TEMPLATE_OWNER_GITEA_USERNAME)
	}
	const { data } = await giteaFetch(`/api/v1/repos/search?template=true&uid=${templateUser.id}&exclusive=true`).json()

	return data
}

const getRepo = async ({ username }, { id }) => {
	return giteaFetch(`/api/v1/repos/${id}`,{}, username).json()
}

const getUser = username => giteaFetch(`/api/v1/user`, {}, username).json()

const getUserRepos = async ({ username }) => {
	const user = await getUser(username)
	const { data } = await giteaFetch(`/api/v1/repos/search?uid=${user.id}&exclusive=true`, {}, username).json()

	return data
}

const getLatestCommitFromRepo = async ({ owner, repo }) => {
	const [commit] = await giteaFetch(`/api/v1/repos/${owner}/${repo}/commits`).json()
	return commit
}

const createRepoFromTemplate = async ({ username, userId }, { name, description, private, templateId }) => {
	const { cookieJar } = await getLoginCookiejar(username, userId)

	const currentUser = await getUser(username)

	const loggedInGiteaUserId = currentUser.id

	try {
		await got.get(`${GITEA_URL}/repo/create`, {
			cookieJar,
		})

		const _csrf = getCsrf(cookieJar)

		const result = await got.post(`${GITEA_URL}/repo/create`, {
			cookieJar,
			form: {
				repo_name: name,
				private: private ? 'on' : undefined,
				description: description || "",
				repo_template: templateId,
	
				_csrf,
				uid: loggedInGiteaUserId,
	
				git_content: 'on',
				issue_labels: undefined,
				gitignores: undefined,
				license: undefined,
				readme: 'Default',
				default_branch: undefined
			},
			followRedirect: false,
		})
		if (result.statusCode === 302 && result.headers.location === `/${username}/${name}`) {
			return {
				id: `${username}/${name}`,
			}
		}
	} catch (e) {
		if (e.response) {
			throw new Error (e.response.body)
		}
		throw e
	}
	
	if (result.statusCode === 302) {
		return false
	}
}

module.exports = {
	ensureGiteaUserExists,
	getGiteaSession,
	reportStatus,
	giteaStream,
	addSshKey,
	listTemplateRepos,
	createRepoFromTemplate,
	getRepo,
	getUserRepos,
	getLatestCommitFromRepo,
}
