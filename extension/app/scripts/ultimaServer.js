const setUltimaServer = ultimaServer => {
    browser.storage.sync.set({
        ultimaServer,
    })
}

const getUltimaServer = async () => browser.storage.sync.get(['ultimaServer']).then((result) => {
    return result.ultimaServer
})

const watchUltimaServer = cb => {
    getUltimaServer().then(cb)
    browser.storage.onChanged.addListener((changes) => {
        for (let key in changes) {
            if (key === 'ultimaServer') {
                cb(changes[key].newValue)
            }
        }
    })
}

module.exports = {
    setUltimaServer,
    getUltimaServer,
    watchUltimaServer,
}