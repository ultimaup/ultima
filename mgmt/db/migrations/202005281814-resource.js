exports.up = (knex) => {
	return knex.schema
		.createTable('resource', (table) => {
                  table.uuid('id').primary()
                  table.string('name')
                  table.string('type')
                  table.string('stage')
                  table.string('repoName')
                  table.uuid('deploymentId')
                  table.uuid('routeId')
                  table.timestamp('createdAt').defaultTo(knex.fn.now())
            })
}

exports.down = (knex) => {
	return knex.schema.dropTable('resource')
}
