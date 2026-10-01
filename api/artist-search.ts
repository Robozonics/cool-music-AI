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
    // First, let's get the list of artists from Deezer autocomplete
    const searchUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=12`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data || !data.data) {
      return res.status(200).json({ data: [] });
    }

    // Now, for each artist, attempt to fetch a high-res Wikipedia image
    // Fallback to Deezer image if Wikipedia fails
    const artists = await Promise.all(
      data.data.map(async (artist: any) => {
        try {
          const wikiQuery = artist.name.replace(/ /g, '_');
          const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`);
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json();
            if (wikiData.originalimage && wikiData.originalimage.source) {
              return { ...artist, picture_xl: wikiData.originalimage.source, picture: wikiData.thumbnail?.source || wikiData.originalimage.source };
            }
          }
        } catch (e) {
          // Ignore wiki errors and fallback
        }
        return artist;
      })
    );

    return res.status(200).json({ data: artists });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
