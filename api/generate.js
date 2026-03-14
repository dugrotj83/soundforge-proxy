export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { repKey, tags, lyrics, duration } = req.body;
  if (!repKey || !repKey.startsWith('r8_'))
    return res.status(401).json({ error: 'Invalid key — must start with r8_' });

  const secs = Math.min(240, Math.max(15, parseInt(duration) || 60));

  try {
    // ACE-Step by lucataco — fast (~16s), Suno-grade vocals, tag+lyrics format
    const r = await fetch('https://api.replicate.com/v1/models/lucataco/ace-step/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${repKey}`,
        'Prefer': 'wait=60',
      },
      body: JSON.stringify({
        input: {
          tags: tags || 'pop, female vocal, modern, high quality',
          lyrics: lyrics || '[verse]\nA beautiful song\n\n[chorus]\nFeel the music',
          duration: secs,
        }
      })
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
