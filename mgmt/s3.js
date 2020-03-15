const AWS = require('aws-sdk')
const fetch = require('node-fetch')
const stream = require('stream')

const {
	BUILDER_BUCKET_ID,
	BUILDER_BUCKET_SECRET,
	S3_ENDPOINT,

	FILEMANAGER_ENDPOINT,
} = process.env

const ensureFileUserExists = (userId, secret) => (
	// ensure our creds exist
	fetch(`${FILEMANAGER_ENDPOINT}/${userId}`, {
		method: 'post',
		body: JSON.stringify({ secret })
	}).then(r => r.json())
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
const uploadStream = ({ Bucket = BUILDER_BUCKET_ID, Key }) => {
	const pass = new stream.PassThrough()

	return {
		writeStream: pass,
		promise: s3.upload({ Bucket, Key, Body: pass }).promise(),
	}
}

const getStream = ({ Bucket = BUILDER_BUCKET_ID, Key }) => {
	const params = { Bucket, Key }
	return s3.getObject(params).createReadStream()
}

module.exports = {
	uploadStream,
	getStream,
}