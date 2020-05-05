const path = require('path')
const homedir = require('os').homedir()

const fse = require('fs-extra')

const configLoc = path.resolve(homedir, '.ultimarc')

const get = () => fse.readJSON(configLoc).catch(() => null).then(data => data || {})

const set = data => fse.writeFile(configLoc, JSON.stringify(data, null, '\t'))

const env = {
    sshUrl: 'ultima',
}

module.exports = {
    get,
    set,
    env,
}