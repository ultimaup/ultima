import React from 'react'
import styled from 'styled-components'

import { gql, useMutation } from '@apollo/client'

import useUsers from '../../hooks/useUsers'
import Loading from '../../components/Loading'

const ACTIVATE_USER = gql`
  mutation activateUser($id: ID, $activated: Boolean) {
    activateUser(id: $id, activated: $activated) {
        id
        username
        imageUrl
        activated
    }
  }
`

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;

    h2 {
        margin-bottom: 32px;
        margin-top: 16px;
    }
    
    ul {
        li {
            display: flex;
            align-items: center;
            margin-top: 16px;
        }
    }
    
    h3 {
        font-weight: bold;
        margin-top: 32px;
    }
`

const User = ({ id, username, imageUrl, activated }) => {
    const [activateUser, { loading }] = useMutation(ACTIVATE_USER)

    return (
        <li>
            <img src={imageUrl} alt={`${username}'s profile pic`} style={{ width: 64, height: 64, marginRight: 16 }} />
            <a href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer">{username}</a>
            <button style={{ marginLeft: 16 }} disabled={loading} onClick={(e) => {
                e.preventDefault()
                activateUser({ variables: { id, activated: !activated } })
            }}>{
                activated ? 'deactivate' : 'activate'
            }</button>
        </li>
    )
}

const WaitlistAdmin = () => {
    const { loading, error, users } = useUsers()

    if (loading) {
        return <Loading />
    }

    if (error) {
        return <p>error: {error.message}</p>
    }

    return (
        <Container>
            <h2>(de)activate users</h2>
            <h3>Deactivated users</h3>
            <ul>
                {users.filter(u => !u.activated).map(user => (
                    <User key={user.id} {...user} />
                ))}
            </ul>
            <h3>Activated users</h3>
            <ul>
                {users.filter(u => u.activated).map(user => (
                    <User key={user.id} {...user} />
                ))}
            </ul>
        </Container>
    )
}

export default WaitlistAdmin