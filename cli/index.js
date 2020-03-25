const { program } = require('commander')

const fileSync = require('./fileSync')

program.version('0.0.1')
program
  .option('-s, --server <value>', 'Set server URL', 'http2://localhost:4489')

program.parse(process.argv)

fileSync.init({
    rootEndpoint: program.server,
})