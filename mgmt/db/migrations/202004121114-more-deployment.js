exports.up = (knex) => {
	return knex.schema
		.table('deployment', (table) => {
            table.string('repoName')
            table.timestamp('createdAt').defaultTo(knex.fn.now())
		})
}

exports.down = (knex) => {
	return knex.schema.table('deployment', table => {
        table.dropColumn('repoName')
        table.dropColumn('createdAt')
    })
}
