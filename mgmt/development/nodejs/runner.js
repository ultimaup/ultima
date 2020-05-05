const fse = require('fs-extra')
const path = require('path')
const { spawn } = require('child_process')

const {
    CHILD_PORT = 4490,
    CHILD_DEBUG_PORT = 4491,
} = process.env

function spawnNodemon({ nodeArgs, script, exec, cwd, env }) {
  return spawn('npx', [
      'nodemon',
      ...nodeArgs,
      ...(script ? [script] : ['--exec', exec]),
      '--ignore', `${cwd}/node_modules`,
      '--watch', '.',
    ], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        cwd,
        env : {
            ...process.env,
            ...env,
        },
  })
}

const getNodemonOpts = async ({ wkdir }) => {
    const pkg = await fse.readJSON(path.resolve(wkdir, 'package.json'))

    let opts = {
        ext: 'js json',
        cwd: wkdir,
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
        opts.script = 'index.js'
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

    console.log('using nodemon opts', JSON.stringify(opts))

    return opts
}

const start = async ({ wkdir }) => {
    const opts = await getNodemonOpts({ wkdir })
    return spawnNodemon(opts)
}

module.exports = start