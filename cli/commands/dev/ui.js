const stringWidth = require('string-width')
const cliWidth = require('cli-width')
const cliResize = require('cli-resize')
const ansiEscapes = require('ansi-escapes')

const calcLines = (str, screenWidth) => {
    return str.split('\n').map(line => {
        if (!line) {
            return 1
        }
        return Math.ceil(stringWidth(line) / screenWidth)
    }).reduce((accumulator, currentValue) => accumulator + currentValue, 0)
}

const ui = (cfg) => {
    const {
        outputStream = process.stdout,
    } = cfg || {}

    let screenWidth = cliWidth()

    let bottomBar = ''

    const render = (props = {}) => {
        const btmBarLines = calcLines(bottomBar, screenWidth)
        if (props.bottomBar) {
            bottomBar = props.bottomBar
        }

        outputStream.write([
            ansiEscapes.eraseLines(btmBarLines),
            props.logLine || '',
            bottomBar,
        ].join(''))
    }

    cliResize(() => {
        screenWidth = cliWidth()
        render()
    })

    return {
        log: {
            write: (logLine) => {
                render({
                    logLine: logLine + '\n',
                })
            }
        },
        updateBottomBar: (bottomBar) => {
            render({
                bottomBar,
            })
        },
    }
}

module.exports = ui