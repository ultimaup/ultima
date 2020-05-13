const fse = require('fs-extra')
const path = require('path')
const spawn = require('@expo/spawn-async')

const {
	yarn_config_registry,
	npm_config_registry,
} = process.env

const getFileHash = async absPath => {
	const { stdout } = await spawn(`sha1sum`, [absPath])
	return stdout.split('/n')[0].split(' ')[0]
}

const restoreCache = async (cacheType, hash) => {
	console.log(`restoring ${cacheType} cache for hash ${hash}`)

	// TODO: actually do this
}

let ranBefore = false

const installDeps = async (wkdir, force, msgCb) => {
	if (!force && !ranBefore) {
		return
	}
	ranBefore = true
	console.log('installing dependencies')

	const useYarn = await fse.pathExists(path.resolve(wkdir, 'yarn.lock'))

	if (useYarn) {
		console.log('found yarn.lock so using yarn')
		const lockfileHash = await getFileHash(path.resolve(wkdir, 'yarn.lock'))
		await restoreCache('yarn', lockfileHash)

		await spawn('sed', [`s/=https://registry.yarnpkg.com/=${yarn_config_registry}/=g`, path.resolve(wkdir, 'yarn.lock')])
		await spawn('sed', [`s/=https://registry.npmjs.org/=${npm_config_registry}/=g`, path.resolve(wkdir, 'yarn.lock')])

		const p = spawn('yarn', ['install', '--frozen-lockfile' ,'--non-interactive'], { cwd: wkdir, ignoreStdio: true })

		p.child.stdout.on('data', msgCb)
		p.child.stderr.on('data', msgCb)

		await p
		
		return
	} else {
		const lockfileLocation = path.resolve(wkdir, 'package-lock.json')
		if (await fse.pathExists(lockfileLocation)) {
			console.log('found package-lock.json so using npm ci')
			await spawn('sed', [`s/=https://registry.npmjs.org/=${npm_config_registry}/=g`, path.resolve(wkdir, 'package-lock.lock')])
			const lockfileHash = await getFileHash(lockfileLocation)
			await restoreCache('npm', lockfileHash)
			const p = spawn('npm',['ci'], { cwd: wkdir, ignoreStdio: true })
			
			p.child.stdout.on('data', msgCb)
			p.child.stderr.on('data', msgCb)
			
			await p
			
			return
		} else {
			console.log('using npm install')
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
	shouldRunInstallDeps,
}