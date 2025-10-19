import { fetchVercelDeployments, deploymentEntrySchema } from '../server/fetchVercelDeployments.mjs';

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { limit, projectId } = req.query ?? {};

  try {
    const deployments = await fetchVercelDeployments({
      limit: limit ? Number(limit) : undefined,
      projectId: projectId || undefined
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      schema: deploymentEntrySchema,
      data: deployments
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message,
      details: error.details ?? null
    });
  }
}
