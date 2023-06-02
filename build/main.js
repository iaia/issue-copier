"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const ESCALATION_ISSUE_LABEL = 'escalation';
const IGNORE_ISSUE_LABEL = 'escalated';
const EMERGENCY_ISSUE_LABEL = 'emergency';
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug('start!');
        try {
            const githubSetting = new GithubSetting(core.getInput('github owner', { required: true }), core.getInput('github repository', { required: true }), core.getInput('github dest repository', { required: true }), core.getInput('github access token', { required: true }));
            const octokit = githubSetting.createClient();
            const current = new Date();
            const yesterday = new Date();
            yesterday.setDate(current.getDate() - 1);
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
                            return label;
                        }
                        else {
                            return label.name;
                        }
                    });
                    if (labels.length == 0) {
                        return;
                    }
                    if (labels.find((label) => label === IGNORE_ISSUE_LABEL)) {
                        return;
                    }
                    const supportLimitMinutes = checkSupportLimit(labels);
                    const supportLimitDateTime = new Date(issue.created_at);
                    supportLimitDateTime.setMinutes(supportLimitDateTime.getMinutes() + supportLimitMinutes);
                    if (supportLimitDateTime <= current) {
                        copyIssue(octokit, githubSetting, issue.title, issue.body || '', issue.html_url, issue.number);
                    }
                });
            });
        }
        catch (error) {
            if (error instanceof Error)
                core.setFailed(error.message);
        }
    });
}
exports.run = run;
function checkSupportLimit(labels) {
    const emergency = labels.find((label) => label == EMERGENCY_ISSUE_LABEL);
    if (typeof emergency === "undefined") {
        return 60;
    }
    else {
        return 5;
    }
}
function copyIssue(octokit, githubSetting, oldIssueTitle, oldIssueBody, oldIssueUrl, oldIssueNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        const oldIssueComments = yield getComments(octokit, githubSetting, oldIssueNumber);
        const joinedOldComments = oldIssueComments.join("\n");
        const issueBody = `
ref: ${oldIssueUrl}

## body

${oldIssueBody}

## comments
${joinedOldComments}
    `;
        yield octokit.rest.issues.create({
            owner: githubSetting.owner,
            repo: githubSetting.destRepository,
            title: oldIssueTitle,
            body: issueBody,
        }).then((res) => {
            let createdIssueUrl = res.data.html_url;
            core.debug(`create issue! ${createdIssueUrl}`);
            octokit.rest.issues.createComment({
                owner: githubSetting.owner,
                repo: githubSetting.repository,
                issue_number: oldIssueNumber,
                body: `create issue! ${createdIssueUrl}`
            });
            octokit.rest.issues.addLabels({
                owner: githubSetting.owner,
                repo: githubSetting.repository,
                issue_number: oldIssueNumber,
                labels: [IGNORE_ISSUE_LABEL],
            });
            octokit.rest.issues.removeLabel({
                owner: githubSetting.owner,
                repo: githubSetting.repository,
                issue_number: oldIssueNumber,
                name: ESCALATION_ISSUE_LABEL,
            });
        });
    });
}
function getComments(octokit, githubSetting, issueNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        return octokit.rest.issues.listComments({
            owner: githubSetting.owner,
            repo: githubSetting.repository,
            issue_number: issueNumber,
        }).then((res) => {
            return res.data.map((v) => {
                return v.body || '';
            });
        });
    });
}
class GithubSetting {
    constructor(owner, repository, destRepository, token) {
        this.owner = owner;
        this.repository = repository;
        this.destRepository = destRepository;
        this.token = token;
        core.setSecret(token);
    }
    createClient() {
        return github.getOctokit(this.token);
    }
}
