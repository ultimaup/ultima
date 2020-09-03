exports.up = (knex) => {
	return knex.schema
		.table('user', (table) => {
			table.string('tier')
			table.string('stripeCustomerId')
		})
}

exports.down = (knex) => {
	return knex.schema.table('user', table => {
        table.dropColumn('tier')
		table.dropColumn('stripeCustomerId')
    })
}
