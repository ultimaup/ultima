const {
    ES_USERNAME,
    ES_PASSWORD,
    KIBANA_ENDPOINT,
} = process.env

const got = require('got')

const client = got.extend({
    prefixUrl: KIBANA_ENDPOINT,
    username: ES_USERNAME,
    password: ES_PASSWORD,
    headers: {
        'kbn-xsrf': true,
        'content-type': 'application/json',
    },
})

const ensureKibanaUser = async ({ email, username: user, fullName, password }) => {
    const username = user.toLowerCase()

    const existing = await getUser(username)
    if (existing) {
        return {
            user: existing,
            sid: await getSession({
                username,
                password,
            })
        }
    }

    const indexPattern = `logstash-${username}-*`
    await createIndexPattern(indexPattern).catch(e => {
        console.error(`error creating indexPattern`)
        throw e
    })
    const spaceId = username.toLowerCase()
    await createSpace(spaceId).catch(e => {
        console.error(`error creating space`, e.response.body)
        throw e
    })
    await updateSpaceConfig(spaceId).catch(e => {
        console.error(`error updating space config`)
        throw e
    })
    await setDarkMode(spaceId).catch(e => {
        console.error(`error setting space to dark mode`)
        throw e
    })
    const roleName = `${username}-role`
    await createRole(roleName, [indexPattern], spaceId).catch(e => {
        console.error(`error creating role`)
        throw e
    })
    await createUser({
        email,
        username,
        fullName,
        password,
        roleName,
    }).catch(e => {
        console.error(`error creating user`)
        throw e
    })

    const sid = await getSession({
        username,
        password,
    })

    return {
        sid,
        user: await getUser(username),
    }
}

const ensureUserCanAccessRepos = async (user, fullNames) => {
    const ips = fullNames.map(fn => fn.split('/').join('-').toLowerCase()).map(ip => ([`logstash-${ip}-*`, `logstash-${ip}`]))
    await Promise.all(
        ips.flat().map(ip => createIndexPattern(ip).catch(e => {
            return ip
        }))
    )

    const username = user.toLowerCase()
    const spaceId = username
    const roleName = `${username}-role`

    const indexPattern = `logstash-${username}-*`

    await createRole(roleName, [...ips, indexPattern].flat(), spaceId).catch(e => {
        console.error(`error updating role: ${JSON.stringify([roleName, [...ips, indexPattern], spaceId])}`,)
        throw e
    })

    return true
}

const getSession = async ({ username, password }) => {
    const res = await client.post('internal/security/login', {
        json: {
            username,
            password,
        }
    })

    return res.headers['set-cookie'][0].split(';')[0].split('sid=')[1]
}

const getUser = username => (
    client.get(`internal/security/users/${username}`).json().catch(e => null)
)

const createIndexPattern = title => (
    client.post('api/saved_objects/index-pattern', {
        json: {
            attributes: {
                title,
                timeFieldName: "@timestamp",
                fields: "[]"
            },
        },
    }).json()
)

const createSpace = name => (
    client.post('api/spaces/space', {
        json: {
            name,
            id: name.split(' ').join('-'),
        },
    }).json()
)

const updateSpaceConfig = (spaceId) => {
    const endpoint = `s/${spaceId}/api/infra/graphql`
    const body = {
        "operationName": "CreateSourceConfigurationMutation",
        "variables": {
            "sourceId": "default",
            "sourceProperties": {
                "name": "Default",
                "description": "",
                "logAlias": "filebeat-*,kibana_sample_data_logs*,logstash-*",
                "metricAlias": "metricbeat-*",
                "fields": {
                    "container": "container.id",
                    "host": "host.name",
                    "pod": "kubernetes.pod.uid",
                    "tiebreaker": "_doc",
                    "timestamp": "@timestamp"
                },
                "logColumns": [
                    {
                        "timestampColumn": {
                            "id": "5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f"
                        }
                    },
                    {
                        "fieldColumn": {
                            "id": " eb9777a8-fcd3-420e-ba7d-172fff6da7a2",
                            "field": "event.dataset"
                        }
                    },
                    {
                        "messageColumn": {
                            "id": "b645d6da-824b-4723-9a2a-e8cece1645c0"
                        }
                    }
                ]
            }
        },
        "query": "mutation CreateSourceConfigurationMutation($sourceId: ID!, $sourceProperties: UpdateSourceInput!) {\n  createSource(id: $sourceId, sourceProperties: $sourceProperties) {\n    source {\n      ...InfraSourceFields\n      configuration {\n        ...SourceConfigurationFields\n      }\n      status {\n        ...SourceStatusFields\n      }\n    }\n  }\n}\n\nfragment InfraSourceFields on InfraSource {\n  id\n  version\n  updatedAt\n  origin\n}\n\nfragment SourceConfigurationFields on InfraSourceConfiguration {\n  name\n  description\n  logAlias\n  metricAlias\n  fields {\n    container\n    host\n    message\n    pod\n    tiebreaker\n    timestamp\n  }\n  logColumns {\n    ... on InfraSourceTimestampLogColumn {\n      timestampColumn {\n        id\n      }\n    }\n    ... on InfraSourceMessageLogColumn {\n      messageColumn {\n        id\n      }\n    }\n    ... on InfraSourceFieldLogColumn {\n      fieldColumn {\n        id\n        field\n      }\n    }\n  }\n}\n\nfragment SourceStatusFields on InfraSourceStatus {\n  indexFields {\n    name\n    type\n    searchable\n    aggregatable\n    displayable\n  }\n  logIndicesExist\n  metricIndicesExist\n}\n"
    }

    return client.post(endpoint, { json: body }).json()
}

const createRole = (roleName, indexPatterns, spaceId) => {
    const body = {
        "elasticsearch": {
            "cluster": [],
            "indices": [
                {
                    "names": indexPatterns,
                    "privileges": [
                        "all"
                    ]
                }
            ],
            "run_as": []
        },
        "kibana": [
            {
                "spaces": [
                    spaceId,
                ],
                "base": [],
                "feature": {
                    "logs": [
                        "all"
                    ]
                }
            }
        ]
    }

    return client.put(`api/security/role/${roleName}`, {
        json: body,
    }).json()
}

const createUser = ({
    email, username, fullName, password, roleName,
}) => (
    client.post(`internal/security/users/${username}`, {
        json: {
            email,
            username,
            password,
            full_name: fullName,
            roles: [roleName],
            enabled: true,
        }
    }).json()
)

const setDarkMode = (spaceId) => (
    client.post(`s/${spaceId}/api/kibana/settings`, {
        json: {
            changes: {
                'theme:darkMode': true,
            },
        },
    })
)

module.exports = {
    ensureKibanaUser,
    ensureUserCanAccessRepos,
}