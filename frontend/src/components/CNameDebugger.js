import React, { useState } from 'react'
import styled from 'styled-components/macro'

import useQueryCName from '../hooks/useQueryCName'
import { Form, Button } from './Layout'

const RecordType = styled.div`
    display: inline-block;
    padding: 4px;
    text-transform: uppercase;
    width: 60px;
    text-align: center;
    margin-right: 8px;
    margin-top: 12px;
    color: rgba(0,0,0,0.8);

    background: ${({ children }) => {
        switch (children) {
            case 'A':
                return '#0984e3'
            case 'AAAA':
                return '#6c5ce7'
            default:
            case 'CNAME':
                return '#fd79a8'
        }
    }};
`

const Results = ({ ipv4, ipv6, cname }) => {
    return (
        <div>
            {cname && <div><RecordType>CNAME</RecordType>{cname.join(', ')}</div>}
            {ipv4 && <div><RecordType>A</RecordType>{ipv4.join(', ')}</div>}
            {ipv6 && <div><RecordType>AAAA</RecordType>{ipv6.join(', ')}</div>}
        </div>
    )
}

const CNameForm = styled(Form)`
    input {
        flex: 1;
    }
`

const CNameDebugger = ({ dnsInfo }) => {
    const { queryCName, results } = useQueryCName()
    const [value, setValue] = useState('')

    return (
        <>
            <p>Enter a domain to check the DNS records are correct.</p>
            <p>To use a custom domain with Ultima add a CNAME to {dnsInfo && dnsInfo.cname} or A record to {dnsInfo && dnsInfo.ipv4} & an AAAA record to {dnsInfo && dnsInfo.ipv6}</p>
            <CNameForm onSubmit={e => {
                e.preventDefault()
                if (value.startsWith('http')) {
                    queryCName(value.split('//')[1].split('/')[0])
                } else {
                    queryCName(value)
                }
            }} style={{ display: 'flex' }}>
                <input placeholder="domain.com" value={value} onChange={e => setValue(e.target.value)} />
                <Button disabled={!value}>Debug</Button>
            </CNameForm>
            {results && (
                <>
                    <h4>Results for {results.id}:</h4>
                    <div style={{ marginTop: 8 }}>
                        <strong>Google DNS</strong>
                        <Results {...results.googleResult} />
                    </div>
                    <div style={{ marginTop: 8 }}>
                        <strong>Cloudflare DNS</strong>
                        <Results {...results.cfResult} />
                    </div>
                </>
            )}
        </>
    )
}

export default CNameDebugger