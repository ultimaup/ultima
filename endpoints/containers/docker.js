const Docker = require('dockerode')

const opts = require('./keys')

const docker = new Docker(opts)

module.exports = docker