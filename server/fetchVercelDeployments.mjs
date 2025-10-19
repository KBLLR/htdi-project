import { deploymentEntrySchema } from '../src/shared/vercelDeploymentSchema.mjs';

const API_BASE = 'https://api.vercel.com';

export { deploymentEntrySchema };

/**
 * Fetch successful deployments from the Vercel API and normalise the payload for clients.
 *
 * Expected environment variables:
 * - VERCEL_ACCESS_TOKEN (required)
 * - VERCEL_PROJECT_ID (optional default project id)
 * - VERCEL_TEAM_ID (optional team id if the project lives within a team)
 */
export async function fetchVercelDeployments(options = {}) {
  const {
    projectId = process.env.VERCEL_PROJECT_ID,
    teamId = process.env.VERCEL_TEAM_ID,
    limit = 20,
    readyState = 'READY'
  } = options;

  const accessToken = process.env.VERCEL_ACCESS_TOKEN;

  if (!accessToken) {
    throw Object.assign(new Error('VERCEL_ACCESS_TOKEN is not defined'), {
      statusCode: 500
    });
  }

  if (!projectId) {
    throw Object.assign(new Error('A projectId must be provided via argument or VERCEL_PROJECT_ID'), {
      statusCode: 400
    });
  }

  const query = new URLSearchParams({
    projectId,
    limit: String(Math.max(1, Math.min(Number(limit) || 20, 100)))
  });

  if (readyState) {
    query.set('state', readyState);
  }

  if (teamId) {
    query.set('teamId', teamId);
  }

  const response = await fetch(`${API_BASE}/v6/deployments?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorPayload = await safeJson(response);
    const error = new Error(`Failed to fetch deployments: ${response.status} ${response.statusText}`);
    error.statusCode = response.status;
    error.details = errorPayload;
    throw error;
  }

  const payload = await response.json();

  const deployments = Array.isArray(payload.deployments) ? payload.deployments : [];
  const readyDeployments = deployments.filter((deployment) => deployment.readyState === 'READY');

  return readyDeployments.map((deployment) => mapDeployment(deployment));
}

function mapDeployment(deployment) {
  const {
    uid,
    projectId,
    url,
    readyState,
    createdAt,
    meta = {},
    target = null,
    name = '',
    source = null,
    inspectorUrl = null
  } = deployment;

  const commitSha = meta.githubCommitSha || meta.gitlabCommitSha || meta.bitbucketCommitSha || null;
  const repository = meta.githubRepo || meta.gitlabProject || meta.bitbucketRepoFullName || null;
  const commitMessage =
    meta.githubCommitMessage || meta.gitlabCommitMessage || meta.bitbucketCommitMessage || deployment.meta?.commitMessage || null;
  const commitAuthorName =
    meta.githubCommitAuthorName || meta.gitlabCommitAuthorName || meta.bitbucketCommitAuthorName || null;
  const commitAuthorAvatar =
    meta.githubCommitAuthorLogin
      ? `https://avatars.githubusercontent.com/${meta.githubCommitAuthorLogin}`
      : meta.githubCommitAuthorAvatar || null;

  return {
    id: uid,
    projectId,
    url: `https://${url}`,
    readyState,
    createdAt: new Date(createdAt).toISOString(),
    git: {
      provider: meta.githubCommitOrg
        ? 'github'
        : meta.gitlabProject
        ? 'gitlab'
        : meta.bitbucketRepoFullName
        ? 'bitbucket'
        : null,
      branch: meta.githubCommitRef || meta.gitlabCommitRef || meta.bitbucketCommitRef || null,
      commitSha,
      commitMessage,
      commitAuthorName,
      commitAuthorAvatar,
      repository
    },
    links: {
      deployment: `https://${url}`,
      insights: inspectorUrl,
      gitCommit: commitSha && repository ? buildGitCommitUrl({ repository, provider: meta.githubCommitOrg ? 'github' : 'unknown', commitSha }) : null
    },
    metadata: {
      deploymentName: name,
      target,
      source
    }
  };
}

function buildGitCommitUrl({ repository, provider, commitSha }) {
  if (provider === 'github' && repository && commitSha) {
    return `https://github.com/${repository}/commit/${commitSha}`;
  }
  return null;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
