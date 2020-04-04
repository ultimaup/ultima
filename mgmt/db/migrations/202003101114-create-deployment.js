exports.up = (knex) => {
	return knex.schema
		.createTable('deployment', (table) => {
			table.string('id').notNullable()
			table.string('stage', 1000).notNullable()
			table.string('bundleLocation', 1000).notNullable()
			table.text('env')
		})
}

exports.down = (knex) => {
	return knex.schema.dropTable('deployment')
}
