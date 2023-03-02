import * as core from '@actions/core';
import * as github from '@actions/github';
import {GitHub} from "@actions/github/lib/utils";

async function run() {
    try {
        const githubToken = core.getInput('github access token', {required: true})
        const octokit = github.getOctokit(githubToken)

        // https://docs.github.com/ja/rest/issues/issues?apiVersion=2022-11-28#list-repository-issues
        octokit.rest.issues.listForRepo({
            owner: 'iaia',
            repo: 'issue-copier',
            assignee: 'none',
        }).then((res) => {
            const current = new Date()
            res.data.forEach((issue, index, array) => {
                core.debug(`unassigned issue: ${issue.title} #${issue.number}`);

                const labels = issue.labels.map(label => {
                        if (typeof label === 'string') {
                            return label
                        } else {
                            return label.name
                        }
                    }
                )

                if (labels.find((label) => label === 'escalated')) {
                    return
                }
                if (labels.length == 0) {
                    return
                }

                const supportLimitMinutes = checkSupportLimit(labels)

                const supportLimitDateTime = new Date(issue.created_at)
                supportLimitDateTime.setMinutes(supportLimitDateTime.getMinutes() + supportLimitMinutes)

                if (supportLimitDateTime <= current) {
                    copyIssue(
                        octokit,
                        issue.title,
                        issue.body || '',
                        issue.html_url,
                        issue.number,
                    )
                }
            })
        })
    } catch (error) {
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

async function copyIssue(
    octokit: InstanceType<typeof GitHub>,
    oldIssueTitle: string,
    oldIssueBody: string,
    oldIssueUrl: string,
    oldIssueNumber: number,
) {
    const oldIssueComments = await getComments(octokit, oldIssueNumber)
    const joinedOldComments = oldIssueComments.join("\n")

    const issueBody = `
ref: ${oldIssueUrl}

## body

${oldIssueBody}

## comments
${joinedOldComments}
    `

    await octokit.rest.issues.create({
        owner: 'iaia',
        repo: 'issue-copier',
        title: oldIssueTitle,
        body: issueBody,
    }).then((res) => {
        let createdIssueUrl = res.data.html_url
        core.debug(`create issue! ${createdIssueUrl}`)

        octokit.rest.issues.createComment({
            owner: 'iaia',
            repo: 'issue-copier',
            issue_number: oldIssueNumber,
            body: `create issue! ${createdIssueUrl}`
        })
        octokit.rest.issues.addLabels({
            owner: 'iaia',
            repo: 'issue-copier',
            issue_number: oldIssueNumber,
            labels: ['escalated'],
        })
    })
}

async function getComments(
    octokit: InstanceType<typeof GitHub>,
    issueNumber: number
): Promise<string[]> {
    return octokit.rest.issues.listComments({
        owner: 'iaia',
        repo: 'issue-copier',
        issue_number: issueNumber,
    }).then((res) => {
        return res.data.map((v) => {
            return v.body || ''
        })
    })
}

run()
