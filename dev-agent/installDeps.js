const path = require('path')
const spawn = require('@expo/spawn-async')
const tar = require('tar-fs')
const { createGzip } = require('zlib')
const minimatch = require('minimatch')

const downloadDir = (wkdir, dir) => {
	const tarStream = tar.pack(path.resolve(wkdir, dir))
	const gzipStream = createGzip()
	return tarStream.pipe(gzipStream)
}

const {
	yarn_config_registry,
	npm_config_registry,
} = process.env

const safespawn = (...args) => spawn(...args).catch(() => {})

const installDeps = async (wkdir, cfg, msgCb) => {
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

	const p = spawn('bash', ['-c', cfg.install.command], { cwd: wkdir, ignoreStdio: true })

	p.child.stdout.on('data', msgCb)
	p.child.stderr.on('data', msgCb)
}

const shouldRunInstallDeps = async (filePath, cfg) => {
	if (cfg.install && cfg.install.watch) {
		const positive = cfg.install.watch.filter(glob => !glob.startsWith('!'))
		const negators = [...cfg.install.watch.filter(glob => glob.startsWith('!')), ...cfg.ignore]

		return (
			positive.some(glob => minimatch(filePath, glob)) && 
			!negators.some(glob => minimatch(filePath, glob))
		)
	}

	return false
}

module.exports = {
	installDeps,
	downloadDir,
	shouldRunInstallDeps,
}