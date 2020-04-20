exports.up = (knex) => {
	return knex.schema
		.table('route', (table) => {
            table.string('deploymentId')
		})
}

exports.down = (knex) => {
	return knex.schema.table('route', table => {
        table.dropColumn('deploymentId')
    })
}
