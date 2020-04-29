const fse = require('fs-extra')
const path = require('path')
const spawn = require('@expo/spawn-async')

const getFileHash = async absPath => {
	const { stdout } = await spawn(`sha1sum`, [absPath])
	return stdout.split('/n')[0].split(' ')[0]
}

const restoreCache = async (cacheType, hash) => {
	console.log(`restoring ${cacheType} cache for hash ${hash}`)

	// TODO: actually do this
}

let ranBefore = false

const installDeps = async (wkdir, force) => {
	if (!force && !ranBefore) {
		return
	}
	ranBefore = true
	console.log('installing deps')

	const useYarn = await fse.pathExists(path.resolve(wkdir, 'yarn.lock'))

	if (useYarn) {
		console.log('using yarn')
		const lockfileHash = await getFileHash(path.resolve(wkdir, 'yarn.lock'))
		await restoreCache('yarn', lockfileHash)
		
		await spawn('yarn', ['install', '--frozen-lockfile' ,'--non-interactive'], { cwd: wkdir, stdio: 'inherit' })

		return
	} else {
		const lockfileLocation = path.resolve(wkdir, 'package-lock.json')
		if (await fse.pathExists(lockfileLocation)) {
			console.log('using npm ci')
			const lockfileHash = await getFileHash(lockfileLocation)
			await restoreCache('npm', lockfileHash)
			await spawn('npm',['ci'], { cwd: wkdir, stdio: 'inherit' })

			return
		} else {
			console.log('using npm install')
			await spawn('npm', ['install'], { cwd: wkdir, stdio: 'inherit' })

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
	shouldRunInstallDeps,
}