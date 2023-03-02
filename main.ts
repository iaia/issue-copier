import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
    try {
        const githubToken = core.getInput('github access token', { required: true })
        const octokit = github.getOctokit(githubToken)

        octokit.rest.issues.listForRepo({
            owner: 'iaia',
            repo: 'issue-copier',
            assignee: 'none'
        }).then((res) => {
            const current = new Date()
            res.data.forEach((issue, index, array) => {
                const supportLimitDateTime = new Date(issue.created_at)
                supportLimitDateTime.setMinutes(supportLimitDateTime.getMinutes() + 5)

                if(supportLimitDateTime <= current) {
                    core.debug(`unassigned issue: title: ${issue.title} #${issue.number}`);
                }
            })
        })
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message)
    }
}

run()
