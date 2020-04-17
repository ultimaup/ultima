exports.up = (knex) => {
	return knex.schema
		.createTable('user', (table) => {
                  table.uuid('id').primary()
                  table.string('imageUrl')
                  table.string('username')
                  table.string('name')
                  table.string('email')
                  table.string('giteaUserId')
		})
}

exports.down = (knex) => {
	return knex.schema.dropTable('user')
}
