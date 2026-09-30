export default async function handler(req: any, res: any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.searchParams.get('id');
  
  if (!id) return res.status(400).json({ error: 'Missing id parameter' });

  const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.syncpundit.io',
    'https://pi.ggtyler.dev/api',
    'https://pipedapi.smnz.de'
  ];

  for (const instance of PIPED_INSTANCES) {
    try {
      const resp = await fetch(`${instance}/streams/${id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!resp.ok) continue;
      
      const data = await resp.json();
      const audioStreams = data.audioStreams || [];
      
      if (audioStreams.length > 0) {
        // Find best audio quality stream (highest bitrate)
        audioStreams.sort((a: any, b: any) => b.bitrate - a.bitrate);
        const bestStreamUrl = audioStreams[0].url;
        
        // 302 Redirect directly to the audio file so HTML5 Audio can play it seamlessly
        res.setHeader('Location', bestStreamUrl);
        return res.status(302).end();
      }
    } catch (e) {
      // Continue to next instance on failure
      continue;
    }
  }
  
  return res.status(404).json({ error: 'Failed to retrieve audio stream from all instances.' });
}
