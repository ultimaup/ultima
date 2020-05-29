exports.up = (knex) => {
	return knex.schema
		.createTable('resource', (table) => {
                  table.uuid('id').primary()
                  table.string('name')
                  table.string('type')
                  table.string('stage')
                  table.string('repoName')
                  table.string('deploymentId')
                  table.string('routeId')
                  table.timestamp('createdAt').defaultTo(knex.fn.now())
            })
}

exports.down = (knex) => {
	return knex.schema.dropTable('resource')
}
