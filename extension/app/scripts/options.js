const { getUltimaServer, setUltimaServer } = require('./ultimaServer')

function saveOptions(e) {
    e.preventDefault()
    setUltimaServer(document.querySelector("#ultimaServer").value)
}

function restoreOptions() {
    document.querySelector("#ultimaServer").value = getUltimaServer()
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);