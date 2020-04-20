const Model = require('./Model')
const uuid = require('uuid').v4

class User extends Model {
	static get tableName() {
		return 'user'
	}
}

User.ensure = async ({ username, imageUrl, name, email }) => {
	const existing = await User.query().where({ username }).first()

	if (existing) {
		return existing
	} else {
		const user = {
			id: uuid(),
			username, imageUrl, name, email,
        }

		await User.query().insert(user)

		return user
	}
}

module.exports = User