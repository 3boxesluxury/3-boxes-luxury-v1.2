/**
 * Facebook Pixel Event Tracking Utility for 3 BOXES LUXURY
 * 
 * Usage: Call these functions from anywhere in the app to track e-commerce events.
 * 
 * Before using: Replace PIXEL_ID in layout.tsx with your actual Pixel ID from
 * Facebook Business Manager → Events Manager → Data Sources → Create Pixel
 */

// TypeScript declaration for fbq
declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

// Check if Facebook Pixel is loaded
function isPixelLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

// Track a custom event
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (isPixelLoaded()) {
    window.fbq('track', eventName, params);
  }
}

// Track a custom event (non-standard)
export function trackCustomEvent(eventName: string, params?: Record<string, unknown>) {
  if (isPixelLoaded()) {
    window.fbq('trackCustom', eventName, params);
  }
}

// ============ Standard E-commerce Events ============

// Page View (automatically tracked via layout.tsx, but can be called manually)
export function trackPageView() {
  if (isPixelLoaded()) {
    window.fbq('track', 'PageView');
  }
}

// View Content - when a user views a product
export function trackViewContent(params: {
  contentName: string;
  contentCategory: string;
  contentIds: string[];
  contenttype: string;
  value: number;
  currency: string;
}) {
  trackEvent('ViewContent', params);
}

// Add to Cart
export function trackAddToCart(params: {
  contentName: string;
  contentIds: string[];
  contenttype: string;
  value: number;
  currency: string;
  numItems: number;
}) {
  trackEvent('AddToCart', params);
}

// Initiate Checkout
export function trackInitiateCheckout(params: {
  contentIds: string[];
  contenttype: string;
  value: number;
  currency: string;
  numItems: number;
}) {
  trackEvent('InitiateCheckout', params);
}

// Purchase - when order is completed
export function trackPurchase(params: {
  contentIds: string[];
  contenttype: string;
  value: number;
  currency: string;
  numItems: number;
}) {
  trackEvent('Purchase', params);
}

// Search
export function trackSearch(params: {
  searchString: string;
}) {
  trackEvent('Search', params);
}

// Add to Wishlist
export function trackAddToWishlist(params: {
  contentName: string;
  contentIds: string[];
  contenttype: string;
  value: number;
  currency: string;
}) {
  trackEvent('AddToWishlist', params);
}

// Complete Registration
export function trackCompleteRegistration(params: {
  status: string;
  contentName: string;
}) {
  trackEvent('CompleteRegistration', params);
}

// Lead - when user signs up or submits inquiry
export function trackLead(params: {
  contentName: string;
  currency: string;
  value: number;
}) {
  trackEvent('Lead', params);
}
