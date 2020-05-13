const fse = require('fs-extra')
const path = require('path')
const spawn = require('@expo/spawn-async')

const {
	npm_config_registry,
	yarn_config_registry,
} = process.env

const installDeps = async (wkdir) => {
	console.log('installing dependencies')

	const useYarn = await fse.pathExists(path.resolve(wkdir, 'yarn.lock'))

	if (useYarn) {
		console.log('using yarn')
		
		await spawn('sed', ['-i', `s https://registry.yarnpkg.com/ ${yarn_config_registry} g`, path.resolve(wkdir, 'yarn.lock')])
		await spawn('sed', ['-i', `s https://registry.npmjs.org/ ${npm_config_registry} g`, path.resolve(wkdir, 'yarn.lock')])
		await spawn('yarn', ['install', '--frozen-lockfile' ,'--non-interactive'], { cwd: wkdir, stdio: 'inherit' })

		return
	} else {
		const lockfileLocation = path.resolve(wkdir, 'package-lock.json')
		if (await fse.pathExists(lockfileLocation)) {
			console.log('using npm ci')
			await spawn('sed', ['-i', `s https://registry.npmjs.org/ ${npm_config_registry} g`, path.resolve(wkdir, 'package-lock.lock')])

			await spawn('npm',['ci'], { cwd: wkdir, stdio: 'inherit' })

			return
		} else {
			console.log('using npm install')
			await spawn('npm', ['install'], { cwd: wkdir, stdio: 'inherit' })

			return
		}
	}
}

module.exports = installDeps