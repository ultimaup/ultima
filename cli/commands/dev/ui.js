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

const btmBarObjToStr = obj => {
    if (Object.keys(obj).length === 0) {
        return ''
    }

    return '\n'+Object.entries(obj).sort(([a], [b]) => {
        if (!b) {
            return -1
        }
        if (!a) {
            return 1
        }
        return b - a
    }).map(([namespace, str]) => `${namespace ? `${namespace} ` : ''}${str}`).join('\n')
}

const ui = (cfg) => {
    const {
        outputStream = process.stdout,
    } = cfg || {}

    let screenWidth = cliWidth()

    let bottomBar = {}

    const render = (props = {}) => {
        const btmBarLines = calcLines(btmBarObjToStr(bottomBar), screenWidth)
        if (props.bottomBar) {
            bottomBar = props.bottomBar
        }

        outputStream.write([
            btmBarLines ? ansiEscapes.eraseLines(btmBarLines) : '',
            props.logLine || '',
            btmBarObjToStr(bottomBar),
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
                    logLine: logLine + (logLine.endsWith('\n') ? '' : '\n'),
                })
            }
        },
        updateBottomBar: (namespace, btm) => {
            bottomBar[namespace] = btm
            render({
                bottomBar,
            })
        },
    }
}

module.exports = ui