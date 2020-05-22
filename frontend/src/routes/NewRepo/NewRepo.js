import React from 'react'
import styled from 'styled-components'

import useTemplateRepos from '../../hooks/useTemplateRepos'
import useCreateRepository from '../../hooks/useCreateRepository'

const Form = styled.form`
    select {
        font-size: 13px !important;
    }
`

const NewRepo = () => {
    const { templates } = useTemplateRepos()
    const { loading, createRepository } = useCreateRepository()

    let dv = ''
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('template_id')) {
        dv = sp.get('template_id')
    }

    return (
        <Form className="ui form" onSubmit={(e) => {
            e.preventDefault()

            const { template, repo_name } = e.target
            const templateId = template.value
            const name = repo_name.value
            const isPrivate = e.target.private.checked

            if (template.value === 'blank') {
                // move to other form
                document.getElementsByName('repo_name')[1].value = name
                document.getElementsByName('private')[1].checked = isPrivate
                document.getElementById('new-repo-container').style.display = 'none'
                document.getElementById('actual-form').style.display = 'initial'
            } else {
                createRepository({
                    templateId,
                    name,
                    private: isPrivate,
                }).then((repo) => {
                    document.location.href = `/${repo.full_name}`
                }).catch(e => {
                    alert('sorry there was an issue creating your repo')
                    console.error(e)
                })
            }

            return false
        }}>
            <h3 className="ui top attached header">
                New Repository
            </h3>
            <div className="ui attached segment">
                <div className="inline required field">
                    <label>Template</label>
                    <select required className="ui search normal selection dropdown" name="template" defaultValue={dv}>
                        <option value="" disabled hidden>Choose a template</option>
                        {templates && templates.map(({ id, name }) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                        <option value="blank">No Template</option>
                    </select>
                </div>
                <div className="inline required field">
                    <label htmlFor="repo_name">Name</label>
                    <input name="repo_name" autoFocus required />
                </div>
                <div className="inline field">
                    <label>Private</label>
                    <div className="ui checkbox">
                        <input name="private" type="checkbox" defaultChecked />
                        <label>Hide this repository from other people</label>
                    </div>
                </div>
                <br/>
                <div className="inline field">
                    <label></label>
                    <button className="ui green button" disabled={loading}>
                        Create Repository
                    </button>
                    <a className="ui button" href="/">Cancel</a>
                </div>
            </div>
        </Form>
    )
}

export default NewRepo