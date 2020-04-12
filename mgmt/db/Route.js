const Model = require('./Model')

const {
    PUBLIC_ROUTE_ROOT,
    PUBLIC_ROUTE_ROOT_PROTOCOL,
} = process.env

class Route extends Model {
	static get tableName() {
		return 'route'
	}
}

Route.set = async ({ subdomain, destination }) => {
	const existing = await Route.query().where({ subdomain }).first()

	if (existing) {
		await Route.query().update({ destination }).where({ subdomain })
	} else {
		await Route.query().insert({ subdomain, destination }).returning('subdomain')
    }
    
    return `${PUBLIC_ROUTE_ROOT_PROTOCOL}://${subdomain}.${PUBLIC_ROUTE_ROOT}`
}

module.exports = Route