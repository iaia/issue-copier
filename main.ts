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
            res.data.forEach((v, index, array) => {
                core.debug(`unassigned issue: title: ${v.title} #${v.number}, ${v.created_at}`);
            })
        })
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message)
    }
}

run()
