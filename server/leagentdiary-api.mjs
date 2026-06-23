import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const houseRoot = path.resolve(serverDir, '..');
const repoRoot = path.resolve(houseRoot, '..', '..');
const fixturePath = path.resolve(
  repoRoot,
  'houses',
  'Leagentdiary',
  'fixtures',
  'htdi.diary.sample.json',
);
const port = Number(process.env.HTDI_DIARY_API_PORT || process.env.PORT || 3000);
const host = process.env.HTDI_DIARY_API_HOST || '127.0.0.1';

const jsonResponse = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
};

const notFound = (res, pathname) =>
  jsonResponse(res, 404, {
    error: 'not_found',
    message: `No HTDI diary API route for ${pathname}`,
  });

const methodNotAllowed = (res) => {
  res.statusCode = 405;
  res.setHeader('Allow', 'GET');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(`${JSON.stringify({ error: 'method_not_allowed', message: 'This local shim is read-only.' })}\n`);
};

const readDiaryBundle = async () => {
  const payload = JSON.parse(await fs.readFile(fixturePath, 'utf-8'));
  const sessions = Array.isArray(payload.sessions)
    ? payload.sessions.filter((session) => session?.id && session?.house_id)
    : [];

  return {
    ...payload,
    source: 'htdi-project:local-diary-api-shim',
    totalSessions: sessions.length,
    sessions,
  };
};

const byAgentHandle = (profile, agentHandle) =>
  profile?.agent_handle === agentHandle || profile?.identity?.agent_handle === agentHandle;

const byTaskId = (task, taskId) =>
  task?.id === taskId || task?.task_id === taskId;

const requestHandler = async (req, res) => {
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (method !== 'GET') {
    methodNotAllowed(res);
    return;
  }

  try {
    const bundle = await readDiaryBundle();

    if (pathname === '/health' || pathname === '/api/health') {
      jsonResponse(res, 200, {
        ok: true,
        service: 'htdi-leagentdiary-api',
        source: bundle.source,
        profiles: bundle.profiles?.length || 0,
        sessions: bundle.sessions?.length || 0,
        tasks: bundle.tasks?.length || 0,
      });
      return;
    }

    if (pathname === '/api/diary') {
      jsonResponse(res, 200, bundle);
      return;
    }

    if (pathname === '/api/profiles') {
      jsonResponse(res, 200, bundle.profiles || []);
      return;
    }

    if (pathname.startsWith('/api/profiles/')) {
      const agentHandle = decodeURIComponent(pathname.slice('/api/profiles/'.length));
      const profile = (bundle.profiles || []).find((item) => byAgentHandle(item, agentHandle));
      profile ? jsonResponse(res, 200, profile) : notFound(res, pathname);
      return;
    }

    if (pathname === '/api/tasks') {
      jsonResponse(res, 200, bundle.tasks || []);
      return;
    }

    if (pathname.startsWith('/api/tasks/')) {
      const taskId = decodeURIComponent(pathname.slice('/api/tasks/'.length));
      const task = (bundle.tasks || []).find((item) => byTaskId(item, taskId));
      task ? jsonResponse(res, 200, task) : notFound(res, pathname);
      return;
    }

    if (pathname === '/api/sessions') {
      jsonResponse(res, 200, bundle.sessions || []);
      return;
    }

    notFound(res, pathname);
  } catch (error) {
    jsonResponse(res, 500, {
      error: 'diary_source_unavailable',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

createServer(requestHandler).listen(port, host, () => {
  console.log(`HTDI LeAgentDiary API shim listening at http://${host}:${port}`);
});
