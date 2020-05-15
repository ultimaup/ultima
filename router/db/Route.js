const Model = require('./Model')

class Route extends Model {
	static get tableName() {
		return 'route'
	}
}

Route.set = async ({ source, destination, deploymentId, alias = null, extensions = [] }) => {
	const existing = await Route.query().where({ source }).first()

	if (existing) {
		await Route.query().update({ destination, alias, deploymentId, extensions: JSON.stringify(extensions) }).where({ source })
	} else {
		await Route.query().insert({ source, alias, destination, deploymentId, extensions: JSON.stringify(extensions) }).returning('source')
	}

    return {
		source,
		destination,
	}
}

module.exports = Route