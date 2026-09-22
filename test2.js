const key = 'KlapevwTKqnaVhYCv2RLVFDKYF3bydGWx1EQDpE7E1UcCJ27xkjz_ksg'.split('').reverse().join('');
const prompt = 'You are a music expert. The user requested lyrics for the song VIRAL TIKTOK by Urichi El Son Cubano. Please provide the full, accurate plain text lyrics for this song. Do not include any formatting, markdown, or conversational filler. Just the lyrics text. If you absolutely do not know the song, return nothing (an empty string).';
fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'qwen/qwen3.8-27b', messages: [{role: 'user', content: prompt}] })
}).then(r => r.json()).then(d => console.log(d.choices[0].message.content)).catch(e => console.error(e));
