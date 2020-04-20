const fs = require('fs-extra');
const path = require('path');
const systemctl = require('systemctl');
const rimraf = require('rimraf');
const {promisify} = require('util');

const rimrafAsync = promisify(rimraf);

const serviceNames = ['ultima-file-manager', 'ultima-endpoints', 'ultima-mgmt', 'ultima-router-mgmt', 'ultima-frontend'];

const staticFolder = path.resolve('../..');
const staticPathName = `${staticFolder}/build-latest`;
const InstallService = async (path) => {
	let isAlreadyThere = true;
	await fs.lstat(staticPathName, fs.constants.F_OK).catch(err => {if(err.code == 'ENOENT') isAlreadyThere=false;});
	if(isAlreadyThere)
		await removeService();
	await installService(path);

	await cleanupService(path);
}

const removeService = async () =>
{
	console.log('[REMOVAL] START');
	// stop services
	console.log('Stopping Services...');
	const serviceCallback = [];
	for(const service of serviceNames) {
		console.log(`\tStopping Service ${service}...`);
		serviceCallback.push(systemctl.stop(service));
		console.log(`\tStopped Service ${service}`);
	}
	await Promise.all(serviceCallback);
	console.log('Done');

	// remove symlink
	console.log('Removing Symlink...');
	await fs.unlink(staticPathName);
	console.log('Done');
	console.log('[REMOVAL] DONE');
}

const installService = async (folder) =>
{
	console.log('[INSTALL] START');
	// create symlink
	console.log('Creating Symlink...');
	await fs.symlink(path.resolve(folder), staticPathName);
	console.log('Done');

	// start service
	const serviceCallbacks = [];
	console.log('Starting Services...');
	for(const service of serviceNames){
		console.log(`\tStarting Service ${service}...`);
		serviceCallbacks.push(systemctl.start(service));
		console.log(`\tStarted ${service}`);
	}
	await Promise.all(serviceCallbacks);
	console.log('Done');
	console.log('[INSTALL] DONE');
}

const cleanupService = async (path) =>
{
	console.log('[CLEANUP] START');
	// keep only folder where build-latest points to
	const files = await fs.readdir(staticFolder);
	for(const folder of files)
	{
		if(`${staticFolder}/${folder}` === path) continue;
		const isFolder = (await fs.lstat(`${staticFolder}/${folder}`)).isDirectory();
		if(!isFolder) continue;
		console.log(`\tDeleting folder ${staticFolder}/${folder} Reason not currently running...`);
		await rimrafAsync(`${staticFolder}/${folder}`);

		console.log(`\tDeleted ${staticFolder}/${folder}`);
	}
	systemctl.restart('ultima-deployer');
	console.log('[CLEANUP] DONE');
}

module.exports = {
	InstallService
}

