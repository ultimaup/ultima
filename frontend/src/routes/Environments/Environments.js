import React from 'react'
import styled from 'styled-components'
import moment from 'moment'

import useEnvironments from '../../hooks/useEnvironments'

const Env = ({ id, stage, createdAt, className }) => {
    return (
        <div className={className}>
            <h4>{stage}</h4>
            <span>created at {moment(createdAt).format()}</span>
        </div>
    )
}

const Environment = styled(Env)`
    margin-bottom: 28px;

    h4 {
        margin-bottom: 0;
    }
`

const Environments = ({ owner, repoName }) => {
    const { loading, error, environments } = useEnvironments({ owner, repoName })

    if (loading) {
        return 'loading...'
    }

    if (error) {
        return error.message
    }

    let r = [...environments].reverse()

    return (
        <div>
            {r.map(env => (
                <Environment key={env.id} {...env} />
            ))}
        </div>
    )
}

export default Environments