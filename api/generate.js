export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { repKey, prompt, duration, lyrics } = req.body;
  if (!repKey || !repKey.startsWith('r8_')) return res.status(401).json({ error: 'Invalid key' });

  try {
    // MiniMax Music 2.5 — supports full vocals, male/female/duet, structured lyrics
    const input = {
      prompt,                              // style: genre, mood, BPM, voice type
      lyrics: lyrics || '[Verse]\n' + prompt,  // structured lyrics with metatags
    };

    const r = await fetch('https://api.replicate.com/v1/models/minimax/music-2.5/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${repKey}`,
        'Prefer': 'wait=25',
      },
      body: JSON.stringify({ input })
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    // Succeeded immediately
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
