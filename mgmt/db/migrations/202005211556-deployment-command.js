exports.up = (knex) => {
	return knex.schema
		.table('deployment', (table) => {
            table.string('command')
		})
}

exports.down = (knex) => {
	return knex.schema.table('deployment', table => {
        table.dropColumn('command')
    })
}
