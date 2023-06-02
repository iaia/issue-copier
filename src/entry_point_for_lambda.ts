import { run } from './main'
import {AwsLambda} from './types'

exports.handler = async (event: any, context: any) => {
  await run(AwsLambda)
  return context.logStreamName
}
