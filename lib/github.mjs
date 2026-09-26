export const repository = () => process.env.GH_REPOSITORY || 'SunKiteKim/portfolio';
export const reportBranch = 'test-reports';
export const workflow = 'things-e2e.yml';
export async function github(resource, options = {}) {
  const token = process.env.GH_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw Object.assign(new Error('Vercel의 GH_ACTIONS_TOKEN 환경 변수를 설정해 주세요.'), { status: 503 });
  const response = await fetch(`https://api.github.com/repos/${repository()}/${resource}`, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2026-03-10', 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(8000)
  });
  if (response.status === 204) return null;
  if (!response.ok) {
    throw Object.assign(new Error(`GitHub 요청 실패 (${response.status}). 저장소 권한과 Actions 설정을 확인해 주세요.`), { status: response.status });
  }
  return response.json();
}
export async function readReport(file) {
  try {
    const result = await github(`contents/${file}?ref=${reportBranch}`);
    return JSON.parse(Buffer.from(result.content, 'base64').toString('utf8'));
  } catch (error) { if (error.status === 404) return null; throw error; }
}
export async function writeReport(file, value) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let previous;
    try { previous = await github(`contents/${file}?ref=${reportBranch}`); }
    catch (error) { if (error.status !== 404) throw error; }
    try {
      return await github(`contents/${file}`, { method: 'PUT', body: JSON.stringify({
        message: `Update things test report [skip ci]`, branch: reportBranch, sha: previous?.sha,
        content: Buffer.from(JSON.stringify(value)).toString('base64')
      }) });
    } catch (error) { if (error.status !== 409 || attempt === 2) throw error; }
  }
}
