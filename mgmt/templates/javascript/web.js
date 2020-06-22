const fse = require('fs-extra')

console.log('writing to ./build2/index.html')
fse.outputFile('./build2/index.html', new Date().toISOString(), 'utf-8').catch(console.error)

setInterval(() => {
    fse.outputFile('./build2/index.html', new Date().toISOString(), 'utf-8').catch(console.error)
}, 1000 * 60)