exports.up = (knex) => {
	return knex.schema
		.table('deployment', (table) => {
            table.timestamp('stoppedAt')
		})
}

exports.down = (knex) => {
	return knex.schema.table('deployment', table => {
        table.dropColumn('stoppedAt')
    })
}
