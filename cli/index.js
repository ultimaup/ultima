const { program } = require('commander')
const {cli} = require('cli-ux')

const fileSync = require('./fileSync')

program.version('0.0.1')
program
    .option('-s, --server <value>', 'Set server URL', 'http2://localhost:4489')

program.parse(process.argv)

const init = async () => {
    // await cli.prompt('Username')
    // await cli.prompt('Password', { type: 'hide' })
    
    // await cli.action.start('logging in...')

    // await cli.wait(2000)

    // await cli.action.stop()

    const fileBar = cli.progress({
        format: ' {bar} {percentage}% | ETA: {eta}s | {value}/{total}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591'
    })

    await cli.action.start('initializing...')
    let barVisible = false

    try {
        await fileSync.init({
            rootEndpoint: program.server,
        }, (completed, total) => {
            if (!barVisible) {
                cli.action.stop()
                fileBar.start()
            }

            fileBar.update(completed)
            fileBar.setTotal(total)

            if (total === completed && isInitialized) {
                fileBar.stop()
                cli.action.start('Watching for changes')
            }
        }, () => {
            isInitialized = true
        })
    } catch (e) {
        await cli.action.stop()
        console.error('failed to init', e)
    }
}

init()