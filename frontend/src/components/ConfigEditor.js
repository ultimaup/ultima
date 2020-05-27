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

const ConfigModule = ({ moduleKey, module, setValue, value }) => {
    const [expanded, setExpanded] = useState(false)

    return (
        <Module>
            <h3 className="ui attached header top" onClick={() => setExpanded(!expanded)} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
            }}>
                {expanded ? <i className="fa fa-caret-up" /> : <i className="fa fa-caret-down" />}&nbsp;
                {moduleKey || 'New Module'}
                <button className="ui button small red" onClick={() => {
                    const newV = {
                        ...value,
                    }
                    delete newV[moduleKey]
                    setValue(newV)
                }}>x</button>
            </h3>
            {expanded && <ModuleBody>
                {(module.type === 'web' || moduleKey === 'web') && (
                    <div className="inline required field">
                        <strong>Website built output location</strong>
                        <input autoFocus required value={value[moduleKey].buildLocation} onChange={e => {
                            setValue({
                                ...value,
                                [moduleKey]: {
                                    ...value[moduleKey],
                                    buildLocation: e.target.value,
                                }
                            })
                        }} />
                    </div>
                )}
                {(module.type === 'api' || moduleKey === 'api') && (
                    <div className="inline required field">
                        <strong>Runtime</strong>
                        <select onChange={(e) => {
                            setValue({
                                ...value,
                                [moduleKey]: {
                                    ...value[moduleKey],
                                    'runtime': e.target.value,
                                }
                            })
                        }} value={value[moduleKey].runtime} className="ui search normal selection dropdown">
                            <option value="node">Node JS</option>
                            <option value="golang">Go</option>
                            <option value="microsoft-dotnet-core">.NET Core</option>
                            <option value="elixir">Elixir</option>
                            <option value="python">Python</option>
                            <option value="rust">Rust</option>
                        </select>
                    </div>
                )}
                <div className="ui divider"></div>
                <BranchDomainMap value={value[moduleKey]['branch-domains']} onChange={v => {
                    setValue({
                        ...value,
                        [moduleKey]: {
                            ...value[moduleKey],
                            'branch-domains': v,
                        }
                    })
                }} />
            </ModuleBody>}
        </Module>
    )
}

const AddModule = ({ value, setValue }) => {
    const [newResourceType, setNewResourceType] = useState('api')
    const [expanded, setExpanded] = useState(false)
    const [resourceName, setResourceName] = useState('')

    if (!expanded) {
        return (
            <button style={{ marginLeft: 12, marginTop: 12, marginBottom: 8, width: 120 }} className="ui button green" onClick={() => setExpanded(true)}>
                Add Module
            </button>
        )
    }

    return (
        <form className="inline field" onSubmit={(e) => {
            e.preventDefault()
            if (newResourceType === 'api') {
                setValue({
                    ...value,
                    [resourceName]: {
                        type: 'api',
                        runtime: 'node',
                    },
                })
            } else {
                setValue({
                    ...value,
                    [resourceName]: {
                        type: 'web',
                        buildLocation: '/build'
                    },
                })
            }

            setExpanded(false)
            setResourceName('')
            setNewResourceType('api')
        }}>
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
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label style={{ width: 150 }}>Name</label>
                    <input className="ui search normal selection" onChange={e => setResourceName(e.target.value)} value={resourceName} />
                </div>

                <button style={{ marginLeft: 12, marginTop: 12, marginBottom: 8, width: 120 }} className="ui button green">
                    Add
                </button>
                <span style={{
                    cursor: 'pointer',
                }} onClick={() => {
                    setExpanded(false)
                    setResourceName('')
                    setNewResourceType('api')
                }}>Cancel</span>
            </div>
        </form>
    )
}

const ConfigEditor = ({ ioEle }) => {
    const [value, setV] = useState({})

    useEffect(() => {
        let model

        const onChange = () => {
            const content = model.getLinesContent().join('\n')
            const data = YAML.parse(content)
            setV(data || {})
        }

        if (ioEle) {
            model = window.monaco && window.monaco.editor.getModels()[0]
            if (model) {
                model.onDidChangeContent(onChange)
            } else {
                let a = setInterval(() => {
                    model = window.monaco && window.monaco.editor.getModels()[0]
                    if (model) {
                        model.onDidChangeContent(onChange)
                        clearInterval(a)
                    }
                },50)
            }

            const data = YAML.parse(ioEle.value)
            if (data) {
                setV(data)
            }
        }
    }, [ioEle])

    const setValue = newValue => {
        if (!Object.keys(newValue).length) {
            window.monaco.editor.getModels()[0].setValue('')
        } else {
            window.monaco.editor.getModels()[0].setValue(YAML.stringify(newValue).split('\n').filter(l => !l.includes('{}')).join('\n'))
        }
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
                        <ConfigModule moduleKey={key} key={key} module={module} value={value} setValue={setValue} />
                    ))}

                    <AddModule value={value} setValue={setValue} />
                </div>
                
            </form>
        </div>
    )
}

export default ConfigEditor