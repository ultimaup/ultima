const { spawn } = require('child_process')
const { PassThrough } = require('stream')
const EventEmitter = require('events')
const minimatch = require('minimatch')

const {
    CHILD_PORT = 4490,
    CHILD_DEBUG_PORT = 4491,
} = process.env

const getOpts = ({ wkdir, cfg }) => {
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
    return opts
}

const cache = {}

const start = ({ wkdir, cfg }) => {
    const opts = getOpts({ wkdir, cfg })
    const key = JSON.stringify(opts)

    const stdout = new PassThrough()
    const stderr = new PassThrough()

    stdout.on('end', function () {
        console.log('stdout end');
    })
    stdout.on('close', function () {
        console.log('stdout close');
    })

    const runnerIn = new EventEmitter()
    const runnerOut = new EventEmitter()

    const forkArgs = [
        'sh', 
        ['-c', opts.exec], 
        {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            cwd: opts.cwd,
            env : {
                ...process.env,
                ...opts.env,
            },
            detached: true,
        },
    ]

    let child

    const stdoutHandler = d => stdout.write(d)
    const stderrHandler = d => stderr.write(d)

    const spawnChild = () => {
        if (cache[key]) {
            try {
                process.kill(-cache[key].pid)
            } catch (e) {
                // fail silently
            }
        }
        child = spawn(...forkArgs)
        child.on('close', exitHandler)
        child.stdout.on('data', stdoutHandler)
        child.stderr.on('data', stderrHandler)
        child.on('error', console.error)
        cache[key] = child
    }

    const exitHandler = (code, signal) => {
        console.log('child.on exit', code, signal)
        if (signal !== 'SIGTERM') {
            runnerOut.emit('message', ({ type: 'crash' }))
            child = null
        } else {
            child.stdout.removeListener('data', stdoutHandler)
            child.stderr.removeListener('data', stderrHandler)

            runnerOut.emit('message', ({ type: 'restart' }))

            spawnChild()
        }
    }

    spawnChild()

    runnerOut.emit('message', ({ type: 'start' }))

    runnerIn.on('restart', () => {
        console.log('got restart')
        if (child) {
            process.kill(-child.pid)
        } else {
            spawnChild()
        }
    })

    return {
        stdout,
        stderr,
        emit: (...args) => runnerIn.emit(...args),
        on: (...args) => runnerOut.on(...args)
    }
}

const shouldRestart = (filePath, cfg) => {
    if (cfg.directory && !filePath.startsWith(cfg.directory)) {
        return false
    }
    const fpath = cfg.directory ? filePath.substring(cfg.directory.length + 1) : filePath // +1 for the slash
	if (cfg.dev && cfg.dev.watch) {
        const { watch, ignore } = getOpts({ wkdir: null, cfg })

        const result = (
			watch.some(glob => minimatch(fpath, glob)) && 
			!ignore.some(glob => minimatch(fpath, glob))
        )

        return result
    }
    
	return false
}

module.exports = {
    start,
    shouldRestart,
}