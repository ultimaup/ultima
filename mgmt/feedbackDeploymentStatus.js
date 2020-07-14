const Action = require('./db/Action')
const Repository = require('./db/Repository')

const github = require('./github')

const getParentAction = async (actionId) => {
	let action = await Action.query().findById(actionId)
	if (action.parentId) {
		action = await Action.query().findById(action.parentId)
    }
	return action
}

const feedbackDeploymentStatus = async (actionId) => {
	const { owner, repoName } = await getParentAction(actionId)
    const { vcs } = await Repository.query().where('fullName', [owner, repoName].join('/')).first()
    console.log('feedbackDeploymentStatus', [owner, repoName].join('/'), 'vcs is', vcs)
    if (vcs === 'github') {
        return github.feedbackDeploymentStatus(actionId)
    } else {
        //
    }
}

module.exports = feedbackDeploymentStatus