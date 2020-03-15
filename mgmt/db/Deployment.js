const Model = require('./Model')

class Deployment extends Model {
	static get tableName() {
		return 'deployment'
	}
}

Deployment.get = (id) => {
	return Deployment.query().where({ id }).first()
}

module.exports = Deployment