const path = require('path')
const spawn = require('@expo/spawn-async')

const {
	npm_config_registry,
	yarn_config_registry,
} = process.env

const safespawn = (...args) => spawn(...args).catch(() => {})

const installDeps = async (wkdir, cfg) => {
	if (!cfg.install) {
		return
	}

	console.log('installing dependencies')

	await safespawn('sed', ['-i', `s //registry.npmjs.org/ ${npm_config_registry.split('http://').join('//').split('https://').join('//')} g`, path.resolve(wkdir, '.npmrc')])
	await safespawn('sed', ['-i', `s //registry.npmjs.org/ ${npm_config_registry.split('http://').join('//').split('https://').join('//')} g`, path.resolve(wkdir, '.yarnrc')])
	await safespawn('sed', ['-i', `s //registry.yarnpkg.com/ ${yarn_config_registry.split('http://').join('//').split('https://').join('//')} g`, path.resolve(wkdir, '.yarnrc')])
	await safespawn('sed', ['-i', `s https://registry.yarnpkg.com/ ${yarn_config_registry} g`, path.resolve(wkdir, 'yarn.lock')])
	await safespawn('sed', ['-i', `s https://registry.npmjs.org/ ${npm_config_registry} g`, path.resolve(wkdir, 'yarn.lock')])
	await safespawn('sed', ['-i', `s https://registry.npmjs.org/ ${npm_config_registry} g`, path.resolve(wkdir, 'package-lock.lock')])

	if (typeof cfg.install.command === 'string') {
		console.log('running `'+cfg.install.commad+'`', 'in', wkdir)
		await spawn('sh', ['-c', cfg.install.command], { cwd: wkdir, stdio: 'inherit' })
	} else {
		for (let i = 0; i<cfg.install.command.length; i++) {
			console.log('running `'+ cfg.install.command[i]+'`', 'in', wkdir)
			await spawn('sh', ['-c', cfg.install.command[i]], { cwd: wkdir, stdio: 'inherit' })
		}
	}
}

module.exports = installDeps