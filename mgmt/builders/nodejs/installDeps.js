const fse = require('fs-extra')
const path = require('path')
const util = require('util')

const exec = util.promisify(require('child_process').exec)

const streamHash = require('./hash')

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
		
		const lines = await exec('yarn install --frozen-lockfile --non-interactive --json', { cwd: wkdir })

		return lines
	} else {
		const lockfileLocation = path.resolve(wkdir, 'package-lock.json')
		if (await fse.pathExists(lockfileLocation)) {
			console.log('using npm ci')
			const lockfileStream = fse.createReadStream(lockfileLocation)
			const lockfileHash = await streamHash(lockfileStream)
			await restoreCache('npm', lockfileHash)
			const lines = await exec('npm ci --json', { cwd: wkdir })

			return lines
		} else {
			console.log('using npm install')
			const lines = await exec('npm install --json', { cwd: wkdir })

			return lines
		}
	}
}

module.exports = installDeps