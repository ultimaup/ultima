const klaw = require('klaw')
const path = require('path')
const fse = require('fs-extra')
const YAML = require('yaml')

const getDirItems = (dir) => {
    return new Promise((resolve, reject) => {
        const items = []
        klaw(dir)
            .on('readable', function () {
                let item
                while ((item = this.read())) {
                    const isDir = item.stats.isDirectory()
                    items.push({
                        path: item.path.split(dir)[1],
                        isDir,
                        absPath: item.path,
                    })
                }
            })
            .on('end', () => resolve(items))
            .on('error', reject)
    })
}

const get = async (name) => {
    const dir = path.resolve('templates', name)
    const items = await getDirItems(dir)
    return items
}

const getTree = async name => {
    const items = await get(name)
    const tree = await Promise.all(
        items.filter(i => !i.isDir).map(async item => {
            const content = await fse.readFile(item.absPath, 'utf-8')

            return {
                path: item.path.substring(1),
                type: 'blob',
                content,
                mode: '100644',
            }
        })
    )

    return tree
}

const list = async () => {
    const dir = await fse.readdir(path.resolve('templates'))

    return await Promise.all(dir.filter(name => name !== 'index.js').map(async name => {
        const template = await fse.readFile(path.resolve('templates', name, '.ultima.yml'), 'utf-8')
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
    getTree,
}