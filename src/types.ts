export const GithubActions = Symbol('GitHub Actions')
export const AwsLambda = Symbol('AWS Lambda')
export type Runner = typeof GithubActions | typeof AwsLambda;
