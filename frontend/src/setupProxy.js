const { createProxyMiddleware } = require('http-proxy-middleware')

const { MGMT_ENDPOINT } = process.env

module.exports = function(app) {
    app.use(
        '/graphql',
        createProxyMiddleware({
            target: MGMT_ENDPOINT,
            changeOrigin: true,
        })
    )
    app.use(
        '/auth',
        createProxyMiddleware({
            target: MGMT_ENDPOINT,
            changeOrigin: true,
        })
    )
}