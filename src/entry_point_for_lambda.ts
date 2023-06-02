import { run } from './main'
import {AwsLambda} from './types'

exports.handler = async (event: any, context: any) => {
  void run(AwsLambda)
}
