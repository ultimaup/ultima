const { getUltimaServer, setUltimaServer } = require('./ultimaServer')

function saveOptions(e) {
    e.preventDefault()
    const {value} = document.querySelector("#ultimaServer")
    setUltimaServer(value)
}

function restoreOptions() {
    getUltimaServer().then(ultimaServer => {
        document.querySelector("#ultimaServer").value = ultimaServer
    })
}

document.addEventListener("DOMContentLoaded", restoreOptions)
document.querySelector("form").addEventListener("submit", saveOptions)