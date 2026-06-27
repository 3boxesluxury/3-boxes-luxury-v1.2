'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { useDynamicTranslation } from '@/lib/i18n/translate-dynamic';
import { t as staticT } from '@/lib/i18n';

/**
 * I18n Debug Panel — drop this into any page to see exactly what's happening
 * with translations. Access at ?debug=i18n or just render <I18nDebugPanel />
 *
 * Shows:
 * 1. Current locale from store
 * 2. Static t() results for all product-related keys
 * 3. Dynamic tName/tDesc status
 * 4. Translation API call results
 * 5. Missing key detection
 */
export function I18nDebugPanel() {
  const locale = useStore((s) => s.locale);
  const { t, loaded } = useTranslation();
  const { tName, tDesc, isTranslating } = useDynamicTranslation();

  const [apiTestResult, setApiTestResult] = useState<string>('');
  const [apiTestLoading, setApiTestLoading] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);

  // Test product for dynamic translation
  const testProduct = { name: 'Diamond Solitaire Ring', description: 'A stunning 18K gold diamond ring', id: 'test-1' };

  // Keys to test
  const testKeys = [
    'common.addToCart',
    'common.addedToCart',
    'common.featuredBadge',
    'common.outOfStock',
    'common.inStock',
    'common.availableOn',
    'common.shopOn',
    'common.onlyLeft',
    'productDetail.backToProducts',
    'productDetail.stylePreview',
    'productDetail.seeHowItLooks',
    'productDetail.estimatedDelivery',
    'productDetail.defaultDeliveryDays',
    'productDetail.onlyLeftInStock',
    'productDetail.addedToCart',
    'productDetail.inStock',
    'productDetail.outOfStock',
    'productDetail.addToCart',
    'productDetail.available',
    'productDetail.onPlatform',
    'productDetail.soldByPartner',
    'productDetail.viewOriginalListing',
    'productDetail.noReviewsYet',
    'productDetail.writeReview',
    'productDetail.reviewsCount',
    'productDetail.reviewsWord',
    'productDetail.productNotFound',
    'productDetail.submitReview',
    'productDetail.yourName',
    'productDetail.yourReview',
    'productDetail.creatingPreview',
    'productDetail.stylePreviewReady',
    'productDetail.removeFromWishlist',
    'productDetail.addToWishlist',
    'quickView.title',
    'quickView.freeDelivery',
    'quickView.viewFullDetails',
    'quickView.addedToCartBtn',
    'quickView.soldOutOverlay',
    'productDetail.reviews',
    'productDetail.shareExperience',
    'productDetail.enterYourName',
    'productDetail.titleOptional',
    'productDetail.reviewTitlePlaceholder',
    'productDetail.reviewPlaceholder',
    'productDetail.signInToAddWishlist',
    'productDetail.soldByPartner',
  ];

  // Check for missing keys
  useEffect(() => {
    const missing: string[] = [];
    testKeys.forEach((key) => {
      const val = t(key);
      // If t() returns the key itself, it means the key was not found
      if (val === key) {
        missing.push(key);
      }
    });
    setMissingKeys(missing);
  }, [locale, loaded, t]);

  // Test API endpoint
  const testApi = async () => {
    setApiTestLoading(true);
    setApiTestResult('');
    try {
      const res = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: ['Diamond Solitaire Ring', 'A stunning gold ring'],
          targetLanguage: locale,
          type: 'product_name',
        }),
      });
      const data = await res.json();
      setApiTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiTestResult(`ERROR: ${err.message}`);
    } finally {
      setApiTestLoading(false);
    }
  };

  const keyResults = testKeys.map((key) => ({
    key,
    value: t(key),
    isMissing: t(key) === key,
  }));

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '60vh',
      overflow: 'auto',
      background: '#0a0a0a',
      border: '2px solid #d97706',
      borderRadius: '12px 12px 0 0',
      padding: '16px',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e7e5e4',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ color: '#d97706', margin: 0, fontSize: '14px' }}>
          I18n DEBUG PANEL
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span>Locale: <strong style={{ color: '#fbbf24' }}>{locale}</strong></span>
          <span>Loaded: <strong style={{ color: loaded ? '#34d399' : '#f87171' }}>{loaded ? 'YES' : 'NO'}</strong></span>
          <span>Missing: <strong style={{ color: missingKeys.length > 0 ? '#f87171' : '#34d399' }}>{missingKeys.length}</strong></span>
        </div>
      </div>

      {/* Dynamic Translation Test */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#1c1917', borderRadius: '8px' }}>
        <div style={{ color: '#d97706', fontWeight: 'bold', marginBottom: '4px' }}>Dynamic Translation (tName/tDesc):</div>
        <div>tName: <span style={{ color: '#fbbf24' }}>{tName(testProduct)}</span> {tName(testProduct) === testProduct.name ? '(NOT TRANSLATED)' : '(TRANSLATED)'}</div>
        <div>tDesc: <span style={{ color: '#fbbf24' }}>{tDesc(testProduct)}</span> {tDesc(testProduct) === testProduct.description ? '(NOT TRANSLATED)' : '(TRANSLATED)'}</div>
        <div>isTranslating: {isTranslating ? '...' : 'idle'}</div>
        <button
          onClick={testApi}
          disabled={apiTestLoading}
          style={{
            marginTop: '8px',
            padding: '4px 12px',
            background: '#d97706',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: '4px',
            cursor: apiTestLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {apiTestLoading ? 'Testing API...' : 'Test /api/i18n/translate'}
        </button>
        {apiTestResult && (
          <pre style={{ marginTop: '8px', padding: '8px', background: '#292524', borderRadius: '4px', overflow: 'auto', maxHeight: '120px', fontSize: '11px', color: '#a8a29e' }}>
            {apiTestResult}
          </pre>
        )}
      </div>

      {/* Key Results Table */}
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #44403c' }}>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: '#78716c' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: '#78716c' }}>Key</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: '#78716c' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {keyResults.map(({ key, value, isMissing }) => (
              <tr key={key} style={{ borderBottom: '1px solid #292524' }}>
                <td style={{ padding: '2px 8px' }}>
                  {isMissing ? (
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>MISSING</span>
                  ) : (
                    <span style={{ color: '#34d399' }}>OK</span>
                  )}
                </td>
                <td style={{ padding: '2px 8px', color: '#a8a29e' }}>{key}</td>
                <td style={{ padding: '2px 8px', color: isMissing ? '#f87171' : '#fbbf24' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}