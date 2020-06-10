const Model = require('./Model')

class GithubRepository extends Model {
	static get tableName() {
		return 'github_repository'
	}
}

module.exports = GithubRepository