const Model = require('./Model')

class Deployment extends Model {
	static get tableName() {
		return 'deployment'
	}
}

Deployment.get = async (id) => {
	const deployment = await Deployment.query().where({ id }).first()
	if (!deployment) {
		return null
	}

	return {
		...deployment,
		env: deployment.env ? JSON.parse(deployment.env) : {},
		ports: deployment.ports ? JSON.parse(deployment.ports) : [],
	}
}

Deployment.ensure = async ({ id, stage, bundleLocation, repoName, ports, hash, runtime, command, env }) => {
	const existing = await Deployment.get(id)

	if (existing) {
		return existing
	} else {
		const deployment = {
			id,
			stage,
			hash,
			repoName,
			bundleLocation,
			runtime,
			command,
			ports: JSON.stringify(ports),
			env: JSON.stringify(env),
		}

		await Deployment.query().insert(deployment)

		return Deployment.get(id)
	}
}

module.exports = Deployment