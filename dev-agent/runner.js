const { fork } = require('child_process')

const {
    CHILD_PORT = 4490,
    CHILD_DEBUG_PORT = 4491,
} = process.env

function spawnNodemon({ nodeArgs, watch, ignore, exec, ext, cwd, env }) {
    const nodemon = require.resolve('./nodemon')
    const args = JSON.stringify({
        nodeArgs, watch, ignore, exec, cwd, env,
    })
    // const args = [
    //     ...nodeArgs,
    //     ...(['--exec', exec]),
    //     ...(ext.length ? ['--ext', ext.join(',')] : []),
    //     ...watch.map(glob => ['--watch', glob]).flat(),
    //     ...ignore.map(glob => ['--ignore', glob]).flat(),
    // ]
    console.log('running nodemon with', args)

    return fork(nodemon, [args], {
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
        ext: cfg.dev.watch.filter(g => g.includes('.')).map(g => g.split('.')[1]),
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