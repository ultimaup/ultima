const fs = require('fs')
const path = require('path')

const {
    CERTS_FOLDER,
} = process.env

module.exports = {
    ca: fs.readFileSync(path.resolve(CERTS_FOLDER, 'ca.pem')),
    cert: fs.readFileSync(path.resolve(CERTS_FOLDER, 'cert.pem')),
    key: fs.readFileSync(path.resolve(CERTS_FOLDER, 'key.pem')),
}