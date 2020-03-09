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

const execCommand = cmd => exec(cmd).then(({ stdout, stderr }) => {
	return stdout.split('\n').filter(Boolean).map(line => JSON.parse(line))
}).catch(({ stdout }) => {
	console.error(stdout)
}).catch(e => {
	console.error(e)
	throw e
})

const generatePolicy = (bucketName) => ({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "sid1",
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource": `arn:aws:s3:::${bucketName}`
        }
    ]
})

const listUsers = () => execCommand(`mc admin user list --json ${configName}`)

const addUser = (user, password) => execCommand(`mc admin user add --json ${configName} ${user} ${password}`)

const setPolicyOnUser = (policyName, user) => execCommand(`mc admin policy set --json ${configName} ${policyName} user=${user}`)

const addPolicy = (policyName, location) => execCommand(`mc admin policy add --json ${configName} ${policyName} ${location}`)

const createPolicy = async (userId) => {
	const policy = generatePolicy(userId)

	// write policy file
	const tmpDir = await fse.mkdirp(`/tmp/${userId}`)
	const tmpLoc = path.resolve(tmpDir, `${userId}.json`)

	await fse.writeJson(tmpLoc, policy)

	await addPolicy(userId, tmpLoc)

	return userId
}

const ensureUserExists = async (userId, secret) => {
	const users = await listUsers()

	const existing = users.find(({accessKey}) => accessKey === userId)
	if (existing) {
		return existing
	}

	const [newUser] = await addUser(userId, secret)	
	const policyName = await createPolicy(userId)

	await setPolicyOnUser(userId, policyName)

	return newUser
}

app.use(bodyParser.json())

app.post('/:userId', async (req, res) => {
	const { userId } = req.params
	const { secret } = req.body

	const user = await ensureUserExists(userId, secret)

	res.json(user)
})

app.listen({ port: PORT }, () => {
	console.log(`🚀  Server ready at ${PORT}`)
})