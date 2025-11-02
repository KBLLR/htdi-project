import { deploymentEntrySchema } from '../../shared/vercelDeploymentSchema.mjs';

const SOCIAL_CONTEXT_PERIODS = [
  {
    label: 'Pandemic Adaptations',
    description: 'Global lockdowns reshaped creative collaboration and remote showcases.',
    startYear: 2020,
    endYear: 2020,
  },
  {
    label: 'NFT Renaissance',
    description: 'Digital ownership experiments and crypto art auctions dominated headlines.',
    startYear: 2021,
    endYear: 2021,
  },
  {
    label: 'Crypto Volatility',
    description: 'Market corrections pushed builders toward utility-focused storytelling.',
    startYear: 2022,
    endYear: 2022,
  },
  {
    label: 'AI Acceleration',
    description: 'Generative tooling and spatial computing unlocked new pipelines.',
    startYear: 2023,
    endYear: 2024,
  },
];

const FALLBACK_CONTEXT = {
  label: 'Creative Continuum',
  description: 'Steady iteration across mediums and platforms.',
};

/**
 * Fetch the deployment timeline data from the serverless API and decorate entries
 * with contextual information used by the UI.
 */
export async function fetchDeploymentTimeline({ limit } = {}) {
  const search = new URLSearchParams();
  if (Number.isFinite(limit) && limit > 0) {
    search.set('limit', String(limit));
  }
  const endpoint = `/api/vercel-deployments${search.toString() ? `?${search.toString()}` : ''}`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    const error = new Error(`Failed to load deployment history (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }

  const payload = await response.json();

  const schema = payload.schema ?? deploymentEntrySchema;
  const deployments = Array.isArray(payload.data) ? payload.data : [];

  const timelineItems = deployments
    .map((deployment) => enrichDeployment(deployment))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    schema,
    items: timelineItems,
  };
}

function enrichDeployment(entry) {
  const createdAt = new Date(entry.createdAt);
  const socialContext = resolveSocialContext(createdAt);
  const commitMessage = entry.git?.commitMessage ?? '';
  const conciseCommit = commitMessage.split('\n')[0].trim();

  return {
    id: entry.id,
    createdAt: entry.createdAt,
    displayDate: createdAt.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    title: buildNarrativeTitle({
      commitSummary: conciseCommit,
      socialContextLabel: socialContext.label,
      createdAt,
    }),
    summary: conciseCommit || 'Deployment triggered from Vercel.',
    socialContext,
    links: entry.links,
    git: {
      branch: entry.git?.branch ?? 'unknown',
      commitSha: entry.git?.commitSha ?? '',
      commitMessage: commitMessage,
      commitAuthorName: entry.git?.commitAuthorName ?? 'unknown',
      repository: entry.git?.repository ?? null,
    },
  };
}

function resolveSocialContext(date) {
  const year = date.getUTCFullYear();
  const match = SOCIAL_CONTEXT_PERIODS.find((period) => year >= period.startYear && year <= period.endYear);
  return match ?? FALLBACK_CONTEXT;
}

function buildNarrativeTitle({ commitSummary, socialContextLabel, createdAt }) {
  const year = createdAt.getUTCFullYear();
  if (commitSummary) {
    return `${socialContextLabel} · ${commitSummary}`;
  }
  return `${socialContextLabel} · Deployment ${year}`;
}

export { deploymentEntrySchema };
