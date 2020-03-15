exports.up = (knex) => {
	return knex.schema
		.createTable('deployment', (table) => {
			table.uuid('id').notNullable()
			table.string('stage', 1000).notNullable()
			table.string('bundleLocation', 1000).notNullable()
			table.text('env')
		})
}

exports.down = (knex) => {
	return knex.schema.dropTable('deployment')
}
