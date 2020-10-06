const spawn = require('child_process').spawn
const { createGzip } = require('zlib')
const moment = require('moment')
const cron = require('node-cron')

const s3 = require('./s3')
const Resource = require('./db/Resource')

const {
	PLATFORM_DB_HOST,
	PLATFORM_DBA_USER,
    PLATFORM_DBA_PASSWORD,
} = process.env

const backupDb = async (dbName) => {
    const timestamp = encodeURIComponent(new Date().toISOString())
    const filepath = `${timestamp}.sql.gz`
    const pgDumpChild = spawn('pg_dump', [dbName, '--no-password'], {
        stdio: ['ignore', 'pipe', 'inherit'],
        env: {
            PGHOST: PLATFORM_DB_HOST,
            PGUSER: PLATFORM_DBA_USER,
            PGPASSWORD: PLATFORM_DBA_PASSWORD,
        }
    })

    let pgDumpReturnCode

    pgDumpChild.on('exit', (code => {
        pgDumpReturnCode = code
    }))

    const bucketName = `${dbName}-db-backup`
    await s3.ensureFileBucket(bucketName)
    const { writeStream, promise } = s3.uploadStream({ Bucket: bucketName, Key: filepath })
    pgDumpChild.stdout.pipe(createGzip()).pipe(writeStream)
    
    await promise

    if (pgDumpReturnCode === undefined) {
        await new Promise((resolve, reject) => {
            pgDumpChild.on('exit', (code => {
                if (code !== 0) {
                    reject(new Error('pg_dump: Bad exit code (' + code + ')'))
                } else {
                    resolve(code)
                }
            }))
        })
    } else {
        if (code !== 0) {
            throw new Error('pg_dump: Bad exit code (' + code + ')')
        }
    }

    const todaysBackups = await s3.listAllContents({
        Bucket: bucketName,
        Prefix: timestamp.split('T')[0]
    })

    // delete if more than 3 hours old
    await Promise.all(
        todaysBackups.filter(obj => {
            const timestamp = decodeURIComponent(obj.Key).split('.sql.gz')
            return moment(timestamp).isBefore(moment().subtract(3, 'hours'))
        }).map(({ Key }) => {
            return s3.client.deleteObject({
                Key,
                Bucket: bucketName,
            })
        })
    )

    const allBackups = await s3.listAllContents({
        Bucket: bucketName,
    })

    // only keep 1 backup for prior days
    await Promise.all(
        allBackups.filter(obj => {
            const timestamp = decodeURIComponent(obj.Key).split('.sql.gz')
            return moment(timestamp).isBefore(moment().subtract(1, 'day'))
        }).filter((obj, i, arr) => {
            const timestamp = decodeURIComponent(obj.Key).split('.sql.gz')
            const date = moment(timestamp).format('YYYY-MM-DD')
            let isLastDaysBackup = true
            arr.forEach((aobj, j) => {
                const timestamp = decodeURIComponent(aobj.Key).split('.sql.gz')
                const d = moment(timestamp).format('YYYY-MM-DD')
                if (date === d && obj.Key !== aobj.Key && j > i) {
                    isLastDaysBackup = false
                }
            })
            return !isLastDaysBackup
        }).map(({ Key }) => {
            return s3.client.deleteObject({
                Key,
                Bucket: bucketName,
            })
        })
    )
}

const listAllDBs = async () => {
    const masterDBs = await Resource.query().select('deploymentId').where('type', 'postgres').where('stage', 'refs/heads/master')
    const mainDBs = await Resource.query().select('deploymentId').where('type', 'postgres').where('stage', 'refs/heads/main')

    return [
        ...masterDBs.map(({ deploymentId }) => deploymentId),
        ...mainDBs.map(({ deploymentId }) => deploymentId),
    ]
}

const backupAllDBs = async () => {
    const dbs = await listAllDBs()
    await Promise.all(
        dbs.map(dbName => {
            return backupDb(dbName).catch(e => {
                console.error(`error backing up ${dbName}: ${e.message}`, e)
            })
        })
    )
}

const schedule = () => {
    cron.schedule('0 * * * *', () =>  {
        console.log('running db backups')
        backupAllDBs().then(() => {
            console.log('completed db backups')
        })
    })
}

module.exports = {
    backupDb,
    schedule,
}