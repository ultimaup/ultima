const fse = require('fs-extra')
const path = require('path')
const spawn = require('@expo/spawn-async')
const stream = require('stream')
const { promisify } = require('util')
const tar = require('tar-fs')
const { createGzip } = require('zlib')

const pipeline = promisify(stream.pipeline)

const { extractStreamToDir } = require('./utils')
const buildCache = require('./buildCache')

const getFileHash = async absPath => {
	const { stdout } = await spawn(`sha1sum`, [absPath])
	return stdout.split('/n')[0].split(' ')[0]
}

const downloadDir = (wkdir, dir) => {
	const tarStream = tar.pack(path.resolve(wkdir, dir))
	const gzipStream = createGzip()
	return tarStream.pipe(gzipStream)
}

const restoreCache = async (cacheType, hash, wkdir) => {
	console.log(`restoring ${cacheType} cache for hash ${hash}`)
	const result = await buildCache.head(hash)
	if (result.statusCode === 200) {
		console.log('cache found')
		await extractStreamToDir(buildCache.getStream(hash), path.resolve(wkdir, 'node_modules'))
		console.log(`cache restored`)
		return true
	} else {
		console.log(`no cache found`, result.statusCode)
		return false
	}
}

const populateCache = async (cacheType, hash, wkdir, msgCb) => {
	msgCb(`populating ${cacheType} cache for hash ${hash}`)
	const result = await buildCache.head(hash)
	msgCb('cache result:', result.statusCode)
	if (result.statusCode === 404) {
		const tarStream = tar.pack(path.resolve(wkdir, 'node_modules'))
		const gzipStream = createGzip()

		await pipeline(
			tarStream,
			gzipStream,
			buildCache.postStream(hash),
		)

		return `cache populated`
	} else {
		return false
	}
}

const decidePackageManager = async (wkdir) => {
	const useYarn = await fse.pathExists(path.resolve(wkdir, 'yarn.lock'))
	if (useYarn) {
		const lockfileLocation = path.resolve(wkdir, 'yarn.lock')
		const lockfileHash = await getFileHash(lockfileLocation)

		return {
			useYarn,
			lockfileLocation,
			lockfileHash,
		}
	} else {
		const lockfileLocation = path.resolve(wkdir, 'package-lock.json')

		if (await fse.pathExists(lockfileLocation)) {
			const lockfileHash = await getFileHash(lockfileLocation)

			return {
				useYarn,
				lockfileHash,
				lockfileLocation,
			}
		} else {
			return {
				useYarn,
				lockfileLocation,
			}
		}
	}
}

let ranBefore = false

const installDeps = async (wkdir, force, msgCb) => {
	if (!force && !ranBefore) {
		return
	}
	ranBefore = true
	console.log('installing dependencies')

	const { useYarn, lockfileHash } = await decidePackageManager(wkdir)

	if (useYarn) {
		msgCb('found yarn.lock so using yarn')
		const restoredCache = await restoreCache('yarn', lockfileHash, wkdir)

		const p = spawn('yarn', ['install', '--frozen-lockfile' ,'--non-interactive'], { cwd: wkdir, ignoreStdio: true })

		p.child.stdout.on('data', msgCb)
		p.child.stderr.on('data', msgCb)

		await p

		if (!restoredCache) {
			return {
				promise: populateCache('yarn', lockfileHash, wkdir, msgCb).catch(msgCb)
			}
		}
		
		return
	} else {
		if (lockfileHash) {
			msgCb('found package-lock.json so using npm ci')
			const restoredCache = await restoreCache('npm', lockfileHash, wkdir)
			const p = spawn('npm',['ci'], { cwd: wkdir, ignoreStdio: true })

			p.child.stdout.on('data', msgCb)
			p.child.stderr.on('data', msgCb)

			await p

			if (!restoredCache) {
				populateCache('npm', lockfileHash, wkdir, msgCb).catch(msgCb)
			}

			return
		} else {
			msgCb('using npm install')
			const p = spawn('npm', ['install'], { cwd: wkdir, ignoreStdio: true })
			
			p.child.stdout.on('data', msgCb)
			p.child.stderr.on('data', msgCb)
			
			await p
			
			return
		}
	}
}

const shouldRunInstallDeps = async (filePath, wkdir) => {
	return filePath.endsWith('yarn.lock') || filePath.endsWith('package-lock.json') || (
		filePath.endsWith('package.json') && 
		!(await fse.pathExists(path.resolve(wkdir, 'yarn.lock'))) &&  
		!(await fse.pathExists(path.resolve(wkdir, 'package-lock.json')))
	)
}

module.exports = {
	installDeps,
	downloadDir,
	shouldRunInstallDeps,
}