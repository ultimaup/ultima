const express = require('express')
const fse = require('fs-extra')
const tar = require('tar-fs')
const gunzip = require('gunzip-maybe')
const { createGzip } = require('zlib')

const util = require('util')
const exec = util.promisify(require('child_process').exec)

const streamHash = require('./hash')

const execCommand = (...cmd) => exec(...cmd).then(({ stdout, stderr }) => {
	return stdout.split('\n').filter(Boolean).map(line => JSON.parse(line))
}).catch(({ stdout }) => {
	console.error(stdout)
}).catch(e => {
	console.error(e)
	throw e
})

const restoreCache = async (cacheType, hash) => {
	console.log(`restoring ${cacheType} cache for hash ${hash}`)

	// TODO: actually do this
}

const installDeps = async (wkdir) => {
	console.log('installing deps')

	const useYarn = await fse.exists(path.resolve(wkdir, 'yarn.lock'))

	if (useYarn) {
		console.log('using yarn')
		const lockfileStream = fse.createReadStream(path.resolve(wkdir, 'yarn.lock'))
		const lockfileHash = await streamHash(lockfileStream)
		await restoreCache('yarn', lockfileHash)
		
		const lines = await execCommand('yarn install --frozen-lockfile --non-interactive --json', { cwd: wkdir })

		return lines
	} else {
		console.log('using npm')	
		
		if (await fse.exists(lockfileLocation)) {
			const lockfileStream = fse.createReadStream(lockfileLocation)
			const lockfileHash = await streamHash(lockfileStream)
			await restoreCache('yarn', lockfileHash)
		}

		const lines = await execCommand('npm ci --json', { cwd: wkdir })

		return lines
	}
}

const extractStreamToDir = async (stream, dir) => {

	await fse.ensureDir(dir)
	
	const extract = tar.extract(dir)

	const promise = new Promise((resolve) => {
		extract.on('finish', resolve)
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
		console.log('no build step found, skipping...')
	}
}

const app = express()

const { 
	PORT,
} = process.env

app.get('/health', (req, res) => {
	res.json(true)
})

app.post('/:endpointId', async (req, res) => {
	const { 'x-parent-invocation-id': invocationId } = req.headers
	console.log('invoked from', invocationId)
	const wkdir = `/tmp/${invocationId}`

	req.on('end', () => {
		console.log(invocationId, 'bundle upload complete')
	})

	await extractStreamToDir(req, wkdir)

	let installOutput
	let buildOutput
	let testOutput

	try {
		installOutput = await installDeps(wkdir)
		buildOutput = await doBuild(wkdir)
		testOutput = await doTest(wkdir)
	} catch (e) {
		console.error(e)
	}

	console.log([
		installOutput,
		buildOutput,
		testOutput,
	])

	const tarStream = tar.pack(wkdir)
	const gzipStream = createGzip()

	// TODO: return as gzip
	tarStream.pipe(gzipStream).pipe(res)
})

app.listen(PORT)