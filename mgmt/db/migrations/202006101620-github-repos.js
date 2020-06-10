exports.up = (knex) => {
	return knex.schema
		.createTable('github_repository', (table) => {
            table.string('id')
            table.string('username')
            table.string('name')
            table.string('full_name')
            table.boolean('private')
            table.string('installationId')
            table.timestamp('createdAt')
            table.timestamp('pushedAt')
        })
}

exports.down = (knex) => {
	return knex.schema.dropTable('github_repository')
}
