exports.up = (knex) => {
	return knex.schema
		.table('user', (table) => {
            table.boolean('activated')
            table.timestamp('createdAt').defaultTo(knex.fn.now())
		})
}

exports.down = (knex) => {
	return knex.schema.table('user', (table) => {
        table.dropColumn('activated')
        table.dropColumn('createdAt')
    })
}
