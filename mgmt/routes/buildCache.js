const { Router } = require('express')

const router = new Router()

const jwt = require('./jwt')
const s3 = require('../s3')

req.all('/build-cache/:hash', (req, res, next) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ')[1]
        if (token) {
            try {
                req.user = jwt.verify(token)
            } catch(e) {
                //
            }
        }
    }

    if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'unauthorized' })
    } else {
        next()
    }
})

router.head('/build-cache/:hash', (req, res) => {
    const { user, repo, deploymentId } = req.user
    const { hash } = req.params
    console.log(`${deploymentId}: ${user}/${repo} checked head of ${hash}`)
    const Key = `build-cache/${hash}`

    if (await s3.headObject({ Key})) {
        res.status(200).end()
    } else {
        res.status(404).end()
    }
})

router.get('/build-cache/:hash', (req, res) => {
    const { user, repo, deploymentId } = req.user
    const { hash } = req.params
    console.log(`${deploymentId}: ${user}/${repo} requested cache for ${hash}`)

    const Key = `build-cache/${hash}`

    if (await s3.headObject({ Key })) {
        const stream = await s3.getStream({ Key })
        stream.pipe(res)
    } else {
        res.status(404).end()
    }
})

router.post('/build-cache/:hash', (req, res) => {
    const { user, repo, deploymentId } = req.user
    const { hash } = req.params
    console.log(`${deploymentId}: ${user}/${repo} populated cache for ${hash}`)

    const Key = `build-cache/${hash}`

    if (await s3.headObject({ Key })) {
        return res.status(422).end()
    } else {
        const { writeStream, promise } = s3.uploadStream({ Key })
        req.body.pipe(writeStream)
        await promise
        res.status(200).end()
    }
})

module.exports = (app) => {
    app.use(router)
}