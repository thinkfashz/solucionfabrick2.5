import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE_URL = 'https://txv86efe.us-east.insforge.app';
const API_KEY = process.env.INSFORGE_API_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
const DEFAULT_UPLOAD_CONCURRENCY = 8;
const MAX_UPLOAD_CONCURRENCY = 32;
const EXCLUDED_SEGMENTS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.insforge']);

function shouldExcludeDeploymentPath(normalizedName) {
  const segments = normalizedName.split('/');
  if (segments.some((segment) => segment === '.env' || segment.startsWith('.env.'))) return true;
  if (segments.some((segment) => EXCLUDED_SEGMENTS.has(segment))) return true;
  return normalizedName === '.DS_Store' || normalizedName.endsWith('/.DS_Store') || normalizedName.endsWith('.log');
}

async function readJsonResponse(response) {
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const message = data && typeof data === 'object' ? data.message || data.error : null;
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return data;
}

async function api(pathname, init = {}) {
  const headers = { 'x-api-key': API_KEY, ...(init.headers || {}) };
  const response = await fetch(API_BASE_URL + pathname, { ...init, headers });
  return readJsonResponse(response);
}

function getUploadConcurrency() {
  const parsed = Number.parseInt(process.env.INSFORGE_DEPLOY_UPLOAD_CONCURRENCY || '', 10);
  const requested = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : DEFAULT_UPLOAD_CONCURRENCY;
  return Math.min(requested, MAX_UPLOAD_CONCURRENCY);
}

async function runWithConcurrency(items, concurrency, worker) {
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length || 1);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
}

async function hashFile(filePath) {
  const hash = createHash('sha1');
  let size = 0;
  for await (const chunk of createReadStream(filePath)) {
    size += chunk.length;
    hash.update(chunk);
  }
  return { sha: hash.digest('hex'), size };
}

async function collectFiles(rootDirectory) {
  const files = [];

  async function walk(currentDirectory) {
    const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name);
      const normalizedPath = path
        .relative(rootDirectory, absolutePath)
        .split(path.sep)
        .join('/')
        .replace(/\\/g, '/');

      if (!normalizedPath || shouldExcludeDeploymentPath(normalizedPath)) continue;
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;

      const { sha, size } = await hashFile(absolutePath);
      files.push({ absolutePath, path: normalizedPath, sha, size });
    }
  }

  await walk(rootDirectory);
  return files;
}

async function uploadFile(deploymentId, manifestFile, localFile) {
  const response = await fetch(
    API_BASE_URL +
      '/api/deployments/' +
      encodeURIComponent(deploymentId) +
      '/files/' +
      encodeURIComponent(manifestFile.fileId) +
      '/content',
    {
      method: 'PUT',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(localFile.size),
      },
      body: createReadStream(localFile.absolutePath),
      duplex: 'half',
    }
  );

  await readJsonResponse(response);
}

async function main() {
  const rootDirectory = process.cwd();
  console.log('Collecting files from', rootDirectory);
  const localFiles = await collectFiles(rootDirectory);
  if (localFiles.length === 0) throw new Error('No deployable files found after applying exclusions.');
  console.log('Files to deploy:', localFiles.length);

  const createResult = await api('/api/deployments/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: localFiles.map(({ path, sha, size }) => ({ path, sha, size })) }),
  });

  if (!createResult || !Array.isArray(createResult.files)) {
    throw new Error('Direct deployment endpoint returned an unexpected response.');
  }

  const deploymentId = createResult.id;
  const localFileByPath = new Map(localFiles.map((file) => [file.path, file]));
  const uploadConcurrency = getUploadConcurrency();
  console.log('Created deployment. Deployment ID:', deploymentId);
  console.log('Uploading files with concurrency:', uploadConcurrency);

  let uploaded = 0;
  await runWithConcurrency(createResult.files, uploadConcurrency, async (manifestFile) => {
    const localFile = localFileByPath.get(manifestFile.path);
    if (!localFile) throw new Error('Backend requested missing local file: ' + manifestFile.path);
    await uploadFile(deploymentId, manifestFile, localFile);
    uploaded += 1;
    if (uploaded % 100 === 0 || uploaded === createResult.files.length) {
      console.log(`Uploaded ${uploaded}/${createResult.files.length}`);
    }
  });

  console.log('Starting deployment build...');
  const startResult = await api('/api/deployments/' + encodeURIComponent(deploymentId) + '/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  console.log('DEPLOYMENT_ID=' + deploymentId);
  if (startResult && typeof startResult === 'object') {
    if (startResult.url) console.log('DEPLOYMENT_URL=' + startResult.url);
    if (startResult.deploymentUrl) console.log('DEPLOYMENT_URL=' + startResult.deploymentUrl);
    if (startResult.status) console.log('DEPLOYMENT_STATUS=' + startResult.status);
  }
  console.log('DONE');
}

main().catch((error) => {
  console.error('DEPLOY_ERROR=' + (error?.message || String(error)));
  process.exit(1);
});
