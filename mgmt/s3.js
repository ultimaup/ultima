const AWS = require('aws-sdk')
const got = require('got')
const stream = require('stream')

const {
	BUILDER_BUCKET_ID,
	BUILDER_BUCKET_SECRET,
	S3_ENDPOINT,

	FILEMANAGER_ENDPOINT,
} = process.env

const ensureFileUserExists = (userId, secret) => (
	// ensure our creds exist
	got.post(`${FILEMANAGER_ENDPOINT}/${userId}`, {
		body: JSON.stringify({ secret }),
		headers: {
			'content-type': 'application/json',
		}
	}).json().then(r => r)
)


const ensureWebBucket = (bucketName) => (
	got.post(`${FILEMANAGER_ENDPOINT}/web-bucket`, {
		body: JSON.stringify({ bucketName, ownerId: BUILDER_BUCKET_ID }),
		headers: {
			'content-type': 'application/json',
		}
	}).json().then(r => r)
)

const ensureFileBucket = (bucketName, ownerId) => (
	got.post(`${FILEMANAGER_ENDPOINT}/file-bucket`, {
		body: JSON.stringify({ bucketName, ownerId }),
		headers: {
			'content-type': 'application/json',
		}
	}).json().then(r => r)
)

const s3 = new AWS.S3({
	accessKeyId: BUILDER_BUCKET_ID,
	secretAccessKey: BUILDER_BUCKET_SECRET,
	endpoint: S3_ENDPOINT,
	s3ForcePathStyle: true,
	signatureVersion: 'v4',
})

ensureFileUserExists(BUILDER_BUCKET_ID, BUILDER_BUCKET_SECRET)
	.then(console.log)
	.catch(console.error)

/* 
	const { writeStream, promise } = uploadStream({ Key: 'yourfile.mp4' });
	stream.pipe(writeStream)
	promise.then(console.log)
*/
const uploadStream = ({ Bucket = BUILDER_BUCKET_ID, Key, ...rest }) => {
	const pass = new stream.PassThrough()

	return {
		writeStream: pass,
		promise: s3.upload({ Bucket, Key, Body: pass, ...rest }).promise().then(r => r.Location),
	}
}

const getStream = ({ Bucket = BUILDER_BUCKET_ID, Key }) => {
	const params = { Bucket, Key }
	return s3.getObject(params).createReadStream()
}

const headObject = ({ Bucket = BUILDER_BUCKET_ID, Key }) => {
	const params = { Bucket, Key }
	return s3.headObject(params).promise().catch(e => {
		if (e.code === 'NotFound') {
			return false
		}

		throw e
	})
}

module.exports = {
	uploadStream,
	getStream,
	headObject,
	ensureWebBucket,
	ensureFileUserExists,
	ensureFileBucket,
}