const fse = require('fs-extra')
const path = require('path')
const spawn = require('@expo/spawn-async')
const stream = require('stream')
const { promisify } = require('util')
const tar = require('tar-fs')
const { createGzip } = require('zlib')

const pipeline = promisify(stream.pipeline)

const buildCache = require('./buildCache')
const { extractStreamToDir } = require('./utils')

const getFileHash = async absPath => {
	const { stdout } = await spawn(`sha1sum`, [absPath])
	return stdout.split('/n')[0].split(' ')[0]
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

const populateCache = async (cacheType, hash, wkdir) => {
	console.log(`populating ${cacheType} cache for hash ${hash}`)
	try {
		const result = await buildCache.head(hash)
		console.log('cache result:', result.statusCode)
		if (result.statusCode === 404) {
			const tarStream = tar.pack(path.resolve(wkdir, 'node_modules'))
			const gzipStream = createGzip()

			await pipeline(
				tarStream,
				gzipStream,
				buildCache.postStream(hash),
			)

			console.log(`cache populated`)
			return true
		} else {
			console.log('cache result', result.statusCode)
			return false
		}
	} catch (e) {
		console.error(e)
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

const installDeps = async (wkdir) => {
	console.log('installing dependencies')

	const { useYarn, lockfileHash } = await decidePackageManager(wkdir)

	if (useYarn) {
		console.log('using yarn')

		const restoredCache = await restoreCache('yarn', lockfileHash, wkdir)
		await spawn('yarn', ['install', '--frozen-lockfile' ,'--non-interactive'], { cwd: wkdir, stdio: 'inherit' })

		return {
			promise: !restoredCache && populateCache('yarn', lockfileHash, wkdir),
		}
	} else {
		if (lockfileHash) {
			console.log('using npm ci')
			const restoredCache = await restoreCache('npm', lockfileHash, wkdir)
			await spawn('npm',['ci'], { cwd: wkdir, stdio: 'inherit' })

			return {
				promise: !restoredCache && populateCache('npm', lockfileHash, wkdir),
			}
		} else {
			console.log('using npm install')
			await spawn('npm', ['install'], { cwd: wkdir, stdio: 'inherit' })

			return {}
		}
	}
}

module.exports = installDeps