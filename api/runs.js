import { endpoint } from '../lib/api-handler.mjs';
import { dispatch, listRuns } from '../lib/cloud-runs.mjs';
export default endpoint(async (req, res) => {
  if (req.method === 'GET') {
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    return res.status(200).json(await listRuns(offset));
  }
  if (req.method !== 'POST') return res.status(405).json({ error: '지원하지 않는 요청입니다.' });
  if (!req.headers['content-type']?.startsWith('application/json')) return res.status(415).json({ error: 'JSON 요청이 필요합니다.' });
  const result = await dispatch();
  res.status(result.code).json(result.data);
});
