const path = require('path')
const fse = require('fs-extra')
const YAML = require('yaml')

const list = async () => {
    const dir = await fse.readdir(path.resolve('templates'))

    return await Promise.all(dir.filter(name => name !== 'index.js').map(async fname => {
        const name = fname.split('.ultima.yml')[0]
        const template = await fse.readFile(path.resolve('templates', fname), 'utf-8')
        const t = YAML.parse(template)

        return {
            id: name,
            name,
            template: t[Object.keys(t)[0]]
        }
    }))
}

module.exports = {
    list,
}