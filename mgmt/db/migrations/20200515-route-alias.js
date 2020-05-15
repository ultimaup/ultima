exports.up = (knex) => {
	return knex.schema
		.table('route', (table) => {
            table.string('alias')
		})
}

exports.down = (knex) => {
	return knex.schema.table('route', table => {
        table.dropColumn('alias')
    })
}
