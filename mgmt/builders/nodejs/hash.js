const crypto = require('crypto')

const streamHash = (s, algorithm = 'sha1') => {
	return new Promise((resolve, reject) => {
		const shasum = crypto.createHash(algorithm)
		try {
			s.on('data', (data) => {
				shasum.update(data)
			})
			s.on('end', () => {
				const hash = shasum.digest('hex')
				return resolve(hash)
			})
		} catch (error) {
			return reject('calc fail')
		}
	})
}

module.exports = streamHash