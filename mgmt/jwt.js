const jwt = require('jsonwebtoken')

const {
    JWT_SECRET,
} = process.env

const sign = (payload, options = {}) => {
    return new Promise((resolve, reject) => {
        jwt.sign(payload, JWT_SECRET, options, (err, token) => {
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

const headersToUser = async (req) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ')[1]
        if (!token) {
            throw new Error('unauthorized')
        } else {
            try {
                return await verify(token) 
            } catch (e) {
                throw new Error('unauthorized')
            }
        }
    } else {
        throw new Error('unauthorized')
    }
}

module.exports = {
    sign,
    verify,
    headersToUser,
}