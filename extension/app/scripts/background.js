const { watchUltimaServer } = require('./ultimaServer')

function isCSPHeader(headerName) {
    return (headerName === 'CONTENT-SECURITY-POLICY') || (headerName === 'X-WEBKIT-CSP');
}

let ultimaServer

watchUltimaServer(us => {
    ultimaServer = us
})
// Listens on new request

function listener(details) {
    for (let i = 0; i < details.responseHeaders.length; i += 1) {
        if (isCSPHeader(details.responseHeaders[i].name.toUpperCase())) {
            const newCSP = details.responseHeaders[i].value.replace('connect-src', `connect-src ${ultimaServer}`)
            console.log('changed csp to', newCSP)
            details.responseHeaders[i].value = newCSP
        }
    }
    return { // Return the new HTTP header
        responseHeaders: details.responseHeaders,
    }
}

browser.webRequest.onHeadersReceived.addListener(listener, {
    urls: ['*://github.com/*'],
    types: ['main_frame'],
  },
  ['blocking', 'responseHeaders']
)

console.log('added listener', browser.webRequest.onHeadersReceived.hasListener(listener))

// browser.runtime.onMessageExternal.addListener(
//     async function(request) {
//         console.log('proxying request', request)
//         try {
//             const token = await browser.storage.sync.get(['ultimaToken']).then((result) => {
//                 return result.ultimaToken
//             })
//             const [url, opts] = request
//             opts.headers = opts.headers || {}
//             opts.headers.authorization = `Bearer ${token}`
//             const result = await fetch(url, opts)
//             const text = await result.text()
//             return {
//                 ...result,
//                 text,
//             }
//         } catch (e) {
//             console.error(e)
//             throw e
//         }
//     }
// )