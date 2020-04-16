const fse = require('fs-extra')
const path = require('path')
const util = require('util')
const crypto = require('crypto')

const exec = util.promisify(require('child_process').exec)

const streamHash = (s, algorithm = 'sha1') => {
	return new Promise((resolve, reject) => {
		const shasum = crypto.createHash(algorithm)
		try {
			s.on('data', (data) => {
				shasum.update(data)
			})
			s.on('end', () => {
				const hash = shasum.digest('hex')
				return resolve(hash)
			})
		} catch (error) {
			return reject('calc fail')
		}
	})
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