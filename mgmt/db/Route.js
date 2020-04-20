const Model = require('./Model')

class Route extends Model {
	static get tableName() {
		return 'route'
	}
}

module.exports = Route