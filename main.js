"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var core = require("@actions/core");
var github = require("@actions/github");
var GITHUB_OWNER = '';
var GITHUB_REPOSITORY = '';
var GITHUB_DEST_REPOSITORY = '';
var IGNORE_ISSUE_LABEL = 'escalated';
var EMERGENCY_ISSUE_LABEL = 'emergency';
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var githubToken, octokit_1;
        return __generator(this, function (_a) {
            try {
                GITHUB_OWNER = core.getInput('github owner', { required: true });
                GITHUB_REPOSITORY = core.getInput('github repository', { required: true });
                GITHUB_DEST_REPOSITORY = core.getInput('github dest repository', { required: true });
                githubToken = core.getInput('github access token', { required: true });
                core.setSecret(githubToken);
                octokit_1 = github.getOctokit(githubToken);
                // https://docs.github.com/ja/rest/issues/issues?apiVersion=2022-11-28#list-repository-issues
                octokit_1.rest.issues.listForRepo({
                    owner: GITHUB_OWNER,
                    repo: GITHUB_REPOSITORY,
                    assignee: 'none'
                }).then(function (res) {
                    var current = new Date();
                    res.data.forEach(function (issue, index, array) {
                        core.debug("unassigned issue: ".concat(issue.title, " #").concat(issue.number));
                        var labels = issue.labels.map(function (label) {
                            if (typeof label === 'string') {
                                return label;
                            }
                            else {
                                return label.name;
                            }
                        });
                        if (labels.find(function (label) { return label === IGNORE_ISSUE_LABEL; })) {
                            return;
                        }
                        if (labels.length == 0) {
                            return;
                        }
                        var supportLimitMinutes = checkSupportLimit(labels);
                        var supportLimitDateTime = new Date(issue.created_at);
                        supportLimitDateTime.setMinutes(supportLimitDateTime.getMinutes() + supportLimitMinutes);
                        if (supportLimitDateTime <= current) {
                            copyIssue(octokit_1, issue.title, issue.body || '', issue.html_url, issue.number);
                        }
                    });
                });
            }
            catch (error) {
                if (error instanceof Error)
                    core.setFailed(error.message);
            }
            return [2 /*return*/];
        });
    });
}
function checkSupportLimit(labels) {
    var emergency = labels.find(function (label) {
        return label == EMERGENCY_ISSUE_LABEL;
    });
    if (typeof emergency === "undefined") {
        return 60;
    }
    else {
        return 5;
    }
}
function copyIssue(octokit, oldIssueTitle, oldIssueBody, oldIssueUrl, oldIssueNumber) {
    return __awaiter(this, void 0, void 0, function () {
        var oldIssueComments, joinedOldComments, issueBody;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getComments(octokit, oldIssueNumber)];
                case 1:
                    oldIssueComments = _a.sent();
                    joinedOldComments = oldIssueComments.join("\n");
                    issueBody = "\nref: ".concat(oldIssueUrl, "\n\n## body\n\n").concat(oldIssueBody, "\n\n## comments\n").concat(joinedOldComments, "\n    ");
                    return [4 /*yield*/, octokit.rest.issues.create({
                            owner: GITHUB_OWNER,
                            repo: GITHUB_DEST_REPOSITORY,
                            title: oldIssueTitle,
                            body: issueBody
                        }).then(function (res) {
                            var createdIssueUrl = res.data.html_url;
                            core.debug("create issue! ".concat(createdIssueUrl));
                            octokit.rest.issues.createComment({
                                owner: GITHUB_OWNER,
                                repo: GITHUB_REPOSITORY,
                                issue_number: oldIssueNumber,
                                body: "create issue! ".concat(createdIssueUrl)
                            });
                            octokit.rest.issues.addLabels({
                                owner: GITHUB_OWNER,
                                repo: GITHUB_REPOSITORY,
                                issue_number: oldIssueNumber,
                                labels: [IGNORE_ISSUE_LABEL]
                            });
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getComments(octokit, issueNumber) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, octokit.rest.issues.listComments({
                    owner: GITHUB_OWNER,
                    repo: GITHUB_REPOSITORY,
                    issue_number: issueNumber
                }).then(function (res) {
                    return res.data.map(function (v) {
                        return v.body || '';
                    });
                })];
        });
    });
}
run();
