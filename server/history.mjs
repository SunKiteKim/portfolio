import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function historyStore(directory) {
  const filename = id => {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid run ID');
    return path.join(directory, `${id}.json`);
  };
  return {
    async save(run) {
      await mkdir(directory, { recursive: true });
      const file = filename(run.id);
      await writeFile(`${file}.tmp`, JSON.stringify(run, null, 2), 'utf8');
      await rename(`${file}.tmp`, file);
    },
    async get(id) {
      try { return JSON.parse(await readFile(filename(id), 'utf8')); }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    },
    async list(offset = 0, limit = 20) {
      let files;
      try { files = await readdir(directory); }
      catch (error) { if (error.code === 'ENOENT') return { total: 0, runs: [] }; throw error; }
      const runs = await Promise.all(files.filter(file => /^[a-f0-9-]{36}\.json$/.test(file)).map(async file => {
        const run = JSON.parse(await readFile(path.join(directory, file), 'utf8'));
        return { id: run.id, status: run.status, startedAt: run.startedAt, durationMs: run.durationMs,
          passed: run.cases.filter(c => c.status === 'passed').length,
          failed: run.cases.filter(c => c.status === 'failed').length,
          skipped: run.cases.filter(c => c.status === 'skipped').length };
      }));
      runs.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
      return { total: runs.length, runs: runs.slice(offset, offset + limit) };
    }
  };
}
