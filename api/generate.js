export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { repKey, prompt, duration, lyrics } = req.body;
  if (!repKey || !repKey.startsWith('r8_'))
    return res.status(401).json({ error: 'Invalid key — must start with r8_' });

  const secs = Math.min(300, Math.max(10, parseInt(duration) || 60));

  // MiniMax Music 2.5 — song length is driven by lyric volume
  // We send lyrics sections proportional to duration for full-length songs
  const fallbackLyrics = `[verse]\n${prompt}\n\n[chorus]\n${prompt}`;
  const input = {
    prompt,
    lyrics: lyrics?.trim() ? lyrics : fallbackLyrics,
  };

  try {
    const r = await fetch('https://api.replicate.com/v1/models/minimax/music-2.5/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${repKey}`,
        'Prefer': 'wait=55',
      },
      body: JSON.stringify({ input })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = data?.detail || data?.error || JSON.stringify(data);
      return res.status(r.status).json({ error: msg });
    }

    if (data.status === 'succeeded') {
      const out = data.output;
      const url = typeof out === 'string' ? out
        : Array.isArray(out) ? out[0]
        : (out?.audio || out?.url || null);
      return res.status(200).json({ url, id: data.id, status: 'succeeded' });
    }

    return res.status(200).json({ id: data.id, status: data.status });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
