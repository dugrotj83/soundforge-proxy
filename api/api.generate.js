export default async function handler(req, res) {
  // Allow requests from anywhere (your GitHub Pages app)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { repKey, prompt, duration } = req.body;
  if (!repKey || !repKey.startsWith('r8_')) return res.status(401).json({ error: 'Invalid key' });

  try {
    const r = await fetch('https://api.replicate.com/v1/models/meta/musicgen/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${repKey}`,
        'Prefer': 'wait=20',
      },
      body: JSON.stringify({
        input: {
          prompt,
          model_version: 'stereo-large',
          duration: duration || 15,
          output_format: 'mp3',
          normalization_strategy: 'loudness',
        }
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    // If succeeded immediately
    if (data.status === 'succeeded') {
      const url = Array.isArray(data.output) ? data.output[0] : data.output;
      return res.status(200).json({ url, id: data.id, status: 'succeeded' });
    }

    // Return prediction ID for polling
    return res.status(200).json({ id: data.id, status: data.status });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
