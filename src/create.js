import core from '@actions/core';
import { GitHub, context } from '@actions/github';
import fs from 'fs';

const run = async () => {
  try {
    // get authenticated GitHub client
    const github = new GitHub(process.env.GITHUB_TOKEN);
    core.setOutput('outP', github);
    console.log(github);

    // get onwer and repo
    const { owner: currentOwner, repo: currentRepo } = context.repo;

    //
  } catch (error) {
    core.setFailed(error.message);
  }
}

export default run;