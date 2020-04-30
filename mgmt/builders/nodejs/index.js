const express = require('express')
const fse = require('fs-extra')
const path = require('path')
const tar = require('tar-fs')
const gunzip = require('gunzip-maybe')
const { createGzip } = require('zlib')
const stream = require('stream')
const yaml = require('js-yaml')

const util = require('util')
const exec = util.promisify(require('child_process').exec)
const installDeps = require('./installDeps')

const pipeline = util.promisify(stream.pipeline)

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

const doBuild = async (wkdir) => {
	const packageInfo = await fse.readJSON(path.resolve(wkdir, 'package.json'))

	if (packageInfo.scripts.build) {
		console.log('running `npm run build`')
		return await exec('npm run build', { cwd: wkdir, stdio: 'inherit' })
	} else {
		console.log('no build step found in package.json, skipping...')
	}
}

const doTest = async (wkdir) => {
	const packageInfo = await fse.readJSON(path.resolve(wkdir, 'package.json'))

	if (packageInfo.scripts.test) {
		console.log('running `npm run test`')
		return await exec('npm run test', { cwd: wkdir, stdio: 'inherit' })
	} else {
		console.log('no test step found in package.json, skipping...')
	}
}

const app = express()

const {
	PORT,
} = process.env

app.get('/health', (req, res) => {
	res.json(true)
})

app.post('/', async (req, res) => {
	const { 'x-parent-invocation-id': invocationId } = req.headers
	console.log('invoked from deployment', invocationId)

	try {
		let wkdir = `/tmp/${invocationId}`

		req.on('end', () => {
			console.log('bundle upload complete')
		})

		try {
			await extractStreamToDir(req, wkdir)
		} catch (e) {
			console.error(e)
			return res.status(500).json(e)
		}

		console.log('bundle extracted')

		const files = await fse.readdir(wkdir)
		
		// if wkdir only has one directory, cd into it
		if (files.length === 1) {
			wkdir = path.resolve(wkdir, files[0])
		}

		const filesBefore = await fse.readdir(wkdir)
		console.log('bundle contains files: ', filesBefore)

		let config
		if (await fse.pathExists(path.resolve(wkdir, '.ultima.yml'))) {
			const configYml = await fse.readFile(path.resolve(wkdir, '.ultima.yml'), 'utf-8')
			config = await yaml.safeLoad(configYml)
		}

		let removeNodeModules = false
		if (!config) {
			console.log('no .ultima.yml found, assuming nodejs api app')
		} else {
			if (config.web) {
				console.log('static website found')
			}
			if (config.hasAPI === false) {
				console.log('not an api, will remove node_modules folder from resulting output')
				removeNodeModules = true
			}
		}

		try {
			if (await fse.pathExists(path.resolve(wkdir, 'package.json'))) {
				await installDeps(wkdir)
				await doBuild(wkdir)
				await doTest(wkdir)
			}
		} catch (e) {
			console.error(e)
		}

		if (removeNodeModules) {
			console.log('removing node_modules folder')
			await fse.rmdir(path.resolve(wkdir, 'node_modules'))
		}

		const filesAfter = await fse.readdir(wkdir)
		console.log('built output contains files:', filesAfter)

		const tarStream = tar.pack(wkdir)
		const gzipStream = createGzip()

		await pipeline(
			tarStream,
			gzipStream,
			res
		)
	} catch (e) {
		console.error(e)
	}
	
	process.exit()
})

console.log('nodejs builder started')

app.listen(PORT)