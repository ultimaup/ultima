const jwt = require('jsonwebtoken')

const {
    JWT_SECRET,
} = process.env

const sign = payload => {
    return new Promise((resolve, reject) => {
        jwt.sign(payload, JWT_SECRET, (err, token) => {
            if (err) {
                reject(err)
            } else {
                resolve(token)
            }
        })
    })
}

const verify = token => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, JWT_SECRET, (err, payload) => {
            if (err) {
                reject(err)
            } else {
                resolve(payload)
            }
        })
    })
}

module.exports = {
    sign,
    verify,
}