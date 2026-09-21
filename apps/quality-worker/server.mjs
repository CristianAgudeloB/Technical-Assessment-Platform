import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT ?? 3001);
const maxPayloadBytes = 128 * 1024;
const timeoutMs = Number(process.env.SONAR_SCANNER_TIMEOUT_MS ?? 40_000);
const supportedFiles = {
  JAVA: 'Main.java',
  JAVASCRIPT: 'solution.js',
  PYTHON: 'solution.py',
  TYPESCRIPT: 'solution.ts',
};

createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    return sendJson(response, 200, { status: 'ok' });
  }

  if (request.method !== 'POST' || request.url !== '/analysis') {
    return sendJson(response, 404, { error: 'Not found.' });
  }

  if (!isAuthorized(request)) {
    return sendJson(response, 401, { error: 'Unauthorized.' });
  }

  try {
    const body = await readBody(request);
    const result = await analyze(body);
    return sendJson(response, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible analizar el código.';
    console.error('Quality analysis failed:', message);
    // Scanner output can include internal paths and service details. Preserve
    // it only in worker logs; API consumers get a safe generic message.
    return sendJson(response, 422, { error: 'No fue posible completar el análisis de calidad.' });
  }
}).listen(port, '0.0.0.0');

function isAuthorized(request) {
  const expected = process.env.QUALITY_WORKER_TOKEN;
  return Boolean(expected) && request.headers['x-quality-worker-token'] === expected;
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxPayloadBytes) throw new Error('El código excede el límite del analizador.');
    chunks.push(chunk);
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('La solicitud de análisis no es válida.');
  }

  if (
    !body
    || typeof body.submissionId !== 'string'
    || !/^[a-zA-Z0-9_-]{1,64}$/.test(body.submissionId)
    || typeof body.language !== 'string'
    || typeof body.sourceCode !== 'string'
    || body.sourceCode.length === 0
    || body.sourceCode.length > 30_000
  ) {
    throw new Error('La solicitud de análisis no es válida.');
  }

  return body;
}

async function analyze({ submissionId, language, sourceCode }) {
  if (language === 'COBOL') {
    return skipped('COBOL no es compatible con SonarQube Community Build.');
  }

  const fileName = supportedFiles[language];
  if (!fileName) throw new Error('El lenguaje no está soportado por el analizador.');

  const sonarToken = await readSonarToken();
  const workdir = await mkdtemp(join(tmpdir(), 'quality-'));
  const projectKey = `technical-assessment-${submissionId}`;

  try {
    await writeFile(join(workdir, fileName), sourceCode, { encoding: 'utf8', mode: 0o600 });
    const scannerOutput = await runScanner(workdir, projectKey, sonarToken, language);
    const task = await readTask(workdir);
    await waitForAnalysis(task.ceTaskId, sonarToken);

    const [issuesResponse, gateResponse] = await Promise.all([
      sonarApi(`/api/issues/search?componentKeys=${encodeURIComponent(projectKey)}&ps=100`, sonarToken),
      sonarApi(`/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}`, sonarToken),
    ]);
    const issues = normalizeIssues(issuesResponse.issues);

    return {
      status: 'COMPLETED',
      qualityGateStatus: typeof gateResponse.projectStatus?.status === 'string'
        ? gateResponse.projectStatus.status
        : null,
      totalIssues: Number.isInteger(issuesResponse.total) ? issuesResponse.total : issues.length,
      bugs: issues.filter((issue) => issue.type === 'BUG').length,
      codeSmells: issues.filter((issue) => issue.type === 'CODE_SMELL').length,
      vulnerabilities: issues.filter((issue) => issue.type === 'VULNERABILITY').length,
      issues,
      message: scannerOutput.includes('ANALYSIS SUCCESSFUL') ? null : 'El análisis se completó con observaciones.',
    };
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

function skipped(message) {
  return {
    status: 'SKIPPED',
    qualityGateStatus: null,
    totalIssues: 0,
    bugs: 0,
    codeSmells: 0,
    vulnerabilities: 0,
    issues: [],
    message,
  };
}

async function readSonarToken() {
  const tokenFile = process.env.SONAR_TOKEN_FILE;
  if (!tokenFile) throw new Error('El token de SonarQube no está configurado.');
  const token = (await readFile(tokenFile, 'utf8')).trim();
  if (!token) throw new Error('El token de SonarQube no está disponible todavía.');
  return token;
}

function runScanner(workdir, projectKey, token, language) {
  const hostUrl = process.env.SONAR_HOST_URL;
  if (!hostUrl) throw new Error('La URL de SonarQube no está configurada.');
  const args = [
    `-Dsonar.projectKey=${projectKey}`,
    `-Dsonar.projectName=Submission ${projectKey.slice(-12)}`,
    `-Dsonar.sources=${workdir}`,
    '-Dsonar.sourceEncoding=UTF-8',
    `-Dsonar.host.url=${hostUrl}`,
    `-Dsonar.token=${token}`,
    `-Dsonar.scanner.metadataFilePath=${join(workdir, 'report-task.txt')}`,
    '-Dsonar.scanner.connectTimeout=5',
    '-Dsonar.scanner.socketTimeout=20',
    '-Dsonar.scanner.responseTimeout=20',
  ];
  if (language === 'PYTHON') args.push('-Dsonar.python.version=3');
  if (language === 'JAVA') args.push('-Dsonar.java.source=17');

  return run('sonar', args, { cwd: workdir, env: { ...process.env, SONAR_TOKEN: token } });
}

async function readTask(workdir) {
  const text = await readFile(join(workdir, 'report-task.txt'), 'utf8');
  const values = Object.fromEntries(text.trim().split('\n').map((line) => line.split('=', 2)));
  if (!values.ceTaskId) throw new Error('SonarQube no devolvió el identificador del análisis.');
  return values;
}

async function waitForAnalysis(taskId, token) {
  const expiresAt = Date.now() + timeoutMs;
  while (Date.now() < expiresAt) {
    const task = await sonarApi(`/api/ce/task?id=${encodeURIComponent(taskId)}`, token);
    const status = task.task?.status;
    if (status === 'SUCCESS') return;
    if (status === 'FAILED' || status === 'CANCELED') {
      throw new Error(task.task?.errorMessage || 'SonarQube no pudo procesar el análisis.');
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error('El análisis de calidad excedió el tiempo permitido.');
}

async function sonarApi(path, token) {
  const response = await fetch(`${process.env.SONAR_HOST_URL}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('No fue posible consultar los resultados de SonarQube.');
  return response.json();
}

function normalizeIssues(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((issue) => {
    if (!['BUG', 'CODE_SMELL', 'VULNERABILITY'].includes(issue.type) || typeof issue.message !== 'string') return [];
    return [{
      type: issue.type,
      severity: typeof issue.severity === 'string' ? issue.severity : 'INFO',
      message: issue.message,
      rule: typeof issue.rule === 'string' ? issue.rule : 'unknown',
      line: Number.isInteger(issue.line) ? issue.line : null,
    }];
  });
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let errorOutput = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { errorOutput += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(output);
      else reject(new Error(`SonarScanner falló: ${errorOutput.slice(-600) || output.slice(-600) || 'sin detalle'}`));
    });
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}
