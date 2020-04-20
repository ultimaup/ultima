const fetch = require('node-fetch')

const {
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
} = process.env

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

module.exports = {
    githubGet,
    githubCodeToAuth,
}