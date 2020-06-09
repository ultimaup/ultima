const fetch = require('node-fetch')
const fs = require('fs')

const { App } = require("@octokit/app")
const { Octokit } = require("@octokit/rest")
const { createAppAuth } = require("@octokit/auth-app")
const { request } = require("@octokit/request")
const { paginateRest } = require("@octokit/plugin-paginate-rest")

Octokit.plugin(paginateRest)

const {
	GITHUB_APP_ID,
	GITHUB_APP_KEY_LOCATION,
	
    GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,
} = process.env

const PRIVATE_KEY = fs.readFileSync(GITHUB_APP_KEY_LOCATION, 'utf-8')

const app = new App({ id: GITHUB_APP_ID, privateKey: PRIVATE_KEY })

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
	return await app.getInstallationAccessToken({
		installationId,
	})
}

const getUltimaYml = async (installationId, {owner, repo, branch}) => {
	const installationAccessToken = await app.getInstallationAccessToken({
		installationId,
	})
	const path = '.ultima.yml'
	const { data } = await request("GET /repos/:owner/:repo/contents/:path", {
		owner, repo,
		path, ref: branch,
		headers: {
			authorization: `Bearer ${installationAccessToken}`,
			accept: "application/vnd.github.machine-man-preview+json",
		},
	})
	
	return data
}

const setUltimaYml = async (installationId, {owner, repo, branch}, {message, sha}, content) => {
	const installationAccessToken = await app.getInstallationAccessToken({
		installationId,
	})
	const path = '.ultima.yml'

	const { data } = await request("PUT /repos/:owner/:repo/contents/:path", {
		owner, repo,
		path, branch, 
		message, sha, content,
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