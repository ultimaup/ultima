const fse = require('fs-extra')
const tar = require('tar-fs')
const gunzip = require('gunzip-maybe')

const extractStreamToDir = async (stream, dir) => {

	await fse.ensureDir(dir)
	
	const extract = tar.extract(dir)

	const promise = new Promise((resolve, reject) => {
		extract.on('finish', resolve)
		extract.on('error', reject)
	})

	stream.pipe(gunzip()).pipe(extract)

	return promise
}

module.exports = {
    extractStreamToDir,
}