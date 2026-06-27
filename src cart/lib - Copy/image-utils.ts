/**
 * Shared utility for resolving product image URLs.
 * Shopify CDN images are used directly (publicly accessible, no proxy needed).
 * Supabase Storage public URLs are also used directly.
 * Other external images are proxied to bypass CORS/hotlink protection.
 */

// Domains that are publicly accessible and don't need proxying
const DIRECT_ACCESS_DOMAINS = [
  'cdn.shopify.com',
  'shopify.com',
  'blob.vercel-storage.com',
  'public.blob.vercel-storage.com',
  'vercel.app',
  'vercel-storage.com',
  'supabase.co',          // Supabase Storage public URLs
  'supabase.in',          // Supabase India region
];

function isDirectAccessUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return DIRECT_ACCESS_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

export function getProxiedImageUrl(url: string, platform?: string): string {
  // Local paths - use directly
  if (url.startsWith('/')) {
    return url;
  }
  // Protocol-relative URLs
  if (url.startsWith('//')) {
    const fullUrl = 'https:' + url;
    if (isDirectAccessUrl(fullUrl)) return fullUrl;
    return `/api/image-proxy?url=${encodeURIComponent(fullUrl)}&platform=${platform || ''}`;
  }
  // HTTP/HTTPS URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Shopify CDN, Supabase Storage, and other public CDNs - use directly
    if (isDirectAccessUrl(url)) return url;
    // Other external URLs - proxy them
    return `/api/image-proxy?url=${encodeURIComponent(url)}&platform=${platform || ''}`;
  }
  // Data URLs and other - use directly
  return url;
}
