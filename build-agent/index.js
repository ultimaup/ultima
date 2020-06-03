const express = require('express')
const fse = require('fs-extra')
const path = require('path')
const tar = require('tar-fs')
const gunzip = require('gunzip-maybe')
const { createGzip } = require('zlib')
const stream = require('stream')
const YAML = require('yaml')

const util = require('util')
const spawn = require('@expo/spawn-async')

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

const doBuild = async (wkdir, cfg) => {
	if (cfg.build) {
		if (typeof cfg.build === 'string') {
			console.log('running `'+cfg.build+'`', 'in', wkdir)
			await spawn('sh', ['-c', cfg.build], { cwd: wkdir, stdio: 'inherit' })
		} else {
			for (let i = 0; i<cfg.build.length; i++) {
				console.log('running `'+cfg.build[i]+'`', 'in', wkdir)
				await spawn('sh', ['-c', cfg.build[i]], { cwd: wkdir, stdio: 'inherit' })
			}
		}
	} else {
		console.log('no build step found in .ultima.yml, skipping...')
	}
}

const doTest = async (wkdir, cfg) => {
	if (cfg.test) {
		if (typeof cfg.test === 'string') {
			console.log('running `'+cfg.test+'`', 'in', wkdir)
			await spawn('sh', ['-c', cfg.test], { cwd: wkdir, stdio: 'inherit' })
		} else {
			for (let i = 0; i<cfg.test.length; i++) {
				console.log('running `'+cfg.test[i]+'`', 'in', wkdir)
				await spawn('sh', ['-c', cfg.test[i]], { cwd: wkdir, stdio: 'inherit' })
			}
		}
	} else {
		console.log('no test step found in .ultima.yml, skipping...')
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

	const ultimaCfg = process.env.ULTIMA_RESOURCE_CONFIG

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

		const config = JSON.parse(ultimaCfg)

		if (!config) {
			console.log('no .ultima.yml found, assuming nodejs api app')
		}

		if (config && config) {
			wkdir = path.resolve(wkdir, config.directory || '')
		}

		try {
			await installDeps(wkdir, config)
			await doBuild(wkdir, config)
			await doTest(wkdir, config)
		} catch (e) {
			console.error(e)
		}

		if (config.removePaths) {
			await Promise.all(config.removePaths.map(async (p) => {
				console.log('removing', p)
				await exec(`rm -rf ${path.resolve(wkdir, p)}`)
				console.log('removed', p)
			}))
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