const fetch = require('node-fetch')
const fs = require('fs')
const { App } = require("@octokit/app")
const { Webhooks } = require("@octokit/webhooks")
const { Octokit } = require("@octokit/rest")
const { createAppAuth } = require("@octokit/auth-app");
const { request } = require("@octokit/request");

const {
	GITHUB_APP_ID,
	GITHUB_APP_KEY_LOCATION,
	
    GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,

	GITHUB_WEBHOOK_SECRET,
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

const webhooks = new Webhooks({
	secret: GITHUB_WEBHOOK_SECRET,
})

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
			const { data: { repositories } } = await request("GET /user/installations/:installation_id/repositories", {
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

	return repos.flat()
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

webhooks.on("*", ({ id, name, payload }) => {
  console.log(name, "event received")

  // if push
	// check if there's an .ultima.yml in this branch/repo
		// if so, start CI process
})


module.exports = {
    githubGet,
	githubCodeToAuth,
	webhooks,
	listRepos,
}