const fetch = require('node-fetch')
const fs = require('fs')

const { App } = require("@octokit/app")
const { Octokit } = require("@octokit/rest")
const { request } = require("@octokit/request")
const { paginateRest } = require("@octokit/plugin-paginate-rest")

const GithubRepository = require('./db/GithubRepository')
const Action = require('./db/Action')

Octokit.plugin(paginateRest)

const {
	GITHUB_APP_ID,
	GITHUB_APP_KEY_LOCATION,
	
    GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,

    GITHUB_OAUTH_CLIENT_ID,
	GITHUB_OAUTH_CLIENT_SECRET,

	PUBLIC_ROUTE_ROOT_PROTOCOL,
	PUBLIC_ROUTE_ROOT_PORT,
	PUBLIC_ROUTE_ROOT,
} = process.env

const PRIVATE_KEY = fs.readFileSync(GITHUB_APP_KEY_LOCATION, 'utf-8')

const githubGet = (url, token) => fetch(url, {
	method: 'get',
	headers: {
		Authorization: `token ${token}`,
		'Accept': 'application/json',
	},
}).then(r => r.json())

const githubCodeToAuth = (code, oauth) => fetch('https://github.com/login/oauth/access_token', {
	method: 'post',
	body: JSON.stringify({
		client_id: oauth ? GITHUB_OAUTH_CLIENT_ID : GITHUB_CLIENT_ID,
		client_secret: oauth ? GITHUB_OAUTH_CLIENT_SECRET : GITHUB_CLIENT_SECRET,
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

const createEmptyRepo = async (token, { name, private }) => {
	const { data } = await request("POST /user/repos", {
		name,private, auto_init: true,
		headers: {
			authorization: `Bearer ${token}`,
		},
	})

	return data
}

const commitTreeToRepo = async (token, { owner, repo, tree, message }) => {
	const { data: refs } = await request('GET /repos/:owner/:repo/git/matching-refs/:ref', {
		owner, repo,
		headers: {
			authorization: `Bearer ${token}`,
		},
	})

	ref = refs[0].ref.split('refs/')[1]

	const { data : { sha: treeSha } } = await request("POST /repos/:owner/:repo/git/trees", {
		tree,
		owner, repo,
		headers: {
			authorization: `Bearer ${token}`,
		},
	})

	const { data: { sha: commitSha } } = await request("POST /repos/:owner/:repo/git/commits", {
		owner, repo, tree: treeSha,
		message,
		headers: {
			authorization: `Bearer ${token}`,
		},
	})

	const { data } = await request("PATCH /repos/:owner/:repo/git/refs/:ref", { 
		owner, repo, ref, sha: commitSha, force:true,
		headers: {
			authorization: `Bearer ${token}`,
		},
	})

	return data
}

const getPublicKeys = async (token, username) => {
	const { data } = await request('GET /users/:username/keys', {
		username,
		headers: {
			authorization: `Bearer ${token}`,
		},
	})
	return data
}

const getParentAction = async (actionId) => {
	let action = await Action.query().findById(actionId)
	if (action.parentId) {
		action = await Action.query().findById(action.parentId)
	}
	return action
}

const feedbackDeploymentStatus = async (actionId) => {
	console.log('syncing ', actionId,' action to vcs')
	const parentAction = await getParentAction(actionId)
	const { repoName, owner, branch } = parentAction
	const { title } = await Action.query().findById(actionId)
	
	const repo = await GithubRepository.query().where('full_name', [owner, repoName].join('/')).first()
	if (!repo) {
		throw new Error('repo not found')
	}

	const { installationId } = repo
	const token = await getInstallationToken(installationId)

	let deploymentId = parentAction.vcsId
	if (!deploymentId) {
		console.log('no deploymentId')
		const { data } = await request('POST /repos/{owner}/{repo}/deployments', {
			owner,
			repo: repoName,
			ref: branch,

			environment: `Ultima - ${branch}`,
			production_environment: branch === 'master' || branch === 'main',

			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/vnd.github.ant-man-preview+json',
			},
		})

		console.log('created deployment', data)

		await Action.query().update({
			vcsId: data.id,
		}).where('id', actionId)

		deploymentId = data.id
	}

	const state = parentAction.type === 'error' ? 'error' : (parentAction.completedAt ? 'success' : 'in_progress') /* error, failure, inactive, in_progress, queued pending, or success */

	await request('POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses', {
		owner, repo: repoName,
		deployment_id: deploymentId,
		log_url: `${PUBLIC_ROUTE_ROOT_PROTOCOL}://build.${PUBLIC_ROUTE_ROOT}:${PUBLIC_ROUTE_ROOT_PORT}/repo/${owner}/${repoName}/deployments/${parentAction.id}`, 
		description: title,
		state,
		environment_url: `${PUBLIC_ROUTE_ROOT_PROTOCOL}://build.${PUBLIC_ROUTE_ROOT}:${PUBLIC_ROUTE_ROOT_PORT}/repo/${owner}/${repoName}/${branch}`, 
		environment: branch,
		headers: {
			'content-type': 'application/vnd.github.ant-man-preview+json',
			authorization: `Bearer ${token}`,
		}
	})
}

const removeInstallation = async installationId => {
	await GithubRepository.query().where({ installationId }).delete() 
}

const addInstallation = async installationId => {
	
}

module.exports = {
    githubGet,
	githubCodeToAuth,
	listRepos,
	getUltimaYml,
	setUltimaYml,
	getInstallationToken,
	createEmptyRepo,
	commitTreeToRepo,
	getPublicKeys,
	feedbackDeploymentStatus,
	removeInstallation,
	addInstallation,
}