export async function analyzeWithGemini(pdfImages: string[], dimensions: any[], scale: number) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfImages: pdfImages.slice(0, 3), dimensions, scale }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Server Gemini proxy error: ' + text);
  }

  const data = await res.json();
  return data.parsed ?? data;
}

export default { analyzeWithGemini };
