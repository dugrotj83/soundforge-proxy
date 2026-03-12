export const maxDuration = 60; // Vercel max for hobby plan

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

  // Cap at 295s (just under 5 min), minimum 15s
  const dur = Math.min(295, Math.max(15, parseInt(duration) || 30));

  try {
    // MiniMax Music 2.5: full vocals, structured lyrics, up to 5 min
    const hasLyrics = lyrics && lyrics.trim().length > 0;
    const input = {
      prompt: prompt,
      // Pass duration via lyrics reference marker (MiniMax uses prompt length signals)
      lyrics: hasLyrics
        ? lyrics
        : buildAutoLyrics(prompt, dur),
    };

    // For longer songs use async (don't wait inline — poll instead)
    const useWait = dur <= 60;

    const r = await fetch('https://api.replicate.com/v1/models/minimax/music-2.5/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${repKey}`,
        ...(useWait ? { 'Prefer': 'wait=55' } : {}),
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

    // Return ID for polling (long songs)
    return res.status(200).json({ id: data.id, status: data.status });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function buildAutoLyrics(prompt, durationSecs) {
  // Build a structured song skeleton based on duration
  if (durationSecs <= 30) {
    return `[Verse]\n${prompt}`;
  }
  if (durationSecs <= 90) {
    return `[Verse]\n${prompt}\n\n[Chorus]\n${prompt}\n\n[Verse 2]\n${prompt}`;
  }
  if (durationSecs <= 150) {
    return `[Intro]\n\n[Verse]\n${prompt}\n\n[Pre-Chorus]\n\n[Chorus]\n${prompt}\n\n[Verse 2]\n${prompt}\n\n[Chorus]\n${prompt}\n\n[Outro]`;
  }
  // Full song (3-5 min)
  return `[Intro]\n\n[Verse 1]\n${prompt}\n\n[Pre-Chorus]\n\n[Chorus]\n${prompt}\n\n[Verse 2]\n${prompt}\n\n[Pre-Chorus]\n\n[Chorus]\n${prompt}\n\n[Bridge]\n\n[Chorus]\n${prompt}\n\n[Outro]`;
}
