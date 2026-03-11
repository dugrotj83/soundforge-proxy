export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { repKey, id } = req.body;
  if (!repKey || !id) return res.status(400).json({ error: 'Missing repKey or id' });

  try {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${repKey}` }
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    const url = data.status === 'succeeded'
      ? (Array.isArray(data.output) ? data.output[0] : data.output)
      : null;

    return res.status(200).json({ status: data.status, url, error: data.error });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
