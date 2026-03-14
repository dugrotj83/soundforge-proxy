export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { apiKey, workId } = req.body;
  if (!apiKey || !workId) return res.status(400).json({ error: 'Missing apiKey or workId' });

  try {
    const r = await fetch(`https://udioapi.pro/api/v2/feed?workId=${workId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.message || 'Poll error' });

    const type = data?.data?.type;

    if (type === 'SUCCESS') {
      const tracks = data?.data?.response_data || [];
      const url = tracks[0]?.audio_url || null;
      if (!url) return res.status(200).json({ status: 'processing' });
      return res.status(200).json({ status: 'succeeded', url, title: tracks[0]?.title });
    }

    if (type === 'ERROR') {
      return res.status(200).json({ status: 'failed', error: data?.data?.error_message || 'Generation failed' });
    }

    // Still processing
    return res.status(200).json({ status: 'processing' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
