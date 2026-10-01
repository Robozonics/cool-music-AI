export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = url.searchParams.get('q');
  
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const searchUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=15`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
