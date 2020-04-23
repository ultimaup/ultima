exports.up = (knex) => {
	return knex.schema
	.createTable('action', (table) => {
            table.string('id').notNullable()
            
            table.string('owner')
            table.string('repoName')
            table.string('branch')
            table.string('hash')
            table.timestamp('createdAt').defaultTo(knex.fn.now())
            table.timestamp('completedAt')

            table.string('parentId')

            table.string('type')
            table.string('title')
            table.string('description')
            table.text('metadata')
	})
}

exports.down = (knex) => {
	return knex.schema.dropTable('action')
}
