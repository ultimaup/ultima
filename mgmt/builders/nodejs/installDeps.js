const fse = require('fs-extra')
const path = require('path')
const util = require('util')

const exec = util.promisify(require('child_process').exec)

const getFileHash = async absPath => {
	const { stdout } = await exec(`sha1sum ${absPath}`)
	return stdout.split('/n')[0].split(' ')[0]
}

const restoreCache = async (cacheType, hash) => {
	console.log(`restoring ${cacheType} cache for hash ${hash}`)

	// TODO: actually do this
}

const installDeps = async (wkdir) => {
	console.log('installing dependencies')

	const useYarn = await fse.pathExists(path.resolve(wkdir, 'yarn.lock'))

	if (useYarn) {
		console.log('using yarn')
		const lockfileHash = await getFileHash(path.resolve(wkdir, 'yarn.lock'))
		await restoreCache('yarn', lockfileHash)
		await exec('yarn install --frozen-lockfile --non-interactive', { cwd: wkdir, stdio: 'inherit' })

		return
	} else {
		const lockfileLocation = path.resolve(wkdir, 'package-lock.json')
		if (await fse.pathExists(lockfileLocation)) {
			console.log('using npm ci')
			const lockfileHash = await getFileHash(lockfileLocation)
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