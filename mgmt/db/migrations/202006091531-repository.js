exports.up = (knex) => {
	return knex.schema
		.createTable('repository', (table) => {
                        table.uuid('id').primary()
                        table.string('fullName')
                        table.string('vcs')
                        table.timestamp('createdAt').defaultTo(knex.fn.now())
        })
}

exports.down = (knex) => {
	return knex.schema.dropTable('repository')
}
