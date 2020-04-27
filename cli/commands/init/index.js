const { cli } = require('cli-ux')
const cliSelect = require('cli-select')
const git = require('simple-git/promise')()
const { program } = require('commander')
const jwtdecode = require('jwt-decode')

const gqlFetch = require('../../utils/gqlFetch')
const config = require('../../config')

const listRepoTemplates = ({ token }) => {
    return gqlFetch(token)(`query getTemplateRepos {
        getTemplateRepos {
          id
          name
          description
        }
      }`).then(({ data }) => data.getTemplateRepos)
}

const createRepo = ({token}, { name, private, templateId }) => {
    return gqlFetch(token)(`mutation createRepo($name: String, $private: $Boolean, $templateId: ID) {
        createRepoFromTemplate(name: $name, private: $private: $Boolean, templateId: $templateId) {
            id
            name
        }
    }`, { name, private, templateId }).then(({ data }) => data.createRepoFromTemplate)
}

const init = async (projectName) => {
    const { token } = await config.get()
    if (!token) {
        cli.error('you must be logged in to do that')
    }

    await cli.action.start('fetching templates...')

    const templates = await listRepoTemplates({ token })
    await cli.action.stop()
    const chosenTemplateName = await cliSelect({
        values: [
            ...templates.map(t => t.name),
            'Blank',
        ],
    })

    const publicPrivate = await cliSelect({
        values: [
            'public',
            'private',
        ],
    })

    const chosenTemplate = templates.find(t => t.name === chosenTemplateName)
    await cli.action.start('creating repo...')
    const { name } = await createRepo({ token },{
        name: projectName,
        templateId: chosenTemplate ? chosenTemplate.id : undefined,
        private: publicPrivate === 'private',
    })
    await cli.action.stop()
    const user = jwtdecode(token)
    const serverUrl = new URL(program.server)

    await cli.action.start('checking out locally...')
    try {
        await git.clone(`ssh://ultima@${serverUrl.hostname}:${user.username}/${name}.git`)
    } catch (e) {
        cli.error('failed to checkout your project locally: '+ e.message)
    }
    await cli.action.stop()

    cli.log(`Project created in directory ${name}`)
    cli.log(`now run \`cd ${name} && ultima dev\` to get building!`)
    cli.log(`when you're ready to go live, run \`ultima up\``)
}

module.exports = init