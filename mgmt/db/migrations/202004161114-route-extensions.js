exports.up = (knex) => {
	return knex.schema
		.table('route', (table) => {
			table.string('extensions')
		})
}

exports.down = (knex) => {
	return knex.schema.table('route', table => {
        table.dropColumn('extensions')
    })
}
