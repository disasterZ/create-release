import core from '@actions/core';
import { GitHub, context } from '@actions/github';
import fs from 'fs';

const run = async () => {
  try {
    // get authenticated GitHub client
    const github = new GitHub(process.env.GITHUB_TOKEN);
    console.log(github)
    // get onwer and repo
    const { owner: currentOwner, repo: currentRepo } = context.repo;

    // get params
    const tag = core.getInput('tag', { required: true });
    const releaseName = core.getInput('release_name', { required: true });
    const body = core.getInput('body', { required: false });
    const draft = core.getInput('draft', { required: false }) === 'true';
    const prerelease = core.getInput('prerelease', { required: false }) === 'true';
    const commitish = core.getInput('commitish', { required: false }) || context.sha;

    const owner = core.getInput('owner', { required: false }) || currentOwner;
    const repo = core.getInput('repo', { required: false }) || currentRepo;

    const createResponse = await github.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: releaseName,
      body,
      draft,
      prerelease,
      target_commitish: commitish
    })

    console.log(createResponse)

    // Get the ID, html_url, and upload URL for the created Release from the response
    const {
      data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
    } = createResponse;

    // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    core.setOutput('id', releaseId);
    core.setOutput('html_url', htmlUrl);
    core.setOutput('upload_url', uploadUrl)
  } catch (error) {
    core.setFailed(error.message);
  }
}

export default run;