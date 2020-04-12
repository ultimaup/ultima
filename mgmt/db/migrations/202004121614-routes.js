exports.up = (knex) => {
	return knex.schema
		.createTable('route', (table) => {
			table.string('subdomain').primary().notNullable()
			table.string('destination').notNullable()
		})
}

exports.down = (knex) => {
	return knex.schema.dropTable('route')
}
