const cli = require('nodemon/lib/cli');
const nodemon = require('nodemon');
const options = cli.parse(process.argv);

nodemon(options);