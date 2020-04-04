const nodemon = require('nodemon')

const {
    CHILD_PORT,
    CHILD_DEBUG_PORT,
} = process.env

const start = ({ wkdir }) => {
    nodemon({
        script: '.',
        ext: 'js json',
        cwd: wkdir,
        stdout: false,
        env: {
            PORT: CHILD_PORT,
        },
        nodeArgs: [`--inspect=0.0.0.0:${CHILD_DEBUG_PORT}`]
    })

    return nodemon
}

module.exports = start