export default async function handler(req: any, res: any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = url.searchParams.get('q');
  
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const ytRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await ytRes.text();
    
    // Look for the first videoId
    const match = html.match(/"videoId":"([^"]{11})"/);
    if (match && match[1]) {
      return res.status(200).json({ videoId: match[1] });
    }
    
    return res.status(404).json({ error: 'No video found' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
