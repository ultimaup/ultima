const fs = require('fs')
const Docker = require('dockerode')

const {
	IN_PROD = false,
} = process.env

const opts = !IN_PROD ? {
    ca: fs.readFileSync('/docker-certs/client/ca.pem'),
    cert: fs.readFileSync('/docker-certs/client/cert.pem'),
    key: fs.readFileSync('/docker-certs/client/key.pem'),
} : {}

const docker = new Docker(opts)

module.exports = docker