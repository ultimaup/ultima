let ultimaServer = 'https://build.onultima.com'
browser.storage.sync.get('ultimaServer').then((result) => {
    ultimaServer = result.ultimaServer
})

browser.storage.onChanged.addListener((changes) => {
    for (let key in changes) {
        if (key === 'ultimaServer') {
            ultimaServer = changes[key].newValue
        }
    }
})

const setUltimaServer = ultimaServer => {
    browser.storage.sync.set({
        ultimaServer,
    })
}

const getUltimaServer = () => ultimaServer

module.exports = {
    setUltimaServer,
    getUltimaServer,
}