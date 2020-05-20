exports.up = (knex) => {
	return knex.schema
		.table('deployment', (table) => {
            table.string('runtime')
		})
}

exports.down = (knex) => {
	return knex.schema.table('deployment', table => {
        table.dropColumn('runtime')
    })
}
