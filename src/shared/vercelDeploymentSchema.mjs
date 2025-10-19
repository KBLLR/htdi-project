export const deploymentEntrySchema = {
  $id: 'https://kbllr.graphics/schemas/vercel-deployment.json',
  type: 'object',
  required: [
    'id',
    'projectId',
    'url',
    'readyState',
    'createdAt',
    'git',
    'links',
    'metadata'
  ],
  properties: {
    id: {
      type: 'string',
      description: 'Unique deployment identifier (uid).'
    },
    projectId: {
      type: 'string',
      description: 'Vercel project identifier associated with the deployment.'
    },
    url: {
      type: 'string',
      format: 'uri',
      description: 'HTTPS URL of the deployed preview or production build.'
    },
    readyState: {
      type: 'string',
      enum: ['READY'],
      description: 'Deployment readiness state (READY only, already filtered).'
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'ISO timestamp (UTC) for when the deployment was created.'
    },
    git: {
      type: 'object',
      required: ['branch', 'commitSha'],
      properties: {
        provider: {
          type: 'string',
          description: 'Git provider extracted from the deployment metadata.'
        },
        branch: {
          type: ['string', 'null'],
          description: 'Git branch (commit ref) that triggered the deployment.'
        },
        commitSha: {
          type: ['string', 'null'],
          description: 'Full commit SHA associated with the deployment.'
        },
        commitMessage: {
          type: ['string', 'null'],
          description: 'Commit message provided by the Git provider.'
        },
        commitAuthorName: {
          type: ['string', 'null'],
          description: 'Commit author name.'
        },
        commitAuthorAvatar: {
          type: ['string', 'null'],
          description: 'Avatar URL for the commit author, if available.'
        },
        repository: {
          type: ['string', 'null'],
          description: 'Repository slug in provider/name format, if available.'
        }
      },
      additionalProperties: false
    },
    links: {
      type: 'object',
      required: ['deployment', 'insights', 'gitCommit'],
      properties: {
        deployment: {
          type: 'string',
          format: 'uri',
          description: 'Public URL for the deployment.'
        },
        insights: {
          type: ['string', 'null'],
          format: 'uri',
          description: 'Vercel deployment insights/dashboard URL.'
        },
        gitCommit: {
          type: ['string', 'null'],
          format: 'uri',
          description: 'Link to the Git commit in the source provider, if known.'
        }
      },
      additionalProperties: false
    },
    metadata: {
      type: 'object',
      required: ['deploymentName', 'target', 'source'],
      properties: {
        deploymentName: {
          type: 'string',
          description: 'Internal deployment name (slug).'
        },
        target: {
          type: ['string', 'null'],
          description: 'Deployment target such as production or preview.'
        },
        source: {
          type: ['string', 'null'],
          description: 'Deployment source (e.g. git, import).'
        }
      },
      additionalProperties: true
    }
  },
  additionalProperties: false
}
