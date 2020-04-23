const Model = require('./Model')

class Action extends Model {
	static get tableName() {
		return 'action'
	}
}

module.exports = Action