import * as core from '@actions/core';
import * as github from '@actions/github';
import {GitHub} from "@actions/github/lib/utils";
import {GithubActions, Runner} from "./types";
import {
  RestEndpointMethodTypes
} from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types";

const ESCALATION_ISSUE_LABEL = 'escalation'
const IGNORE_ISSUE_LABEL = 'escalated'
const EMERGENCY_ISSUE_LABEL = 'emergency'

export async function run(
  runner: Runner,
) {
  core.debug(`start! on ${runner.description}`)

  const githubSetting = new GithubSetting(
    runner,
    core.getInput('github owner', {required: true}),
    core.getInput('github repository', {required: true}),
    core.getInput('github dest repository', {required: true}),
    core.getInput('github access token', {required: true}),
  )

  const octokit = githubSetting.createClient()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const isoDate = yesterday.toISOString().replace(/\.\d{3}Z$/, "Z");

  core.debug(`find ${githubSetting.owner}/${githubSetting.repository}, since: ${isoDate}, labels: ${ESCALATION_ISSUE_LABEL}`)

  try {
    // https://docs.github.com/ja/rest/issues/issues?apiVersion=2022-11-28#list-repository-issues
    const res = await octokit.rest.issues.listForRepo({
      owner: githubSetting.owner,
      repo: githubSetting.repository,
      since: isoDate,
      labels: ESCALATION_ISSUE_LABEL,
    })

    await findIssueToEscalate(res, octokit, githubSetting)
  } catch (error) {
    core.debug('error occurred')
    if (error instanceof Error) core.setFailed(error.message)
  }

  core.debug(`finish!`)
}

async function findIssueToEscalate(
  res: RestEndpointMethodTypes["issues"]["listForRepo"]["response"],
  octokit: InstanceType<typeof GitHub>,
  githubSetting: GithubSetting,
) {
  core.debug(`found issues ${res.data.length}`);

  const current = new Date()
  const targetIssues: any[] = []

  res.data.forEach((issue, index, array) => {
    core.debug(`found issue: ${issue.title} #${issue.number}`);

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
      targetIssues.push(issue)
      issue
    }
  })

  await Promise.all(
    targetIssues.map(async issue => await copyIssue(
        octokit,
        githubSetting,
        issue.title,
        issue.body || '',
        issue.html_url,
        issue.number,
      )
    )
  )
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

  const res = await octokit.rest.issues.create({
    owner: githubSetting.owner,
    repo: githubSetting.destRepository,
    title: oldIssueTitle,
    body: issueBody,
  })
  let createdIssueUrl = res.data.html_url
  core.debug(`create issue! ${createdIssueUrl}`)

  await octokit.rest.issues.createComment({
    owner: githubSetting.owner,
    repo: githubSetting.repository,
    issue_number: oldIssueNumber,
    body: `create issue! ${createdIssueUrl}`
  })
  await octokit.rest.issues.addLabels({
    owner: githubSetting.owner,
    repo: githubSetting.repository,
    issue_number: oldIssueNumber,
    labels: [IGNORE_ISSUE_LABEL],
  })
  await octokit.rest.issues.removeLabel({
    owner: githubSetting.owner,
    repo: githubSetting.repository,
    issue_number: oldIssueNumber,
    name: ESCALATION_ISSUE_LABEL,
  })
}

async function getComments(
  octokit: InstanceType<typeof GitHub>,
  githubSetting: GithubSetting,
  issueNumber: number
): Promise<string[]> {
  const res = await octokit.rest.issues.listComments({
    owner: githubSetting.owner,
    repo: githubSetting.repository,
    issue_number: issueNumber,
  })
  return res.data.map((v) => {
    return v.body || ''
  })
}

class GithubSetting {
  constructor(
    runner: Runner,
    public owner: string,
    public repository: string,
    public destRepository: string,
    private token: string,
  ) {
    if (runner == GithubActions) {
      core.setSecret(token)
    }
  }

  createClient() {
    return github.getOctokit(this.token)
  }
}
