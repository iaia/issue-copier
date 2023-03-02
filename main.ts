import * as core from '@actions/core';

async function run(): Promise<void> {
    try {
        const nameToGreet = core.getInput('who-to-greet');
        console.log(`Hello ${nameToGreet}!`);
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message)
    }
}

run()
