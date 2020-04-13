const Model = require('./Model')

class Route extends Model {
	static get tableName() {
		return 'route'
	}
}

Route.set = async ({ source, destination }) => {
	const existing = await Route.query().where({ source }).first()

	if (existing) {
		await Route.query().update({ destination }).where({ source })
	} else {
		await Route.query().insert({ source, destination }).returning('source')
	}
    
    return {
		source,
		destination,
	}
}

module.exports = Route