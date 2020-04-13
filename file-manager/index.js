const util = require('util')
const path = require('path')
const bodyParser = require('body-parser')

const exec = util.promisify(require('child_process').exec)

const fse = require('fs-extra')
const express = require('express')

const app = express()

const {
	PORT,
} = process.env

const configName = Object.keys(process.env).find(k => k.startsWith('MC_HOST_')).split('MC_HOST_')[1]

const tryJsonParse = (str) => {
	try {
		return JSON.parse(str)
	} catch (e) {
		//
	}

	return str
}

const execCommand = cmd => exec(cmd).then(({ stdout, stderr }) => {
	return [...stdout.split('\n'), ...stderr.split('\n')]
		.flat()
		.map(tryJsonParse)
}).catch(({ stdout }) => {
	return stdout
}).catch(e => {
	throw e
})

const generatePolicy = (bucketName) => ({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Action": ["s3:*"],
            "Resource":[
				`arn:aws:s3:::${bucketName}/*`,
				`arn:aws:s3:::${bucketName}-*/*`
			]
        }
    ]
})

const listUsers = () => execCommand(`mcli admin user list --json ${configName}`)

const addUser = (user, password) => execCommand(`mcli admin user add --json ${configName} ${user} ${password}`)

const createBucket = (bucketName) => execCommand(`mcli mb --json ${configName}/${bucketName}`)

const makeBucketStaticHosting = (bucketName) => execCommand(`mcli policy set download ${configName}/${bucketName}`)

const setPolicyOnUser = (policyName, user) => execCommand(`mcli admin policy set --json ${configName} ${policyName} user=${user}`)

const addPolicy = (policyName, location) => execCommand(`mcli admin policy add --json ${configName} ${policyName} ${location}`)

const createPolicy = async (bucketName) => {
	const policy = generatePolicy(bucketName)

	// write policy file
	const tmpDir = await fse.mkdirp(`/tmp/${bucketName}`)
	const tmpLoc = path.resolve(tmpDir, `${bucketName}.json`)

	await fse.writeJson(tmpLoc, policy)

	await addPolicy(bucketName, tmpLoc)

	return bucketName
}

const ensureUserExists = async (userId, secret) => {
	const users = (await listUsers() || [])

	const existing = users.find(({accessKey}) => accessKey === userId)
	if (existing) {
		return existing
	}

	await createBucket(userId)
	const [newUser] = await addUser(userId, secret)	
	const policyName = await createPolicy(userId)

	await setPolicyOnUser(userId, policyName)

	return newUser
}

app.use(bodyParser.json())

app.post('/web-bucket', async (req, res) => {
	const { bucketName, ownerId } = req.body
	const actualBucketName = `${ownerId}-${bucketName}`
	console.log('web-bucket', { bucketName, ownerId, actualBucketName })
	const cbResult = await createBucket(actualBucketName)
	console.log('cbResult', cbResult)
	if (!cbResult.error) { // res.error will probably be cos it's been created already
		await makeBucketStaticHosting(actualBucketName)
	}

	res.json(actualBucketName)
})

app.post('/:userId', async (req, res) => {
	const { userId } = req.params
	const { secret } = req.body

	console.log('ensuring user exists', userId, secret)
	const user = await ensureUserExists(userId, secret)

	res.json(user)
})

app.listen({ port: PORT }, () => {
	console.log(`🚀  Server ready at ${PORT}`)
})