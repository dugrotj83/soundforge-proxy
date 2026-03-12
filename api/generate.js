export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { repKey, prompt, duration, lyrics } = req.body;
  if (!repKey || !repKey.startsWith('r8_')) {
    return res.status(401).json({ error: 'Invalid key — must start with r8_' });
  }

  const dur = Math.min(300, Math.max(15, parseInt(duration) || 30));

  try {
    const input = {
      // prompt = STYLE ONLY: genre, mood, BPM, voice type
      // The model uses this for musical style, NOT for words to sing
      prompt: prompt,

      // lyrics = WORDS ONLY: what the vocalist actually sings
      // If empty the app sends a scaffold, never the style description
      lyrics: lyrics && lyrics.trim() ? lyrics : '[Verse]\nOooh yeah\nFeel the music\n\n[Chorus]\nLet it go, let it flow',
    };

    const r = await fetch('https://api.replicate.com/v1/models/minimax/music-2.5/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${repKey}`,
        'Prefer': 'wait=30',
      },
      body: JSON.stringify({ input })
    });

    const data = await r.json();
    if (!r.ok) {
      const msg = data?.detail || data?.error || JSON.stringify(data);
      return res.status(r.status).json({ error: msg });
    }

    if (data.status === 'succeeded') {
      const url = Array.isArray(data.output) ? data.output[0] : data.output;
      return res.status(200).json({ url, id: data.id, status: 'succeeded' });
    }

    return res.status(200).json({ id: data.id, status: data.status });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
