import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import YAML from 'yaml'

import UltimaModal from './UltimaModal'
import CNameDebugger from './CNameDebugger'

import useDNSInfo from '../hooks/useDNSInfo'

const BranchDomains = styled.div`
    .heading {
        display: flex;
        label {
            flex: 1;
            padding-left: 2px;
        }
    }
`

const BranchDomainRow = styled.div`
    display: flex;
    label {
        font-weight: bold;
    }
`

const Module = styled.div`
    background: rgba(0,0,0,0.1);
    border: 1px solid rgba(255,255,255,0.1);
    box-sizing: border-box;
    border-radius: 4px;
    max-width: 720px;

    :not(:first-child) {
        margin-top: 12px;
    }
`

const ModuleBody = styled.div`
    padding: 16px;
`

const EmptyState = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    button {
        margin-right: 8px;
    }
`

const BranchDomainMap = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const { dnsInfo } = useDNSInfo()

    return (
        <BranchDomains>
            <h4 style={{ display: 'flex', paddingLeft: 2 }}>
                <div style={{ flex: 1, 
    display: 'flex',
    alignItems: 'center' }}>Add Custom Domains</div>
                <button className="ui button green small" onClick={e => {
                    e.preventDefault()
                    setIsOpen(true)
                }}>DNS Debugger</button>
            </h4>
            <p>To use a custom domain with Ultima add a CNAME to {dnsInfo && dnsInfo.cname} or A record to {dnsInfo && dnsInfo.ipv4} & an AAAA record to {dnsInfo && dnsInfo.ipv6}</p>
            <UltimaModal isOpen={isOpen} onRequestClose={() => setIsOpen(false)} title="DNS Debugger">
                <CNameDebugger dnsInfo={dnsInfo} />
            </UltimaModal>
            {Object.entries(value || {}).length !== 0 && (
                <BranchDomainRow className="heading">
                    <label>Branch</label>
                    <label>Custom Domain</label>
                    <button className="ui button red" style={{visibility: 'hidden', height: 0}}>x</button>
                </BranchDomainRow>
            )}
            

            {Object.entries(value || {}).map(([branch, domain]) => {
                return (
                    <BranchDomainRow>
                        <input value={branch} onChange={e => {
                            const newV = {
                                ...value,
                            }
                            delete newV[branch]
                            newV[e.target.value] = value[branch]
                            onChange(newV)
                        }} />
                        <input value={domain} onChange={e => {
                            onChange({
                                ...value,
                                [branch]: e.target.value,
                            })
                        }} />
                        <button className="ui button red" onClick={(e) => {
                            e.preventDefault()
                            const newV = {
                                ...value,
                            }
                            delete newV[branch]
                            onChange(newV)
                        }}>x</button>
                    </BranchDomainRow>
                )
            })}

            {Object.entries(value || {}).length === 0 ? (
                <EmptyState>
                    <button className="ui green button" onClick={(e) => {
                        e.preventDefault()
                        const a = Object.keys(value || {}).filter(s => s.startsWith('branch')).length
                        onChange({
                            ...value,
                            [`branch${a ? a+1 : ''}`]: 'domain.com',
                        })
                    }}>Use custom domain with a branch</button>
                </EmptyState>
            ) : (
                <button className="ui green button" onClick={(e) => {
                    e.preventDefault()
                    const a = Object.keys(value || {}).filter(s => s.startsWith('branch')).length
                    onChange({
                        ...value,
                        [`branch${a ? a+1 : ''}`]: 'domain.com',
                    })
                }}>+</button>
            )}

            
        </BranchDomains>
    )
}



const ConfigEditor = ({ ioEle }) => {
    const [value, setV] = useState({})
    const [newResourceType, setNewResourceType] = useState('api')

    useEffect(() => {
        let codeMirror
        const onChange = () => {
            const data = YAML.parse(codeMirror.getValue())
            setV(data || {})
        }
        if (ioEle) {
            codeMirror = ioEle.nextSibling && ioEle.nextSibling.CodeMirror
            if (codeMirror) {
                codeMirror.on('change', onChange)
            } else {
                let a = setInterval(() => {
                    codeMirror = ioEle.nextSibling && ioEle.nextSibling.CodeMirror
                    if (codeMirror) {
                        codeMirror.on('change', onChange)
                        clearInterval(a)
                    }
                },50)
            }

            const data = YAML.parse(ioEle.value)
            if (data) {
                setV(data)
            }
        }

        return () => {
            codeMirror && codeMirror.off('change', onChange)
        }
    }, [ioEle])

    const setValue = newValue => {
        if (!Object.keys(newValue).length) {
            ioEle.nextSibling.CodeMirror.setValue('')
        } else {
            ioEle.nextSibling.CodeMirror.setValue(YAML.stringify(newValue).split('\n').filter(l => !l.includes('{}')).join('\n'))
        }
        // window.CodeMirror.signal(ioEle.nextSibling.CodeMirror, 'keydown', { which: 32, keyCode: 32 })
        document.getElementById('commit-button').disabled = false
    }

    return (
        <div>
            <form className="ui form" onSubmit={e => e.preventDefault()} style={{ position: 'initial' }}>
                <h3 className="ui top attached header" style={{
                    position: 'absolute',
                    width: '100%',
                    zIndex: 10,
                    top: 0,
                }}>
                    Manage Project Config
                </h3>

                <div className="ui attached segment" style={{ marginTop: 42, borderBottom: 'none' }}>
                    {Object.entries(value || {}).map(([key, module]) => (
                        <Module>
                            <h3 className="ui attached header top" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                {key}
                                <button className="ui button small red" onClick={() => {
                                    const newV = {
                                        ...value,
                                    }
                                    delete newV[key]
                                    setValue(newV)
                                }}>x</button>
                            </h3>
                            <ModuleBody>
                                {(module.type === 'web' || key === 'web') && (
                                    <div className="inline required field">
                                        <strong>Website built output location</strong>
                                        <input autoFocus required value={value[key].buildLocation} onChange={e => {
                                            setValue({
                                                ...value,
                                                [key]: {
                                                    ...value[key],
                                                    buildLocation: e.target.value,
                                                }
                                            })
                                        }} />
                                    </div>
                                )}
                                {(module.type === 'api' || key === 'api') && (
                                    <div className="inline required field">
                                        <strong>Runtime</strong>
                                        <select disabled onChange={(e) => {
                                            setValue({
                                                ...value,
                                                [key]: {
                                                    ...value[key],
                                                    'runtime': e.target.value,
                                                }
                                            })
                                        }} value={value[key].runtime} className="ui search normal selection dropdown">
                                            <option value="node">Node JS</option>
                                            <option value="go">Go</option>
                                            <option value="dotnet">.net core</option>
                                        </select>
                                        <span style={{ marginLeft: 8 }}>More Coming soon</span>
                                    </div>
                                )}
                                <div className="ui divider"></div>
                                <BranchDomainMap value={value[key]['branch-domains']} onChange={v => {
                                    setValue({
                                        ...value,
                                        [key]: {
                                            ...value[key],
                                            'branch-domains': v,
                                        }
                                    })
                                }} />
                            </ModuleBody>
                        </Module>
                    ))}

                    <div className="inline field">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <label style={{ width: 150 }}>Add Module</label>
                                <select onChange={(e) => {
                                    setNewResourceType(e.target.value)
                                }} value={newResourceType} className="ui search normal selection dropdown">
                                    <option value="api">API</option>
                                    <option value="web">Website</option>
                                </select>
                            </div>
                            <button style={{ marginLeft: 12, marginTop: 12, marginBottom: 8, width: 120 }} className="ui button green" onClick={() => {
                                if (newResourceType === 'api') {
                                    setValue({
                                        ...value,
                                        api: {
                                            type: 'api',
                                            runtime: 'node',
                                        },
                                    })
                                } else {
                                    setValue({
                                        ...value,
                                        web: {
                                            type: 'web',
                                            buildLocation: '/build'
                                        },
                                    })
                                }
                            }} disabled={!!value[newResourceType]}>
                                Add
                            </button>
                            <span>(Currently max 1 API and 1 Website per project)</span>
                        </div>
                    </div>
                </div>
                
            </form>
        </div>
    )
}

export default ConfigEditor