const nodemon = require('nodemon')
const fse = require('fs-extra')
const path = require('path')

const {
    CHILD_PORT = 4490,
    CHILD_DEBUG_PORT = 4491,
} = process.env

const getNodemonOpts = async ({ wkdir }) => {
    const pkg = await fse.readJSON(path.resolve(wkdir, 'package.json'))

    let opts = {
        ext: 'js json',
        cwd: wkdir,
        stdout: false,
        env: {
            PORT: CHILD_PORT,
        },
        nodeArgs: [`--inspect=0.0.0.0:${CHILD_DEBUG_PORT}`]
    }

    if (pkg.scripts && pkg.scripts.start) {
        opts.exec = `npm run start`
    }
    if (pkg.scripts && pkg.scripts.watch) {
        opts.exec = `npm run watch`
    }
    if (pkg.scripts && pkg.scripts.dev) {
        opts.exec = `npm run dev`
    }

    if (!opts.exec) {
        opts.script = 'node .'
    }

    if (pkg.nodemonConfig) {
        opts = {
            ...opts,
            ...pkg.nodemonConfig,
            env: {
                ...opts.env,
                ...(pkg.nodemonConfig.env || {}),
            },
        }
    }

    return opts
}

const start = async ({ wkdir }) => {
    const opts = await getNodemonOpts({ wkdir })

    nodemon(opts)

    return nodemon
}

module.exports = start