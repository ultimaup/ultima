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
	console.log('installing dependencies')

	const useYarn = await fse.pathExists(path.resolve(wkdir, 'yarn.lock'))

	if (useYarn) {
		console.log('using yarn')
		const lockfileStream = fse.createReadStream(path.resolve(wkdir, 'yarn.lock'))
		const lockfileHash = await streamHash(lockfileStream)
		await restoreCache('yarn', lockfileHash)
		await exec('yarn install --frozen-lockfile --non-interactive', { cwd: wkdir, stdio: 'inherit' })

		return
	} else {
		const lockfileLocation = path.resolve(wkdir, 'package-lock.json')
		if (await fse.pathExists(lockfileLocation)) {
			console.log('using npm ci')
			const lockfileStream = fse.createReadStream(lockfileLocation)
			const lockfileHash = await streamHash(lockfileStream)
			await restoreCache('npm', lockfileHash)
			await exec('npm ci', { cwd: wkdir, stdio: 'inherit' })

			return
		} else {
			console.log('using npm install')
			await exec('npm install', { cwd: wkdir, stdio: 'inherit' })

			return
		}
	}
}

module.exports = installDeps