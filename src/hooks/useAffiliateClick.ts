'use client'
import { useCallback } from 'react'

export function useAffiliateClick() {
  const trackClick = useCallback(async (productId: string, platform: string, sourceUrl: string, affiliateUrl?: string) => {
    try {
      const res = await fetch('/api/affiliate/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, platform, sourceUrl }),
      })
      const data = await res.json()
      // Open the affiliate URL or source URL in a new tab
      const url = affiliateUrl || sourceUrl || data.redirectUrl
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // Fallback: open source URL directly
      if (sourceUrl) window.open(sourceUrl, '_blank', 'noopener,noreferrer')
    }
  }, [])

  return { trackClick }
}
