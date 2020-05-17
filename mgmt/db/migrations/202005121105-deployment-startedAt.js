exports.up = (knex) => {
	return knex.schema
		.table('deployment', (table) => {
            table.timestamp('startedAt')
		})
}

exports.down = (knex) => {
	return knex.schema.table('deployment', table => {
        table.dropColumn('startedAt')
    })
}
