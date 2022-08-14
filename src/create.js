import { context } from '@actions/github';
import { Octokit } from '@octokit/core';

const core = require('@actions/core');

const run = async () => {
  try {
    // // get authenticated GitHub client
    // const github = new GitHub(process.env.GITHUB_TOKEN);

    // get onwer and repo
    const { owner: currentOwner, repo: currentRepo } = context.repo;

    console.log(core)

    // get params
    const tag = core.getInput('tag', { required: true });
    const tagName = tag.replace('refs/tags/', '');
    const releaseName = core.getInput('release_name', { required: true }).replace('refs/tags/', '');
    const body = core.getInput('body', { required: false });
    const draft = core.getInput('draft', { required: false }) === 'true';
    const prerelease = core.getInput('prerelease', { required: false }) === 'true';
    const commitish = core.getInput('commitish', { required: false }) || context.sha;

    const owner = core.getInput('owner', { required: false }) || currentOwner;
    const repo = core.getInput('repo', { required: false }) || currentRepo;

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    })

    const releaseList = await octokit.request('GET /repos/{owner}/{repo}/releases', {
      owner,
      repo
    })

    console.log(releaseList)

    const generateNote  = await octokit.request('POST /repos/{owner}/{repo}/releases/generate-notes', {
      owner,
      repo,
      tag_name:tagName,
      target_commitish: commitish,
      // previous_tag_name: 'v0.9.2'
    })

    console.log(generateNote)

    const createResponse = await octokit.request(`POST /repos/{owner}/{repo}/releases`, {
      owner,
      repo,
      tag_name: tagName,
      name: releaseName,
      body,
      draft,
      prerelease,
      target_commitish: commitish
    })

    // const createResponse = await github.repos.createRelease({
    //   owner,
    //   repo,
    //   tag_name: tagName,
    //   name: releaseName,
    //   body,
    //   draft,
    //   prerelease,
    //   target_commitish: commitish
    // })


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