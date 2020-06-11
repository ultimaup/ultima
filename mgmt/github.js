const fetch = require('node-fetch')
const fs = require('fs')

const { App } = require("@octokit/app")
const { Octokit } = require("@octokit/rest")
const { createAppAuth } = require("@octokit/auth-app")
const { request } = require("@octokit/request")
const { paginateRest } = require("@octokit/plugin-paginate-rest")
const JWT = require('jsonwebtoken')

Octokit.plugin(paginateRest)

const {
	GITHUB_APP_ID,
	GITHUB_APP_KEY_LOCATION,
	
    GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,
} = process.env

const PRIVATE_KEY = fs.readFileSync(GITHUB_APP_KEY_LOCATION, 'utf-8')

const githubGet = (url, token) => fetch(url, {
	method: 'get',
	headers: {
		Authorization: `token ${token}`,
		'Accept': 'application/json',
	},
}).then(r => r.json())

const githubCodeToAuth = code => fetch('https://github.com/login/oauth/access_token', {
	method: 'post',
	body: JSON.stringify({
		client_id: GITHUB_CLIENT_ID,
		client_secret: GITHUB_CLIENT_SECRET,
		code,
	}),
	headers: {
		'Accept': 'application/json',
		'content-type': 'application/json',
	},
}).then(r => r.json())

const octokit = new Octokit()
const app = new App({ id: GITHUB_APP_ID, privateKey: PRIVATE_KEY })

const listRepos = async ({ accessToken }) => {
	const { data: { installations } } = await request("GET /user/installations", {
		headers: {
		  	authorization: `Bearer ${accessToken}`,
		  	accept: "application/vnd.github.machine-man-preview+json",
		},
	})

	let repos = []

	await Promise.all(
		installations.map(async ({ id }) => {
			const repositories = await octokit.paginate("GET /user/installations/:installation_id/repositories", {
				installation_id: id,
				headers: {
					authorization: `Bearer ${accessToken}`,
					accept: "application/vnd.github.machine-man-preview+json",
				},
			})
			repos.push(repositories.map(repo => {
				return {
					...repo,
					installationId: id,
				}
			}))
		})
	)

	return repos.flat().sort((a,b) => {
		return a.pushed_at > b.pushed_at ? -1 : 1
	})
}

const getInstallationToken = async (installationId) => {
	const jwt = app.getSignedJsonWebToken()
	const { data: { token } } = await request('POST /app/installations/:installation_id/access_tokens', {
		installation_id: installationId,
		headers: {
			authorization: `Bearer ${jwt}`,
			accept: "application/vnd.github.machine-man-preview+json",
		},
	})

	return token
}

const b64e = data => Buffer.from(data).toString('base64')
const b64d = data => Buffer.from(data, 'base64').toString()

const getUltimaYml = async (installationId, {owner, repo, branch}) => {
	const installationAccessToken = await getInstallationToken(installationId)
	const path = '.ultima.yml'
	try {
		const { data } = await request("GET /repos/:owner/:repo/contents/:path", {
			owner, repo,
			path, ref: branch,
			headers: {
				authorization: `Bearer ${installationAccessToken}`,
				accept: "application/vnd.github.machine-man-preview+json",
			},
		})

		const { sha, content } = data
	
		return {
			sha,
			content: b64d(content),
		}
	} catch (e) {
		if (e.message.toLowerCase().includes('not found')) {
			return {
				content: '',
				sha: null,
			}
		}
		console.error(e)
		throw e
	}
}

const setUltimaYml = async (installationId, {owner, repo, branch}, {message, sha}, content) => {
	const installationAccessToken = await getInstallationToken(installationId)
	const path = '.ultima.yml'

	const { data } = await request("PUT /repos/:owner/:repo/contents/:path", {
		owner, repo,
		path, branch, 
		message, sha, content: b64e(content),
		headers: {
			authorization: `Bearer ${installationAccessToken}`,
			accept: "application/vnd.github.machine-man-preview+json",
		},
	})

	return data
}

module.exports = {
    githubGet,
	githubCodeToAuth,
	listRepos,
	getUltimaYml,
	setUltimaYml,
	getInstallationToken,
}