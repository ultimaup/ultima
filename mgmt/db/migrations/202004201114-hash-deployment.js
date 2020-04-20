exports.up = (knex) => {
	return knex.schema
		.table('deployment', (table) => {
            table.string('hash')
		})
}

exports.down = (knex) => {
	return knex.schema.table('deployment', table => {
        table.dropColumn('hash')
    })
}
