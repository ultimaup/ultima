const Model = require('./Model')

class Resource extends Model {
	static get tableName() {
		return 'resource'
	}
}

module.exports = Resource