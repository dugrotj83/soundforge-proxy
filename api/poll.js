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

    let url = null;
    if (data.status === 'succeeded') {
      // YuE returns output object with mixed_audio, vocal_audio, instrumental_audio
      const out = data.output || {};
      url = out.mixed_audio || out.vocal_audio ||
            (Array.isArray(data.output) ? data.output[0] : null);
    }

    return res.status(200).json({ 
      status: data.status, 
      url, 
      error: data.error,
      logs: data.logs  // useful for debugging
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
