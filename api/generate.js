export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { repKey, prompt, duration, lyrics } = req.body;
  if (!repKey || !repKey.startsWith('r8_'))
    return res.status(401).json({ error: 'Invalid Replicate key — must start with r8_' });

  // Number of ~30s segments YuE should generate
  const secs = Math.min(300, Math.max(15, parseInt(duration) || 60));
  const numSegments = Math.max(2, Math.round(secs / 30));

  // YuE (fofr/yue) — Suno-quality open model
  // genre_txt = YuE tag string: "genre instrument mood gender timbre vocal"
  // lyrics    = structured lyrics with [verse]/[chorus]/[bridge] sections
  const input = {
    genre_txt: prompt,                       // our buildYuEGenreTags() output
    lyrics: lyrics || '[verse]\n' + prompt,  // structured sections
    num_segments: numSegments,               // controls song length
    max_new_tokens: 3000,                    // max tokens per segment
    repetition_penalty: 1.1,                 // prevents loops/repetition
  };

  try {
    // Use Prefer: wait=55 — songs ≤1min often finish inline (no polling needed)
    const r = await fetch('https://api.replicate.com/v1/models/fofr/yue/predictions', {
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
      // YuE returns { mixed_audio: url, vocal_audio: url, instrumental_audio: url }
      const out = data.output || {};
      const url = out.mixed_audio || out.vocal_audio || 
                  (Array.isArray(data.output) ? data.output[0] : null);
      return res.status(200).json({ url, id: data.id, status: 'succeeded' });
    }

    return res.status(200).json({ id: data.id, status: data.status });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
