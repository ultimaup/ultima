const nodemon = require('nodemon')

const start = ({ wkdir }, callback) => {
    nodemon({
        script: '.',
        ext: 'js json',
        stdout: false,
        cwd: wkdir,
        nodeArgs: ['--inspect']
    })

    nodemon.on('start', () => {
        callback('start')
    }).on('readable', function() {
        callback('outputs', {
            stdout: this.stdout,
            stderr: this.stderr,
        })
    }).on('quit', () => {
        callback('quit')
    }).on('restart', (files) => {
        callback('restart', files)
    }).on('crash', () => {
        callback('crash')
    })

    // e.g. restart or quit
    const force = event => nodemon.emit(event)

    return force
}

module.exports = start