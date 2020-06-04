const Docker = require('dockerode')

const {
	IN_PROD = false,
} = process.env

const opts = !IN_PROD ? require('./keys') : {}

const docker = new Docker(opts)

module.exports = docker