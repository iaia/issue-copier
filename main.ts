import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
    try {
        const githubToken = core.getInput('github access token', {required: true})
        const octokit = github.getOctokit(githubToken)

        octokit.rest.issues.listForRepo({
            owner: 'iaia',
            repo: 'issue-copier',
            assignee: 'none'
        }).then((res) => {
            const current = new Date()
            res.data.forEach((issue, index, array) => {
                const labels = issue.labels.map(label => {
                        if (typeof label === 'string') {
                            return label
                        } else {
                            return label.name
                        }
                    }
                )
                const supportLimitMinutes = checkSupportLimit(labels)

                const supportLimitDateTime = new Date(issue.created_at)
                supportLimitDateTime.setMinutes(supportLimitDateTime.getMinutes() + supportLimitMinutes)

                if (supportLimitDateTime <= current) {
                    core.debug(`unassigned issue: title: ${issue.title} #${issue.number}`);
                }
            })
        })
    }
    catch
        (error)
    {
        if (error instanceof Error) core.setFailed(error.message)
    }
}

function checkSupportLimit(labels: (string | undefined)[]) {
    const emergency = labels.find((label) =>
        label == 'emergency'
    )
    if (typeof emergency === "undefined") {
        return 60
    } else {
        return 5
    }
}

run()
