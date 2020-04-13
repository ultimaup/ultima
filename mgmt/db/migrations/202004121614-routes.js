exports.up = (knex) => {
	return knex.schema
		.createTable('route', (table) => {
			table.string('source').primary().notNullable()
			table.string('destination').notNullable()
		})
}

exports.down = (knex) => {
	return knex.schema.dropTable('route')
}
