const { Router } = require('express')

const router = new Router()

const jwt = require('../jwt')
const s3 = require('../s3')

router.all('/build-cache/:hash', async (req, res, next) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ')[1]
        if (token) {
            try {
                req.user = await jwt.verify(token)
            } catch(e) {
                //
            }
        }
    }
    console.log(`build-cache call ${req.method} ${req.path}`)

    if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'unauthorized' })
    } else {
        next()
    }
})

router.head('/build-cache/:hash', async (req, res) => {
    const { user, repo, deploymentId } = req.user
    const { hash } = req.params
    console.log(`${deploymentId}: ${user}/${repo} checked head of ${hash}`)
    const Key = `build-cache/${hash}`

    const exists = await s3.headObject({ Key })

    if (exists) {
        res.status(200).end()
    } else {
        res.status(404).end()
    }
})

router.get('/build-cache/:hash', async (req, res) => {
    const { user, repo, deploymentId } = req.user
    const { hash } = req.params
    console.log(`${deploymentId}: ${user}/${repo} requested cache for ${hash}`)

    const Key = `build-cache/${hash}`
    const exists = await s3.headObject({ Key })

    if (exists) {
        const stream = await s3.getStream({ Key })
        stream.pipe(res)
    } else {
        res.status(404).end()
    }
})

router.post('/build-cache/:hash', async (req, res) => {
    const { user, repo, deploymentId } = req.user
    const { hash } = req.params
    console.log(`${deploymentId}: ${user}/${repo} populated cache for ${hash}`)

    const Key = `build-cache/${hash}`
    const exists = await s3.headObject({ Key })

    if (exists) {
        return res.status(422).end()
    } else {
        const { writeStream, promise } = s3.uploadStream({ Key })
        req.pipe(writeStream)
        await promise
        res.status(200).end()
    }
})

module.exports = (app) => {
    app.use(router)
}