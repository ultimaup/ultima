const fse = require('fs-extra')
const path = require('path')

const fileHandler = async (type, location, sessionId, stream) => {
    console.log(sessionId, type, location)
    const wkdir = path.resolve('/tmp', sessionId)
    const absPath = path.resolve(wkdir, location)

    if (location === '.') {
        return true
    }

    switch (type) {
        case 'add':
        case 'change':
            // ensure dir exists (fse doesn't do this for us)
            await fse.ensureDir(path.resolve(absPath, '..'))
            
            // pipe stream to path
            const writeStream = fse.createWriteStream(absPath)
            stream.pipe(writeStream)
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve)
                writeStream.on('error', reject)
            })
            break
        case 'addDir':
            // ensure dir exists for path
            await fse.ensureDir(absPath)
            break
        case 'unlink':
            // delete file at path
            await fse.remove(absPath)
            break
        case 'unlinkDir':
            // delete dir at path
            await fse.remove(absPath)
            break
    }

    console.log(sessionId, type, location)

    return true
}

module.exports = fileHandler