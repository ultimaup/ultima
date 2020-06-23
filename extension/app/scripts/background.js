const { getUltimaServer } = require('./ultimaServer')

function isCSPHeader(headerName) {
    return (headerName === 'CONTENT-SECURITY-POLICY') || (headerName === 'X-WEBKIT-CSP');
}

// Listens on new request
chrome.webRequest.onHeadersReceived.addListener((details) => {
    for (let i = 0; i < details.responseHeaders.length; i += 1) {
        if (isCSPHeader(details.responseHeaders[i].name.toUpperCase())) {
            details.responseHeaders[i].value = details.responseHeaders[i].value.replace('connect-src', `connect-src ${getUltimaServer()}`)
        }
    }
    return { // Return the new HTTP header
        responseHeaders: details.responseHeaders,
    }
  }, {
    urls: ['*://github.com/*'],
    types: ['main_frame'],
  }, 
  ['blocking', 'responseHeaders']
)