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
    let tag = core.getInput('tag', { required: true });
    if(process.env.TAG) {
      tag = process.env.TAG
    }
    const tagName = tag.replace('refs/tags/', '');
    let releaseName = core.getInput('release_name', { required: true });
    if(process.env.RELEASE) {
      releaseName = process.env.RELEASE
    }
    releaseName = releaseName.replace('refs/tags/', '');
    const body = core.getInput('body', { required: false });
    const draft = core.getInput('draft', { required: false }) === 'true';
    const prerelease = core.getInput('prerelease', { required: false }) === 'true';
    const commitish = core.getInput('commitish', { required: false }) || context.sha;

    const owner = core.getInput('owner', { required: false }) || currentOwner;
    const repo = core.getInput('repo', { required: false }) || currentRepo;
    console.log('Tag', tagName)
    console.log('Release Title', releaseName)

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    })

    const releaseList = await octokit.request('GET /repos/{owner}/{repo}/releases', {
      owner,
      repo
    })
    const currentRelease = releaseList.data;
    const releaseNameList = currentRelease.map(item => item.tag_name)
    if (releaseNameList.includes(tagName)) {
      console.log('Current tag is exist');
      return;
    }
    let prevTag = '', i = 0;
    while (!prevTag) {
      if (releaseNameList[i] && releaseNameList[i].match(/^\d{8}$/g)) {
        prevTag = releaseNameList[i];
      }
      i = i + 1;
      if(i > releaseNameList.length) {
        break;
      }
    }

    let generateNoteParam = {
      owner,
      repo,
      tag_name: tagName,
      target_commitish: commitish,
    }

    if(prevTag) {
      generateNoteParam['previous_tag_name'] = prevTag
    }
    let generateNote = await octokit.request('POST /repos/{owner}/{repo}/releases/generate-notes', {
      ...generateNoteParam
    })
    generateNote = generateNote.data;
    const changeNote = generateNote.body;


    const note = generateNotes(changeNote);
    console.log("Note:", note)

    if(!note && !body) {
      return;
    }

    const createResponse = await octokit.request(`POST /repos/{owner}/{repo}/releases`, {
      owner,
      repo,
      tag_name: tagName,
      name: releaseName,
      body: body || note,
      draft,
      prerelease,
      target_commitish: commitish
    })


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

function generateNotes(content) {
  const notes = content.split('\n');
  let changeLine = false, PRNumbers = [], FeatObj = {}, FixObj = {};
  for (let line of notes) {
    const _line = line.replace('\n', '');
    if (_line.includes('**Full Changelog**')) {
      changeLine = false
    }
    if (changeLine && _line.match(/^\*/g)) {
      const PR = _line.split(' --- ');
      const PRLast = PR[PR.length - 1];
      const PRNumber = PRLast.match(/\d{4}$/g);
      if (PRNumber && PRNumber[0]) {
        PRNumbers.push(`#${PRNumber[0]}`);
        let PRDetail = PRLast.split(' by ')[0];
        let Product = PRDetail.match(/\([A-Za-z]*\)\s*$/g);
        Product = Product && Product[0] ? Product[0].replace('\(', '').replace('\)', '').replace(/\s*/g, '') : 'All';

        PRDetail = PRDetail.replace(`(${Product})`, '');
        PRDetail = PRDetail.split(':');
        const currentNote = `#${PRNumber} ${PRDetail[1] ? PRDetail[1] : PRDetail[0]}`;
        if (PRDetail[0].toUpperCase() === 'FIX') {
          const existNote = FixObj[Product] || [];
          FixObj[Product] = [...existNote, currentNote];
        } else {
          const existNote = FeatObj[Product] || [];
          FeatObj[Product] = [...existNote, currentNote];
        }
      } else {
        continue;
      }
    }

    if(_line.includes("## What's Changed")) {
      changeLine = true
    }
  }

  let PRNote = [];
  if (PRNumbers.length) {
    PRNote.push('| PR |');
    PRNote.push('| ----- |');
    PRNote.push(`| ${PRNumbers.join(', ')} |`);
    PRNote.push('');
  }

  const FeatProduct = Object.keys(FeatObj);
  if (FeatProduct.length) {
    PRNote.push('## New Feature and Major Enhancement');
    FeatProduct.forEach(product => {
      PRNote.push(`\`${product}\``);
      PRNote.push(...FeatObj[product]);
      PRNote.push('');
    })
  }

  const FixProduct = Object.keys(FixObj);
  if (FixProduct.length) {
    PRNote.push('## Bug Fix and Minor Enhancement');
    FixProduct.forEach(product => {
      PRNote.push(`\`${product}\``);
      PRNote.push(...FixObj[product]);
      PRNote.push('');
    })
  }

  return PRNote.length ? PRNote.join('\n') : null;
}

export default run;
