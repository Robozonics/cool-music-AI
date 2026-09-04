async function test() {
  const query = 'trending bollywood 2026 hits';
  const searchUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_marker=0&query=${encodeURIComponent(query)}&ctx=android&_format=json`;
  
  const res = await fetch(searchUrl);
  const data = await res.json();
  
  if (data.songs && data.songs.data) {
    const songIds = data.songs.data.map(s => s.id).join(',');
    console.log("Song IDs:", songIds);
    
    const detailsUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&pids=${songIds}&_marker=0&ctx=android&_format=json`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();
    
    for (const key in detailsData) {
      console.log(detailsData[key].title || detailsData[key].song, detailsData[key].image);
    }
  } else {
    console.log("No songs found");
  }
}

test();
