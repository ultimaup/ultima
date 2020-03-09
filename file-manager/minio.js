const express = require('express')
const crypto = require('crypto')
const fetch = require('node-fetch')
const argon2 = require('argon2')
const { signV4 } = require('minio/dist/main/signing')
const { makeDateLong } = require('minio/dist/main/helpers')

const {
	PORT,
	MINIO_ACCESS_KEY,
	MINIO_SECRET_KEY,
	MINIO_ENDPOINT,
	MINIO_PORT,
} = process.env

const signRequest = (opts, payload = '', { accessKey, secretKey }) => {
	let reqOptions = {
		...opts,
	}

	const date = new Date()
	const sha256sum = crypto.createHash('sha256').update(payload).digest('hex')

	reqOptions.headers['x-amz-date'] = makeDateLong(date)
	reqOptions.headers['x-amz-content-sha256'] = sha256sum

	const authorization = signV4(reqOptions, accessKey, secretKey, region, date)
	reqOptions.headers.authorization = authorization

	return reqOptions
}

const IV_LENGTH = 16

function decrypt(text, key) {
	let textParts = text.split(':');
	let iv = Buffer.from(textParts.shift(), 'hex');
	let encryptedText = Buffer.from(textParts.join(':'), 'hex');
	let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
	let decrypted = decipher.update(encryptedText);
   
	decrypted = Buffer.concat([decrypted, decipher.final()]);
   
	return decrypted.toString();
}

const minioFetch = (endpoint, payload, opts) => {
	const signedOpts = signRequest({
		...opts,
		path: endpoint,
		headers: {},
	}, payload, { accessKey: MINIO_ACCESS_KEY, secretKey: MINIO_SECRET_KEY })

	return fetch(`http://${MINIO_ENDPOINT}:${MINIO_PORT}${endpoint}`, signedOpts)
}

const region = 'us-east-1'
const app = express()

const minioGet = endpoint => minioFetch(endpoint, '', {
	method: 'get',
	headers: {
		'user-agent': 'node-fetch/1.0',
	},
})

const minioPost = (endpoint, body) => minioFetch(endpoint, JSON.stringify(body), {
	method: 'post',
	headers: {
		'user-agent': 'node-fetch/1.0',
	},
	body: JSON.stringify(body),
})

const listUsers = () => minioGet('/minio/admin/v2/list-users').then(r => r.text()).then(async cipherText => {
	const key = await argon2.hash(MINIO_SECRET_KEY)
	return decrypt(cipherText, key)
})

// listUsers().then(console.log).catch(console.error)

app.listen({ port: PORT }, () => {
    console.log(`🚀  Server ready at ${PORT}`)
})