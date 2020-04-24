const { program } = require('commander')

const dev = require('./commands/dev')
const login = require('./commands/login')

program.version('0.0.1')
program
    .option('-s, --server <value>', 'Set server URL', 'http://build.onultima.local:4480')

program.command('login <token>')
    .description('login to ultima')
    .action(login)

program.command('dev')
    .description('develop an ultima project')
    .action(dev)

program.parse(process.argv)