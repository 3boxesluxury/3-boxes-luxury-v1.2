'use client';

import { useStore } from '@/lib/store';
import { useState, useEffect, useCallback, useRef } from 'react';

// Cache for translated texts: Map<`${locale}:${text}:${type}`, translatedText>
const translationMemory = new Map<string, string>();

/**
 * Hook that provides dynamic translation for database content (product names, descriptions, etc.)
 * Uses the /api/i18n/translate endpoint which calls Google AI (Gemini) for on-the-fly translation.
 * Results are cached in-memory and in sessionStorage for the session.
 */
export function useDynamicTranslation() {
  const locale = useStore((s) => s.locale);
  const [translatedTexts, setTranslatedTexts] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const pendingTextsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    if (locale === 'en') return;
    try {
      const cached = sessionStorage.getItem(`i18n_dynamic_${locale}`);
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, string>;
        setTranslatedTexts(new Map(Object.entries(parsed)));
      }
    } catch {
      // ignore
    }
  }, [locale]);

  // Save to sessionStorage when translations change
  useEffect(() => {
    if (locale === 'en') return;
    try {
      const obj = Object.fromEntries(translatedTexts);
      if (Object.keys(obj).length > 0) {
        sessionStorage.setItem(`i18n_dynamic_${locale}`, JSON.stringify(obj));
      }
    } catch {
      // ignore
    }
  }, [translatedTexts, locale]);

  const translateTexts = useCallback(
    async (texts: string[], type: 'product_name' | 'product_description' | 'general' = 'general') => {
      if (locale === 'en' || !texts || texts.length === 0) return;

      // Filter out already translated or empty texts
      const textsToTranslate = texts.filter((text) => {
        if (!text || text.trim() === '') return false;
        const cacheKey = `${locale}:${text}:${type}`;
        return !translationMemory.has(cacheKey) && !translatedTexts.has(text);
      });

      if (textsToTranslate.length === 0) return;

      setIsLoading(true);

      try {
        const response = await fetch('/api/i18n/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: textsToTranslate,
            targetLanguage: locale,
            type,
          }),
        });

        if (!response.ok) {
          console.error('Dynamic translation API error:', response.status);
          return;
        }

        const data = await response.json();
        const newTranslations: Record<string, string> = data.translations || {};

        // Update translation memory
        Object.entries(newTranslations).forEach(([original, translated]) => {
          const cacheKey = `${locale}:${original}:${type}`;
          translationMemory.set(cacheKey, translated);
        });

        // Update state
        setTranslatedTexts((prev) => {
          const updated = new Map(prev);
          Object.entries(newTranslations).forEach(([original, translated]) => {
            updated.set(original, translated);
          });
          return updated;
        });
      } catch (error) {
        console.error('Dynamic translation error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [locale, translatedTexts]
  );

  // Debounced translation to batch multiple calls
  const queueTranslation = useCallback(
    (text: string, type: 'product_name' | 'product_description' | 'general' = 'general') => {
      if (locale === 'en' || !text) return;
      const cacheKey = `${locale}:${text}:${type}`;
      if (translationMemory.has(cacheKey)) return;

      pendingTextsRef.current.add(text);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const texts = Array.from(pendingTextsRef.current);
        pendingTextsRef.current.clear();
        translateTexts(texts, type);
      }, 300);
    },
    [locale, translateTexts]
  );

  // Translate a product name
  const tName = useCallback(
    (product: { name: string; id?: string }): string => {
      if (locale === 'en') return product.name;
      const cacheKey = `${locale}:${product.name}:product_name`;
      if (translationMemory.has(cacheKey)) {
        return translationMemory.get(cacheKey)!;
      }
      if (translatedTexts.has(product.name)) {
        return translatedTexts.get(product.name)!;
      }
      // Queue for translation
      queueTranslation(product.name, 'product_name');
      return product.name; // Return original while translating
    },
    [locale, translatedTexts, queueTranslation]
  );

  // Translate a product description
  const tDesc = useCallback(
    (product: { description: string; id?: string }): string => {
      if (locale === 'en') return product.description;
      const cacheKey = `${locale}:${product.description}:product_description`;
      if (translationMemory.has(cacheKey)) {
        return translationMemory.get(cacheKey)!;
      }
      if (translatedTexts.has(product.description)) {
        return translatedTexts.get(product.description)!;
      }
      // Queue for translation
      queueTranslation(product.description, 'product_description');
      return product.description; // Return original while translating
    },
    [locale, translatedTexts, queueTranslation]
  );

  // Translate any text
  const tText = useCallback(
    (text: string, type: 'product_name' | 'product_description' | 'general' = 'general'): string => {
      if (locale === 'en' || !text) return text;
      const cacheKey = `${locale}:${text}:${type}`;
      if (translationMemory.has(cacheKey)) {
        return translationMemory.get(cacheKey)!;
      }
      if (translatedTexts.has(text)) {
        return translatedTexts.get(text)!;
      }
      queueTranslation(text, type);
      return text;
    },
    [locale, translatedTexts, queueTranslation]
  );

  // Batch translate product names/descriptions (call with list of products)
  const translateProducts = useCallback(
    (products: Array<{ name: string; description?: string }>) => {
      if (locale === 'en' || !products || products.length === 0) return;

      const names = products.map((p) => p.name).filter(Boolean);
      const descriptions = products
        .map((p) => p.description)
        .filter((d): d is string => !!d);

      if (names.length > 0) translateTexts(names, 'product_name');
      if (descriptions.length > 0) translateTexts(descriptions, 'product_description');
    },
    [locale, translateTexts]
  );

  return {
    tName,
    tDesc,
    tText,
    translateProducts,
    isTranslating: isLoading,
  };
}