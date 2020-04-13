const express = require('express')
const fse = require('fs-extra')
const path = require('path')
const tar = require('tar-fs')
const gunzip = require('gunzip-maybe')
const { createGzip } = require('zlib')
const stream = require('stream')

const util = require('util')
const exec = util.promisify(require('child_process').exec)

const streamHash = require('./hash')

const execCommand = (...cmd) => exec(...cmd)
	// .then(({ stdout, stderr }) => {
	// 	return stdout.split('\n').filter(Boolean).map(line => JSON.parse(line))
	// }).catch(({ stdout }) => {
	// 	console.error(stdout)
	// }).catch(e => {
	// 	console.error(e)
	// 	throw e
	// })

const pipeline = util.promisify(stream.pipeline)

const restoreCache = async (cacheType, hash) => {
	console.log(`restoring ${cacheType} cache for hash ${hash}`)

	// TODO: actually do this
}

const installDeps = async (wkdir) => {
	console.log('installing deps')

	const useYarn = await fse.pathExists(path.resolve(wkdir, 'yarn.lock'))

	if (useYarn) {
		console.log('using yarn')
		const lockfileStream = fse.createReadStream(path.resolve(wkdir, 'yarn.lock'))
		const lockfileHash = await streamHash(lockfileStream)
		await restoreCache('yarn', lockfileHash)
		
		const lines = await execCommand('yarn install --frozen-lockfile --non-interactive --json', { cwd: wkdir })

		return lines
	} else {	
		const lockfileLocation = path.resolve(wkdir, 'package-lock.json')
		if (await fse.pathExists(lockfileLocation)) {
			console.log('using npm ci')
			const lockfileStream = fse.createReadStream(lockfileLocation)
			const lockfileHash = await streamHash(lockfileStream)
			await restoreCache('npm', lockfileHash)
			const lines = await execCommand('npm ci --json', { cwd: wkdir })

			return lines
		} else {
			console.log('using npm install')
			const lines = await execCommand('npm install --json', { cwd: wkdir })

			return lines
		}
	}
}

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
		return await exec('npm run build', { cwd: wkdir })
	} else {
		console.log('no build step found, skipping...')
	}
}

const doTest = async (wkdir) => {
	const packageInfo = await fse.readJSON(path.resolve(wkdir, 'package.json'))

	if (packageInfo.scripts.test) {
		return await exec('npm run test', { cwd: wkdir })
	} else {
		console.log('no test step found, skipping...')
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
	console.log('invoked from', invocationId)
	let wkdir = `/tmp/${invocationId}`

	req.on('end', () => {
		console.log(invocationId, 'bundle upload complete')
	})

	try {
		await extractStreamToDir(req, wkdir)
	} catch (e) {
		console.error(e)
		return res.status(500).json(e)
	}

	console.log(invocationId, 'extracted')

	const files = await fse.readdir(wkdir)
	
	// if wkdir only has one directory, cd into it
	if (files.length === 1) {
		wkdir = path.resolve(wkdir, files[0])
	}

	const filesBefore = await fse.readdir(wkdir)
	console.log(filesBefore)
	
	let installOutput
	let buildOutput
	let testOutput

	try {
		if (await fse.pathExists(path.resolve(wkdir, 'package.json'))) {
			installOutput = await installDeps(wkdir)
			buildOutput = await doBuild(wkdir)
			testOutput = await doTest(wkdir)
		}
	} catch (e) {
		console.error(e)
	}

	console.log([
		installOutput,
		buildOutput,
		testOutput,
	])

	const filesAfter = await fse.readdir(wkdir)
	console.log(filesAfter)

	const tarStream = tar.pack(wkdir)
	const gzipStream = createGzip()

	await pipeline(
		tarStream,
		gzipStream,
		res
	)
	
	process.exit()
})

console.log('nodejs builder started')

app.listen(PORT)