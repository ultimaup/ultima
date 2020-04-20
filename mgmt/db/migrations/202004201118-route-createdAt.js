exports.up = (knex) => {
	return knex.schema
		.table('route', (table) => {
            table.timestamp('createdAt').defaultTo(knex.fn.now())
		})
}

exports.down = (knex) => {
	return knex.schema.table('route', table => {
        table.dropColumn('createdAt')
    })
}
