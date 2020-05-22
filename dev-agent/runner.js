const { fork } = require('child_process')

require('./nodemon')

const {
    CHILD_PORT = 4490,
    CHILD_DEBUG_PORT = 4491,
} = process.env

function spawnNodemon({ nodeArgs, watch, ignore, exec, cwd, env }) {
    const nodemon = require.resolve('./nodemon')
    
    return fork(nodemon, [
        ...nodeArgs,
        ...(['--exec', exec]),
        ...watch.map(glob => ['--watch', glob]).flat(),
        ...ignore.map(glob => ['--ignore', glob]).flat(),
        ], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            cwd,
            env : {
                ...process.env,
                ...env,
            },
    })
}

const getNodemonOpts = async ({ wkdir, cfg }) => {
    const watch = (cfg.dev && cfg.dev.watch) || []
    const ignore = (cfg.dev && cfg.dev.ignore) || []

    let opts = {
        cwd: wkdir,
        exec: cfg.dev.command,
        env: {
            PORT: CHILD_PORT,
        },
		watch: watch.filter(glob => !glob.startsWith('!')),
		ignore: [
            ...watch.filter(glob => glob.startsWith('!')).map(glob => glob.substring(1)),
            ...ignore,
        ],
        nodeArgs: [`--inspect=0.0.0.0:${CHILD_DEBUG_PORT}`]
    }

    console.log('using nodemon opts', JSON.stringify(opts))

    return opts
}

const start = async ({ wkdir, cfg }) => {
    const opts = await getNodemonOpts({ wkdir, cfg })
    return spawnNodemon(opts)
}

module.exports = start