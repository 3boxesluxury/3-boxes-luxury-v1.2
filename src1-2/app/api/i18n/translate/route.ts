import { NextRequest, NextResponse } from 'next/server';

const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest) {
  try {
    const { texts, targetLanguage, type } = await request.json();

    if (!texts || !targetLanguage || !Array.isArray(texts)) {
      return NextResponse.json(
        { error: 'Missing required fields: texts, targetLanguage' },
        { status: 400 }
      );
    }

    // For English, return as-is
    if (targetLanguage === 'en') {
      const result: Record<string, string> = {};
      texts.forEach((text: string) => { result[text] = text; });
      return NextResponse.json({ translations: result });
    }

    // Check cache first
    const cacheKey = `${targetLanguage}:${type || 'general'}`;
    const cached = translationCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL) {
      try {
        const cachedTranslations = JSON.parse(cached.text) as Record<string, string>;
        const allCached = texts.every((t: string) => cachedTranslations[t]);
        if (allCached) {
          const result: Record<string, string> = {};
          texts.forEach((t: string) => { result[t] = cachedTranslations[t] || t; });
          return NextResponse.json({ translations: result });
        }
      } catch {
        // Cache parse failed, continue to translate
      }
    }

    // Use Google AI (Gemini) for translation
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.warn('GOOGLE_AI_API_KEY not set, returning original texts');
      const result: Record<string, string> = {};
      texts.forEach((text: string) => { result[text] = text; });
      return NextResponse.json({ translations: result });
    }

    const languageNames: Record<string, string> = {
      hi: 'Hindi',
      ar: 'Arabic',
      fr: 'French',
      de: 'German',
      es: 'Spanish',
      ja: 'Japanese',
      zh: 'Simplified Chinese',
      ko: 'Korean',
      pt: 'Portuguese',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    const typeContext = type === 'product_name'
      ? 'These are product names for a luxury e-commerce store. Translate naturally, keep brand names and proper nouns unchanged.'
      : type === 'product_description'
        ? 'These are product descriptions for a luxury e-commerce store. Translate naturally, keep brand names and proper nouns unchanged.'
        : 'Translate the following text naturally.';

    const prompt = `${typeContext}\n\nTarget language: ${targetLangName}\n\nTranslate each line below. Return ONLY a JSON object where each key is the original text and each value is the translated text. No markdown, no code blocks, just the JSON object.\n\n${JSON.stringify(texts, null, 2)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Google AI API error:', response.status, await response.text());
      const result: Record<string, string> = {};
      texts.forEach((text: string) => { result[text] = text; });
      return NextResponse.json({ translations: result });
    }

    const data = await response.json();
    const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON from the response
    let translations: Record<string, string> = {};
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translations = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse translation response:', parseError, rawContent);
    }

    // Ensure all texts have a translation (fallback to original)
    const result: Record<string, string> = {};
    texts.forEach((text: string) => {
      result[text] = translations[text] || text;
    });

    // Cache the translations
    translationCache.set(cacheKey, {
      text: JSON.stringify(result),
      timestamp: now,
    });

    return NextResponse.json({ translations: result });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}