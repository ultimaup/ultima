import React, { useEffect, useState } from 'react'
import YAML from 'yaml'

const ConfigEditor = ({ ioEle }) => {
    const [value, setV] = useState({})

    useEffect(() => {
        const c = (e) => {
            const data = YAML.parse(e.target.value)
            setV(data)
        }
        if (ioEle) {
            ioEle.nextSibling.style.display = 'none'
            const data = YAML.parse(ioEle.value)
            setV(data)
            
            
            ioEle.addEventListener('change', c)
        }
        

        return () => {
            ioEle && ioEle.removeEventListener('change', c)
        }
    }, [ioEle])

    const setValue = newValue => {
        if (!Object.keys(newValue).length) {
            ioEle.value = ''
        } else {
            ioEle.value = YAML.stringify(newValue)
        }
        setV(newValue)
    }

    // has a website? y/n
        // where is the built result?
    
    // branch-domains
        // debugger
        // branch -> domain

    return (
        <div className="repository new repo" style={{ backgroundColor: '#383c4a', border: 'none' }}>
            <form className="ui form">
                <h3 className="ui top attached header">
                    Edit Config
                </h3>
                
                <div className="ui attached segment">
                    
                    <div className="inline field">
                        <label>Includes a website</label>
                        <div className="ui checkbox">
                            <input name="hasWeb" type="checkbox" checked={!!value.web} onChange={e => {
                                if (e.target.checked) {
                                    setValue({
                                        ...value,
                                        web: {
                                            buildLocation: '/build'
                                        },
                                    })
                                } else {
                                    const newV = {
                                        ...value,
                                    }
                                    delete newV.web
                                    setValue(newV)
                                }
                            }} />
                            <label>This project contains a website</label>
                        </div>
                    </div>

                    {value.web && (
                        <>
                            <div className="inline required field">
                                <label>Website built output location</label>
                                <input autoFocus required value={value.web.buildLocation} />
                            </div>
                        </>
                    )}

                </div>
                
            </form>
        </div>
    )
}

export default ConfigEditor