const Model = require('./Model')

class Repository extends Model {
	static get tableName() {
		return 'repository'
	}
}

module.exports = Repository