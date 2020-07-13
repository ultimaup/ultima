exports.up = (knex) => {
	return knex.schema
		.table('action', (table) => {
            table.string('vcsId')
		})
}

exports.down = (knex) => {
	return knex.schema.table('action', table => {
        table.dropColumn('vcsId')
    })
}
