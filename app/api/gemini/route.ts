import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';

const parsedCache = new LRUCache<string, any>({
  max: 100, // max 100 entries
  ttl: 30 * 60 * 1000, // 30 minutes TTL
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pdfImages, dimensions, scale } = body || {};

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured on server' }, { status: 500 });
    }

    // Compute cache key from inputs
    const cacheKey = crypto.createHash('sha256').update(JSON.stringify({ pdfImages: (pdfImages||[]), dimensions, scale })).digest('hex');
    const cached = parsedCache.get(cacheKey);
    if (cached) return NextResponse.json({ parsed: cached, cached: true });

    // Build parts for Gemini request (prompt + images)
    const parts: any[] = [
      {
        text: `Analyze these PDF form images and extract all form fields with their EXACT pixel coordinates.\n\nPDF Page Dimensions:\n${dimensions?.map((d: any, i: number) => `Page ${i + 1}: ${d.width}px width × ${d.height}px height`).join('\n')}\n\nFor each field, measure the bounding box coordinates:\n- x: distance from the LEFT edge of the page\n- y: distance from the TOP edge of the page\n- width: horizontal size of the field\n- height: vertical size of the field\n\nReturn ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):\n{\n  "fields": [\n    {\n      "name": "field name (use exact name from the form)",\n      "value": "field value or empty string if blank",\n      "type": "text|checkbox|radio|dropdown|date|email|phone|address|other",\n      "label": "field label if visible",\n      "pageNumber": 0,\n      "coordinates": {\n        "x": 50,\n        "y": 100,\n        "width": 150,\n        "height": 25\n      },\n      "coordinates_norm": {\n        "x": 0.1,\n        "y": 0.2,\n        "width": 0.3,\n        "height": 0.05\n      }\n    }\n  ],\n  "formTitle": "title of the form if present",\n  "description": "brief description of what the form is for"\n}\n\nCRITICAL: Coordinates must be precise and measured from the top-left corner. Do NOT include any padding or margins in your measurements.\n\nAlso include a confidence score (0..1) for each detected field where possible.\n\nAnalyze all the images below for form fields:`
      },
    ];

    (pdfImages || []).forEach((imgData: string) => {
      // expect data URL
      const data = imgData.split(',')[1] ?? imgData;
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data,
        },
      });
    });

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: 'Gemini returned an error', details: text }, { status: resp.status });
    }

    const dataResp = await resp.json();

    // Extract text content from Gemini response
    const content = dataResp?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      return NextResponse.json({ error: 'No text content from Gemini response', raw: dataResp }, { status: 500 });
    }

    // Try to extract JSON from code fences or raw JSON in text
    let jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = jsonMatch ? jsonMatch[1] : content;
    if (!jsonMatch) {
      jsonMatch = content.match(/\{[\s\S]*\}/);
      jsonString = jsonMatch ? jsonMatch[0] : content;
    }

    let parsedData: any = null;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (err) {
      return NextResponse.json({ error: 'Failed to parse JSON from Gemini response', parseError: String(err), rawContent: content }, { status: 500 });
    }

    parsedCache.set(cacheKey, parsedData);

    return NextResponse.json({ parsed: parsedData, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
