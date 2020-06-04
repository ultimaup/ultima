const fs = require('fs')

module.exports = {
    ca: fs.readFileSync('/docker-certs/client/ca.pem'),
    cert: fs.readFileSync('/docker-certs/client/cert.pem'),
    key: fs.readFileSync('/docker-certs/client/key.pem'),
}