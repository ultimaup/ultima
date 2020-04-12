const AWS = require('aws-sdk');
const got = require('got');
const stream = require('stream');

const {
		BUILDER_BUCKET_ID,
		BUILDER_BUCKET_SECRET,
		S3_ENDPOINT,
} = process.env;

const s3 = new AWS.S3({
		accessKeyId: BUILDER_BUCKET_ID,
		secretAccessKey: BUILDER_BUCKET_SECRET,
		endpoint: S3_ENDPOINT,
		s3ForcePathStyle: true,
		signatureVersion: 'v4',
});

const getStream = ({ Bucket, Key }) => {
	const params = { Bucket, Key }
	return s3.getObject(params).createReadStream()
}

module.exports = {
	getStream
}
