const express = require('express');
const s3 = require('./s3');
const tar = require('tar-fs');
const zlib = require('zlib');
const fs = require('fs');
const stream = require('stream');
const path = require('path');
const { promisify } = require('util');

const service = require('./services');

const app = express();
const pipeline = promisify(stream.pipeline);

const { PORT=4480 } = process.env;

const folder = path.resolve('../..')

app.post('/:name', async (req, res) => {
	console.log(`Received request for ${req.params.name}`);
	if(fs.existsSync(`${folder}/${req.params.name}`))
	{
		console.log('Already seems to be existing on the FS');
		service.InstallService(`${folder}/${req.params.name}`);
		res.sendStatus(200);
		return;
	}
	const extract = tar.extract(`${folder}/${req.params.name}`);
	const decompress = zlib.createGunzip();
	const tarStream = s3.getStream({Bucket: 'build-artifacts', Key: req.params.name });

	tarStream.on('error', err => {
		console.error(`S3 failed with ${err.message} ${err.code}`);
		res.sendStatus(500);
	});

	tarStream.on('finish', () => {
		console.log(`Downloaded ${req.params.name}`);
	});

	extract.on('error', err => {
		console.error(err);
		res.sendStatus(500);
	});

	
	try {
		await pipeline(
			tarStream,
			decompress,
			extract,
		)
		console.log('deployed build to folder');
		await service.InstallService(`${folder}/${req.params.name}`);
		res.sendStatus(201);
	} catch (e) {
		console.error(e);
		res.sendStatus(500);
	}
})

app.listen(PORT, () => console.log(`Listening on ${PORT}`));