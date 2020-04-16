exports.up = (knex) => {
	return knex.schema
		.table('deployment', (table) => {
            table.string('ports')
		})
}

exports.down = (knex) => {
	return knex.schema.table('deployment', table => {
        table.dropColumn('ports')
    })
}
