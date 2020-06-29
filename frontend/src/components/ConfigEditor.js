import React, { useEffect, useState } from 'react'
import styled from 'styled-components/macro'
import YAML from 'yaml'

import UltimaModal from './UltimaModal'
import CNameDebugger from './CNameDebugger'
import { Button, Form, FormDiv, InputGroup, Divider, CloseButton, CircleButton, Hint, MultiListLabel } from './Layout'
import { Header } from './RepoList/RepoList'
import Octicon, { ChevronUp, ChevronDown, Plus } from '@primer/octicons-react'

import useDNSInfo from '../hooks/useDNSInfo'
import useTemplates from '../hooks/useTemplates'
import langs from '../utils/langs'

const BranchDomains = styled.div`
    h3 {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
    }
    p {
        font-style: normal;
        font-weight: normal;
        font-size: 14px;
        line-height: 17px;
        /* identical to box height */

        letter-spacing: 0.1px;

        color: #9E9E9E;
        margin-bottom: 12px;
    }
`

const BranchDomainRow = styled.div`
    display: flex;
    label {
        font-weight: bold;
    }
`

const Module = styled(FormDiv)`
    background: #292929;
    border-radius: 5px;
    box-sizing: border-box;

    :not(:first-child) {
        margin-top: 12px;
    }

    h3 {
        font-weight: 600;
        font-size: 16px;
        line-height: 19px;
        letter-spacing: 0.1px;

        color: #9E9E9E;
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
            <h3>Add Custom Domains
                <Button onClick={e => {
                    e.preventDefault()
                    setIsOpen(true)
                }}>DNS Debugger</Button>
            </h3>
            <p>To use a custom domain with Ultima add a CNAME to {dnsInfo && dnsInfo.cname} or A record to {dnsInfo && dnsInfo.ipv4} & an AAAA record to {dnsInfo && dnsInfo.ipv6}</p>
            <UltimaModal isOpen={isOpen} onRequestClose={() => setIsOpen(false)} title="DNS Debugger">
                <CNameDebugger dnsInfo={dnsInfo} />
            </UltimaModal>
            {Object.entries(value || {}).length !== 0 && (
                <BranchDomainRow className="heading">
                    <label>Branch</label>
                    <label>Custom Domain</label>
                    <CloseButton style={{visibility: 'hidden', height: 0}} />
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
                        <CloseButton type="danger" onClick={(e) => {
                            e.preventDefault()
                            const newV = {
                                ...value,
                            }
                            delete newV[branch]
                            onChange(newV)
                        }} />
                    </BranchDomainRow>
                )
            })}

            {Object.entries(value || {}).length === 0 ? (
                <EmptyState>
                    <Button onClick={(e) => {
                        e.preventDefault()
                        const a = Object.keys(value || {}).filter(s => s.startsWith('branch')).length
                        onChange({
                            ...value,
                            [`branch${a ? a+1 : ''}`]: 'domain.com',
                        })
                    }}>Use custom domain with a branch</Button>
                </EmptyState>
            ) : (
                <CircleButton onClick={(e) => {
                    e.preventDefault()
                    const a = Object.keys(value || {}).filter(s => s.startsWith('branch')).length
                    onChange({
                        ...value,
                        [`branch${a ? a+1 : ''}`]: 'domain.com',
                    })
                }}>
                    <Octicon icon={Plus} />
                </CircleButton>
            )}
        </BranchDomains>
    )
}

const StyledMultiList = styled.div`
    display: flex;
    flex-direction: column;
    padding-bottom: 24px;
    ${Button} {
        width: 223px;
    }
    ${InputGroup} {
        display: flex;

        ${CircleButton} {
            margin-left: 8px;
        }
    }
`

const MultiList = ({ value, onChange, placeholder, ...props }) => (
    <StyledMultiList>
        {value.map((val, i) => (
            <InputGroup>
                <label />
                <input autoFocus key={i} {...props} value={val} placeholder={placeholder} onChange={e => {
                    const newValue = [...value]
                    newValue[i] = e.target.value
                    onChange({
                        target: {
                            value: newValue,
                        }
                    })
                }} />
                <CloseButton onClick={() => {
                    onChange({
                        target: {
                            value: value.filter(v => v !== val),
                        },
                    })
                }} />
            </InputGroup>
        ))}
        <InputGroup>
            <label />
            <Button onClick={(e) => {
                e.preventDefault()
                onChange({
                    target: {
                        value: [...value, ''],
                    },
                })
            }}>
                Add file name or pattern
            </Button>
        </InputGroup>
    </StyledMultiList>
)

const ModuleName = styled.div`
    flex: 1;
    text-align: left;
    padding-left: 12px;
    padding-right: 12px;
`

const ConfigModule = ({ moduleKey, module, setValue, value }) => {
    const [expanded, setExpanded] = useState(true)
    const { loading, templates } = useTemplates()

    return (
        <Module>
            <Header onClick={() => setExpanded(!expanded)} style={{
                cursor: 'pointer',
            }}>
                <CircleButton>
                    <Octicon icon={expanded ? ChevronUp : ChevronDown} />
                </CircleButton>
                <ModuleName>
                    {moduleKey || 'New Resource'}
                </ModuleName>
                <CloseButton onClick={() => {
                    const newV = {
                        ...value,
                    }
                    delete newV[moduleKey]
                    setValue(newV)
                }} />
            </Header>
            {expanded && value[moduleKey].type !== 'bucket' && <ModuleBody>
                <InputGroup>
                    <label>Repository Subdirectory</label>
                    <input placeholder="." value={value[moduleKey].directory} onChange={e => {
                        setValue({
                            ...value,
                            [moduleKey]: {
                                ...value[moduleKey],
                                directory: e.target.value || undefined,
                            }
                        })
                    }} />
                </InputGroup>

                {(module.type === 'web' || moduleKey === 'web') && (
                    <InputGroup>
                        <label>Website built output location</label>
                        <input autoFocus required value={value[moduleKey].buildLocation} onChange={e => {
                            setValue({
                                ...value,
                                [moduleKey]: {
                                    ...value[moduleKey],
                                    buildLocation: e.target.value,
                                }
                            })
                        }} />
                    </InputGroup>
                )}
                {(module.type === 'api' || moduleKey === 'api') && (
                    <InputGroup>
                        <label>Runtime</label>
                        <select onChange={(e) => {
                            setValue({
                                ...value,
                                [moduleKey]: {
                                    ...value[moduleKey],
                                    'runtime': e.target.value,
                                }
                            })
                        }} value={value[moduleKey].runtime} className="ui search normal selection dropdown">
                            {langs.filter(({ runtime }) => runtime !== 'html').map(({ name, runtime }) => (
                                <option key={runtime} value={runtime}>{name}</option>
                            ))}
                        </select>
                    </InputGroup>
                )}

                <Divider />
                <h3>Build Steps</h3>
                
                <InputGroup>
                    <label>Install</label>
                    <input placeholder="# skip" required value={value[moduleKey].install && value[moduleKey].install.command || ''} onChange={e => {
                        setValue({
                            ...value,
                            [moduleKey]: {
                                ...value[moduleKey],
                                install: {
                                    ...(value[moduleKey].install || {}),
                                    command: e.target.value || undefined,
                                },
                            }
                        })
                    }} />
                </InputGroup>

                <InputGroup>
                    <label>Build</label>
                    <input placeholder="# skip" value={value[moduleKey].build} onChange={e => {
                        setValue({
                            ...value,
                            [moduleKey]: {
                                ...value[moduleKey],
                                build: e.target.value || undefined,
                            }
                        })
                    }} />
                </InputGroup>

                <InputGroup>
                    <label>Test</label>
                    <input placeholder="# skip" value={value[moduleKey].test} onChange={e => {
                        setValue({
                            ...value,
                            [moduleKey]: {
                                ...value[moduleKey],
                                test: e.target.value || undefined,
                            }
                        })
                    }} />
                </InputGroup>

                <InputGroup>
                    <label>Start</label>
                    <input placeholder="# skip" required={module.type === 'api' || moduleKey === 'api'} value={value[moduleKey].start} onChange={e => {
                        setValue({
                            ...value,
                            [moduleKey]: {
                                ...value[moduleKey],
                                start: e.target.value || undefined,
                            }
                        })
                    }} />
                </InputGroup>

                <Divider />

                <h3>Development Settings</h3>

                <InputGroup>
                    <label>Dev Command</label>
                    <input placeholder="# skip" required={module.type !== 'web'} value={value[moduleKey].dev && value[moduleKey].dev.command || ''} onChange={e => {
                        setValue({
                            ...value,
                            [moduleKey]: {
                                ...value[moduleKey],
                                dev: {
                                    ...(value[moduleKey].dev || {}),
                                    command: e.target.value || undefined,
                                },
                            }
                        })
                    }} />
                </InputGroup>

                <InputGroup>
                    <MultiListLabel>Re-run when these files change</MultiListLabel>
                    <Hint>You can use <a href="https://commandbox.ortusbooks.com/usage/parameters/globbing-patterns" target="_blank">glob patterns</a></Hint>
                    <MultiList placeholder="**/*.js" required value={value[moduleKey].dev && value[moduleKey].dev.watch || []} onChange={e => {
                        setValue({
                            ...value,
                            [moduleKey]: {
                                ...value[moduleKey],
                                dev: {
                                    ...(value[moduleKey].dev || {}),
                                    watch: e.target.value || undefined,
                                },
                            }
                        })
                    }} />
                </InputGroup>

                <InputGroup>
                    <MultiListLabel>Don't re-run when these files change</MultiListLabel>
                    <Hint>You can use <a href="https://commandbox.ortusbooks.com/usage/parameters/globbing-patterns" target="_blank">glob patterns</a></Hint>
                    <MultiList placeholder="**/*.js" required value={value[moduleKey].dev && value[moduleKey].dev.ignore || []} onChange={e => {
                        setValue({
                            ...value,
                            [moduleKey]: {
                                ...value[moduleKey],
                                dev: {
                                    ...(value[moduleKey].dev || {}),
                                    ignore: e.target.value || undefined,
                                },
                            }
                        })
                    }} />
                </InputGroup>

                <InputGroup>
                    <MultiListLabel>Don't sync these files to the dev environment</MultiListLabel>
                    <Hint>You can use <a href="https://commandbox.ortusbooks.com/usage/parameters/globbing-patterns" target="_blank">glob patterns</a></Hint>
                    <MultiList placeholder="dependency_folder" value={value[moduleKey].dev && value[moduleKey].dev['sync-ignore'] || []} onChange={e => {
                        setValue({
                            ...value,
                            [moduleKey]: {
                                ...value[moduleKey],
                                dev: {
                                    ...(value[moduleKey].dev || {}),
                                    'sync-ignore': e.target.value || undefined,
                                },
                            }
                        })
                    }} />
                </InputGroup>

                <InputGroup>
                    <MultiListLabel>Run Install when these files change</MultiListLabel>
                    <Hint>You can use <a href="https://commandbox.ortusbooks.com/usage/parameters/globbing-patterns" target="_blank">glob patterns</a></Hint>
                    <MultiList placeholder="*.lock" value={value[moduleKey].install && value[moduleKey].install.watch || []} onChange={e => {
                        setValue({
                            ...value,
                            [moduleKey]: {
                                ...value[moduleKey],
                                install: {
                                    ...(value[moduleKey].install || {}),
                                    watch: e.target.value || undefined,
                                },
                            }
                        })
                    }} />
                </InputGroup>

                <Divider />
                <BranchDomainMap value={value[moduleKey]['branch-domains']} onChange={v => {
                    setValue({
                        ...value,
                        [moduleKey]: {
                            ...value[moduleKey],
                            'branch-domains': v || undefined,
                        }
                    })
                }} />
            </ModuleBody>}
        </Module>
    )
}

const AddModuleContainer = styled(Module)`
    ${Button} {
        width: 223px;
    }
`

const AddModule = ({ value, setValue }) => {
    const { loading, templates } = useTemplates()
    const [newResourceType, setNewResourceType] = useState('api')
    const [expanded, setExpanded] = useState(false)
    const [resourceName, setResourceName] = useState('')
    const [templateId, setTemplateId] = useState(null)

    return (
        <AddModuleContainer>
            <Header onClick={() => setExpanded(!expanded)} style={{
                cursor: 'pointer',
            }}>
                <CircleButton>
                    <Octicon icon={Plus} />
                </CircleButton>
                <ModuleName>
                    Add New Resource
                </ModuleName>
                <CloseButton onClick={() => {
                    setExpanded(false)
                    setResourceName('')
                    setNewResourceType('api')
                }} />
            </Header>
            {expanded && (
                <ModuleBody>
                    <Form onSubmit={(e) => {
                        e.preventDefault()
                        if (newResourceType === 'api') {
                            setValue({
                                ...value,
                                [resourceName]: {
                                    type: 'api',
                                    runtime: 'node',
                                    ...(templateId ? templates.find(({ id }) => templateId === id).template : {}),
                                    id: undefined,
                                    name: undefined,
                                },
                            })
                        } else if (newResourceType === 'web') {
                            setValue({
                                ...value,
                                [resourceName]: {
                                    type: 'web',
                                    buildLocation: '/build'
                                },
                            })
                        } else if (newResourceType === 'bucket') {
                            setValue({
                                ...value,
                                [resourceName]: {
                                    type: 'bucket',
                                },
                            })
                        }

                        setExpanded(false)
                        setResourceName('')
                        setNewResourceType('api')
                    }}>
                        <InputGroup>
                            <label>Resource Type</label>
                            <select onChange={(e) => {
                                setNewResourceType(e.target.value)
                            }} value={newResourceType}>
                                <option value="api">API</option>
                                <option value="web">Website</option>
                                <option value="bucket">Bucket</option>
                            </select>
                        </InputGroup>
                        <InputGroup>
                            <label>Resource Name</label>
                            <input onChange={e => setResourceName(e.target.value)} value={resourceName} />
                        </InputGroup>
                        {newResourceType === 'api' && (
                            <InputGroup>
                                <label>Template</label>
                                <select onChange={e => setTemplateId(e.target.value)} value={templateId}>
                                    <option value="">No Template</option>
                                    {templates && templates.map(({ id, name }) => (
                                        <option key={id} value={id}>{name[0].toUpperCase()}{name.substring(1)}</option>
                                    ))}
                                </select>
                            </InputGroup>
                        )}
                        <InputGroup>
                            <label />
                            <Button disabled={!resourceName}>
                                Add Resource
                            </Button>
                        </InputGroup>
                    </Form>        
                </ModuleBody>
            )}
        </AddModuleContainer>
    )
}

const ConfigEmptyState = styled.div`
    color: ${({ theme: { offWhite } }) => offWhite};
    text-align: center;
    padding-top: 32px;
    padding-bottom: 24px;
`

const ModulesContainer = styled.div`
    padding: 21px;
    ${Module}:not(:first-child) {
        margin-top: 26px;
    }
`

export const ControlledConfigEditor = ({ value, setValue }) => {
    const [data, setD] = useState({})
    
    useEffect(() => {
        setD(value ? YAML.parse(value) : {})
    }, [value])

    const setData = (newValue) => {
        if (!Object.keys(newValue).length) {
            return setValue('')
        }

        const v = YAML.stringify(newValue).split('\n').filter(l => !l.includes('{}') && !l.endsWith('null')).join('\n')
        setValue(v)
    }

    return (
        <>
            <ModulesContainer>
                {Object.entries(data || {}).map(([key, module]) => (
                    <ConfigModule moduleKey={key} key={key} module={module} value={data} setValue={setData} />
                ))}
                {Object.keys(data).length === 0 ? (
                    <ConfigEmptyState>
                        To get started, add a resource to your environment
                    </ConfigEmptyState>
                ) : null}
            
                <AddModule value={data} setValue={setData} />
            </ModulesContainer>
        </>
    )
}