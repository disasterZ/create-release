import { context } from '@actions/github';
import { Octokit } from '@octokit/core';

const core = require('@actions/core');

const run = async () => {
  try {
    // // get authenticated GitHub client
    // const github = new GitHub(process.env.GITHUB_TOKEN);

    // get onwer and repo
    const { owner: currentOwner, repo: currentRepo } = context.repo;

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
    const currentRelease = releaseList.data;
    const releaseNameList = currentRelease.map(item => item.tag_name)
    // if (releaseNameList.includes(tagName)) {
    //   console.log('Current tag is exist');
    //   return;
    // }

    let generateNote = await octokit.request('POST /repos/{owner}/{repo}/releases/generate-notes', {
      owner,
      repo,
      tag_name: tagName,
      target_commitish: commitish,
      // previous_tag_name: '111'
    })
    generateNote = generateNote.data;
    const changeNote = generateNote.body;
    console.log(changeNote)

    // const createResponse = await octokit.request(`POST /repos/{owner}/{repo}/releases`, {
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
    // const {
    //   data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
    // } = createResponse;

    // // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    // core.setOutput('id', releaseId);
    // core.setOutput('html_url', htmlUrl);
    // core.setOutput('upload_url', uploadUrl)
  } catch (error) {
    core.setFailed(error.message);
  }
}

// name: '333',
// body: "## What's Changed\n" +
//   '* 2022/01/01 --- Haojie --- Feat: Change (All) by @disasterZ in https://github.com/disasterZ/release-action-test/pull/3\n' +
//   '\n' +
//   '\n' +
//   '**Full Changelog**: https://github.com/disasterZ/release-action-test/compare/111...333'

export default run;