const AWS = require('aws-sdk')
const stream = require('stream')

const {
	BUILDER_BUCKET_ID,
	BUILDER_BUCKET_SECRET,
	S3_ENDPOINT,
} = process.env

const s3 = new AWS.S3({
	accessKeyId: BUILDER_BUCKET_ID,
	secretAccessKey: BUILDER_BUCKET_SECRET,
	endpoint: S3_ENDPOINT,
	s3ForcePathStyle: true,
	signatureVersion: 'v4',
})

/* 
	const { writeStream, promise } = uploadStream({ Key: 'yourfile.mp4' });
	stream.pipe(writeStream)
	promise.then(console.log)
*/
const uploadStream = ({ Bucket = BUILDER_BUCKET_ID, Key }) => {
	const pass = new stream.PassThrough()

	return {
		writeStream: pass,
		promise: s3.upload({ Bucket, Key, Body: pass }).promise().then(r => r.Location),
	}
}

const getStream = ({ Bucket = BUILDER_BUCKET_ID, Key }) => {
	const params = { Bucket, Key }
	console.log(Key)
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
}