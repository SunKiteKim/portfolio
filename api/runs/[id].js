import { endpoint } from '../../lib/api-handler.mjs';
import { getRun } from '../../lib/cloud-runs.mjs';
export default endpoint(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: '지원하지 않는 요청입니다.' });
  if (!/^\d{1,20}$/.test(req.query.id)) return res.status(404).json({ error: '실행 기록을 찾을 수 없습니다.' });
  res.status(200).json(await getRun(req.query.id));
});
