const { cli } = require('cli-ux')
const cliSelect = require('cli-select')
const git = require('simple-git/promise')()

const gqlFetch = require('../../utils/gqlFetch')
const config = require('../../config')
const listRepoTemplates = require('./listRepoTemplates')

const createRepo = ({token}, { name, private, templateId }) => {
    return gqlFetch({token})(`mutation createRepo($name: String, $private: Boolean, $templateId: ID) {
        createRepo(name: $name, private: $private, templateId: $templateId) {
            id
            name
            ssh_url
        }
    }`, { name, private, templateId }).then(({ data }) => data.createRepo)
}

const init = async (projectName) => {
    const { token } = await config.get()
    if (!token) {
        cli.error('you must be logged in to do that')
    }

    await cli.action.start('fetching templates...')

    const templates = await listRepoTemplates({ token })
    await cli.action.stop()
    cli.log('Choose a template:')
    const chosenTemplateName = await cliSelect({
        values: [
            ...templates.map(t => t.name),
            'Blank',
        ],
    })
    cli.log(`Using template: ${chosenTemplateName.value}`)

    const private = await cli.confirm('Would you like this to be a private repo?')

    const chosenTemplate = templates.find(t => t.name === chosenTemplateName.value)
    await cli.action.start('creating repo...')
    const { name, ssh_url } = await createRepo({ token }, {
        name: projectName,
        templateId: chosenTemplate ? chosenTemplate.id : undefined,
        private,
    })
    await cli.action.stop()

    await cli.log('checking out locally...')
    try {
        await git.clone(ssh_url)
    } catch (e) {
        cli.error('failed to checkout your project locally: '+ e.message)
    }

    cli.log(`Project created in directory ${name}`)
    cli.log(`now run \`cd ${name} && ultima dev\` to get building!`)
    cli.log(`when you're ready to go live, run \`ultima up\``)
}

module.exports = init