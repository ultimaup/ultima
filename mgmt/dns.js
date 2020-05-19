const dns = require('dns')

const getCnameFromNs = async (ns, hostname) => {
    return new Promise((resolve, reject) => {
        const resolver = new dns.Resolver()
        resolver.setServers([ns])
        // doesn't promisify nicely for some reason :(
        resolver.resolveCname(hostname, (err, cname) => {
            if (err && err.code === 'ENOTFOUND') {
                return resolve(['cannot resolve'])
            }
            if (err && err.code === 'ENODATA') {
                return resolver.resolve4(hostname, (err, ipv4) => {
                    if (err) {
                        return reject(err)
                    } else {
                        return resolver.resolve6(hostname, (err, ipv6) => {
                            if (err && err.code !== 'ENODATA') {
                                return reject(err)
                            } else {
                                resolve({
                                    ipv4,
                                    ipv6,
                                })
                            }
                        })
                    }
                })
            }
            if (err) {
                return reject(err)
            } else {
                resolve({ cname })
            }
        })
    })
}

const getCname = async (hostname) => {
    const cfResult = await getCnameFromNs('1.1.1.1',hostname)
    const googleResult = await getCnameFromNs('8.8.8.8', hostname)

    return {
        cfResult, 
        googleResult,
    }
}

module.exports = {getCname}
