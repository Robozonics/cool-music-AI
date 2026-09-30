export default async function handler(req: any, res: any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = url.searchParams.get('q');
  
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.syncpundit.io',
    'https://pi.ggtyler.dev/api',
    'https://pipedapi.smnz.de'
  ];

  for (const instance of PIPED_INSTANCES) {
    try {
      const resp = await fetch(`${instance}/search?q=${encodeURIComponent(q)}&filter=music_songs`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!resp.ok) continue;
      
      const data = await resp.json();
      const items = data.items || [];
      if (items.length > 0) {
        return res.status(200).json({ items: items.slice(0, 15) });
      }
    } catch (e) {
      continue;
    }
  }
  
  return res.status(200).json({ items: [] });
}
