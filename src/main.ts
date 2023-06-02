import * as core from '@actions/core';
import * as github from '@actions/github';
import {GitHub} from "@actions/github/lib/utils";

const ESCALATION_ISSUE_LABEL = 'escalation'
const IGNORE_ISSUE_LABEL = 'escalated'
const EMERGENCY_ISSUE_LABEL = 'emergency'

export async function run() {
  core.debug('start!');

  try {
    const githubSetting = new GithubSetting(
      core.getInput('github owner', {required: true}),
      core.getInput('github repository', {required: true}),
      core.getInput('github dest repository', {required: true}),
      core.getInput('github access token', {required: true}),
    )

    const octokit = githubSetting.createClient()
    const current = new Date()
    const yesterday = new Date()
    yesterday.setDate(current.getDate() - 1)
    const isoDate = yesterday.toISOString().replace(/\.\d{3}Z$/, "Z");

    // https://docs.github.com/ja/rest/issues/issues?apiVersion=2022-11-28#list-repository-issues
    octokit.rest.issues.listForRepo({
      owner: githubSetting.owner,
      repo: githubSetting.repository,
      since: isoDate,
      labels: ESCALATION_ISSUE_LABEL,
    }).then((res) => {
      res.data.forEach((issue, index, array) => {
        core.debug(`escalation target issue: ${issue.title} #${issue.number}`);

        const labels = issue.labels.map(label => {
            if (typeof label === 'string') {
              return label
            } else {
              return label.name
            }
          }
        )

        if (labels.length == 0) {
          return
        }
        if (labels.find((label) => label === IGNORE_ISSUE_LABEL)) {
          return
        }

        const supportLimitMinutes = checkSupportLimit(labels)

        const supportLimitDateTime = new Date(issue.created_at)
        supportLimitDateTime.setMinutes(supportLimitDateTime.getMinutes() + supportLimitMinutes)

        if (supportLimitDateTime <= current) {
          copyIssue(
            octokit,
            githubSetting,
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
    label == EMERGENCY_ISSUE_LABEL
  )
  if (typeof emergency === "undefined") {
    return 60
  } else {
    return 5
  }
}

async function copyIssue(
  octokit: InstanceType<typeof GitHub>,
  githubSetting: GithubSetting,
  oldIssueTitle: string,
  oldIssueBody: string,
  oldIssueUrl: string,
  oldIssueNumber: number,
) {
  const oldIssueComments = await getComments(octokit, githubSetting, oldIssueNumber)
  const joinedOldComments = oldIssueComments.join("\n")

  const issueBody = `
ref: ${oldIssueUrl}

## body

${oldIssueBody}

## comments
${joinedOldComments}
    `

  await octokit.rest.issues.create({
    owner: githubSetting.owner,
    repo: githubSetting.destRepository,
    title: oldIssueTitle,
    body: issueBody,
  }).then((res) => {
    let createdIssueUrl = res.data.html_url
    core.debug(`create issue! ${createdIssueUrl}`)

    octokit.rest.issues.createComment({
      owner: githubSetting.owner,
      repo: githubSetting.destRepository,
      issue_number: oldIssueNumber,
      body: `create issue! ${createdIssueUrl}`
    })
    octokit.rest.issues.addLabels({
      owner: githubSetting.owner,
      repo: githubSetting.repository,
      issue_number: oldIssueNumber,
      labels: [IGNORE_ISSUE_LABEL],
    })
    octokit.rest.issues.removeLabel({
      owner: githubSetting.owner,
      repo: githubSetting.repository,
      issue_number: oldIssueNumber,
      name: ESCALATION_ISSUE_LABEL,
    })
  })
}

async function getComments(
  octokit: InstanceType<typeof GitHub>,
  githubSetting: GithubSetting,
  issueNumber: number
): Promise<string[]> {
  return octokit.rest.issues.listComments({
    owner: githubSetting.owner,
    repo: githubSetting.repository,
    issue_number: issueNumber,
  }).then((res) => {
    return res.data.map((v) => {
      return v.body || ''
    })
  })
}

class GithubSetting {
  constructor(
    public owner: string,
    public repository: string,
    public destRepository: string,
    private token: string,
  ) {
    core.setSecret(token)
  }

  createClient() {
    return github.getOctokit(this.token)
  }
}
