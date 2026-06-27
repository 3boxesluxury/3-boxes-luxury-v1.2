'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress-bar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  ShoppingBag,
  Package,
  FolderTree,
  Link2,
  ArrowUpFromLine,
  ArrowDownToLine,
  Upload,
  Key,
  Shield,
  Save,
  Wifi,
  WifiOff,
  FileText,
  Search,
  ExternalLink,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Globe,
  Zap,
  Info,
} from 'lucide-react';

// ==============================
// INTERFACES — matching actual API responses
// ==============================

interface ApiStatus {
  configured: boolean;
  connected: boolean;
  shop?: string;
  shopName?: string;
  error?: string;
}

interface ShopifyStatus {
  storefrontApi: ApiStatus;
  adminApi: ApiStatus;
  storeDomain: string;
  productsWithShopifyId: number;
  totalProducts: number;
}

interface SyncStatus {
  status: string;
  store: string;
  adminApi: {
    connected: boolean;
    shopName: string | null;
    error: string | null;
  };
  sync: {
    localToShopify: {
      totalLocalProducts: number;
      pushedToShopify: number;
      notYetPushed: number;
      totalCategories: number;
      categoriesPushed: number;
      categoriesNotPushed: number;
      lastPushedAt: string | null;
    };
    shopifyToLocal: {
      shopifyProductsInLocalDb: number;
      totalProducts: number;
      lastPulledAt: string | null;
    };
  };
}

interface TokenSaveResult {
  success: boolean;
  message: string;
  adminTokenSaved: boolean;
  storefrontTokenSaved: boolean;
}

interface PushResult {
  success: boolean;
  direction: string;
  adminApiConnected: boolean;
  shop?: string;
  categories: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    details: Array<{
      id: string;
      name: string;
      status: 'created' | 'updated' | 'failed';
      shopifyId?: string;
      error?: string;
    }>;
  };
  products: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    details: Array<{
      id: string;
      name: string;
      status: 'created' | 'updated' | 'failed' | 'skipped';
      shopifyId?: string;
      shopifyVariantId?: string;
      error?: string;
    }>;
  };
  collects: {
    total: number;
    created: number;
    failed: number;
  };
}

interface PullResult {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  categoriesSynced: number;
  source: string;
}

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  category: string;
  categorySlug: string;
  shopifyId: string | null;
  shopifyVariantId: string | null;
  source: string;
  images: string[];
  stock: number;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  productCount: number;
  shopifyId?: string | null;
}

type ProductFilter = 'all' | 'not-pushed' | 'pushed';

// ==============================
// MAIN COMPONENT
// ==============================

export function ShopifyTab() {
  // ── State ──
  const [shopifyStatus, setShopifyStatus] = useState<ShopifyStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Token state
  const [storefrontTokenInput, setStorefrontTokenInput] = useState('');
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [savingStorefrontToken, setSavingStorefrontToken] = useState(false);
  const [savingAdminToken, setSavingAdminToken] = useState(false);
  const [storefrontTestResult, setStorefrontTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [adminTestResult, setAdminTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Push state
  const [pushing, setPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState(0);
  const [pushAsDraft, setPushAsDraft] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

  // Pull state
  const [pulling, setPulling] = useState(false);
  const [pullResult, setPullResult] = useState<PullResult | null>(null);

  // Products & Categories
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [productSearch, setProductSearch] = useState('');
  const [logOpen, setLogOpen] = useState(false);

  const [error, setError] = useState('');

  // ── Data Fetching ──

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, syncRes] = await Promise.all([
        fetch('/api/shopify/status'),
        fetch('/api/shopify/sync'),
      ]);
      const statusData = await statusRes.json();
      const syncData = await syncRes.json();

      if (statusRes.ok) setShopifyStatus(statusData);
      else setError(statusData.error || 'Failed to fetch status');

      if (syncRes.ok) setSyncStatus(syncData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchProducts();
    fetchCategories();
  }, [fetchStatus, fetchProducts, fetchCategories]);

  // ── Token Actions ──

  const saveStorefrontToken = async () => {
    if (!storefrontTokenInput.trim()) return;
    setSavingStorefrontToken(true);
    setStorefrontTestResult(null);
    try {
      const res = await fetch('/api/shopify/admin-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storefrontToken: storefrontTokenInput.trim() }),
      });
      const data: TokenSaveResult = await res.json();
      if (res.ok) {
        setStorefrontTokenInput('');
        // Refresh status and test
        await fetchStatus();
        // Re-test the storefront connection
        const statusRes = await fetch('/api/shopify/status');
        if (statusRes.ok) {
          const statusData: ShopifyStatus = await statusRes.json();
          setShopifyStatus(statusData);
          if (statusData.storefrontApi.connected) {
            setStorefrontTestResult({ success: true, message: `Connected to ${statusData.storefrontApi.shopName || statusData.storeDomain}` });
          } else {
            setStorefrontTestResult({ success: false, message: statusData.storefrontApi.error || 'Token saved but connection failed' });
          }
        }
      } else {
        setStorefrontTestResult({ success: false, message: data.message || 'Failed to save token' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setStorefrontTestResult({ success: false, message: msg });
    } finally {
      setSavingStorefrontToken(false);
    }
  };

  const saveAdminToken = async () => {
    if (!adminTokenInput.trim()) return;
    if (!adminTokenInput.trim().startsWith('shpat_')) {
      setAdminTestResult({ success: false, message: 'Admin API token must start with "shpat_"' });
      return;
    }
    setSavingAdminToken(true);
    setAdminTestResult(null);
    try {
      const res = await fetch('/api/shopify/admin-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminTokenInput.trim() }),
      });
      const data: TokenSaveResult = await res.json();
      if (res.ok) {
        setAdminTokenInput('');
        // Refresh status and test
        await fetchStatus();
        const statusRes = await fetch('/api/shopify/status');
        if (statusRes.ok) {
          const statusData: ShopifyStatus = await statusRes.json();
          setShopifyStatus(statusData);
          if (statusData.adminApi.connected) {
            setAdminTestResult({ success: true, message: `Connected to ${statusData.adminApi.shop || statusData.adminApi.shopName || 'store'}` });
          } else {
            setAdminTestResult({ success: false, message: statusData.adminApi.error || 'Token saved but connection failed' });
          }
        }
      } else {
        setAdminTestResult({ success: false, message: data.message || 'Failed to save token' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setAdminTestResult({ success: false, message: msg });
    } finally {
      setSavingAdminToken(false);
    }
  };

  // ── Actions ──

  const pushToShopify = async () => {
    setPushing(true);
    setPushResult(null);
    setError('');
    setPushProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setPushProgress((prev) => Math.min(prev + 3, 90));
      }, 2000);

      const res = await fetch('/api/shopify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'local-to-shopify',
          asDraft: pushAsDraft,
          includeImages,
        }),
      });

      clearInterval(progressInterval);

      const data = await res.json();
      if (res.ok) {
        setPushResult(data);
        setPushProgress(100);
        fetchStatus();
        fetchProducts();
        fetchCategories();
      } else {
        setError(data.error || 'Push failed');
        if (data.details) {
          setError(data.error + ': ' + data.details);
        }
        setPushProgress(0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setPushProgress(0);
    } finally {
      setPushing(false);
    }
  };

  const pullFromShopify = async () => {
    setPulling(true);
    setPullResult(null);
    setError('');
    try {
      const res = await fetch('/api/shopify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'shopify-to-local' }),
      });
      const data = await res.json();
      if (res.ok) {
        setPullResult(data);
        fetchStatus();
        fetchProducts();
        fetchCategories();
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setPulling(false);
    }
  };

  // ── Computed ──

  const localProducts = products.filter((p) => p.source !== 'shopify');

  const filteredProducts = localProducts.filter((p) => {
    if (productFilter === 'not-pushed') return !p.shopifyId;
    if (productFilter === 'pushed') return !!p.shopifyId;
    return true;
  }).filter((p) => {
    if (!productSearch) return true;
    return p.name.toLowerCase().includes(productSearch.toLowerCase());
  });

  // ── Helpers ──

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (api: ApiStatus) => {
    if (api.connected) return 'emerald';
    if (api.configured) return 'red';
    return 'amber';
  };

  // ==============================
  // RENDER
  // ==============================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-amber-100">Shopify Integration</h2>
          <p className="text-sm text-amber-200/40">
            Connect your Shopify store to sync products, manage checkout, and process orders
          </p>
        </div>
        <Button
          onClick={() => { fetchStatus(); fetchProducts(); fetchCategories(); }}
          disabled={loading}
          variant="outline"
          className="border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* ====== 1. CONNECTION STATUS CARD ====== */}
      <Card className="border-amber-900/20 bg-stone-900/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-amber-400" />
            <div>
              <CardTitle className="text-amber-100">Connection Status</CardTitle>
              <CardDescription className="text-amber-200/40">
                {shopifyStatus?.storeDomain || syncStatus?.store || '3boxesluxury-2.myshopify.com'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Two status cards side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Storefront API */}
            <div className={`rounded-lg border p-4 ${
              getStatusColor(shopifyStatus?.storefrontApi ?? { configured: false, connected: false }) === 'emerald'
                ? 'border-emerald-600/30 bg-emerald-900/10'
                : getStatusColor(shopifyStatus?.storefrontApi ?? { configured: false, connected: false }) === 'red'
                  ? 'border-red-600/30 bg-red-900/10'
                  : 'border-amber-600/30 bg-amber-900/10'
            }`}>
              <div className="flex items-center gap-3">
                {shopifyStatus?.storefrontApi?.connected ? (
                  <Wifi className="h-5 w-5 text-emerald-400" />
                ) : shopifyStatus?.storefrontApi?.configured ? (
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                ) : (
                  <WifiOff className="h-5 w-5 text-amber-400" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    shopifyStatus?.storefrontApi?.connected
                      ? 'text-emerald-300'
                      : shopifyStatus?.storefrontApi?.configured
                        ? 'text-red-300'
                        : 'text-amber-300'
                  }`}>
                    Storefront API
                  </p>
                  <p className="text-xs text-amber-200/40">
                    {shopifyStatus?.storefrontApi?.connected
                      ? `Connected to ${shopifyStatus.storefrontApi.shopName || shopifyStatus.storeDomain}`
                      : shopifyStatus?.storefrontApi?.configured
                        ? shopifyStatus.storefrontApi.error || 'Token configured but not working'
                        : 'Not configured — required for product sync & checkout'}
                  </p>
                </div>
                <Badge className={`${
                  shopifyStatus?.storefrontApi?.connected
                    ? 'bg-emerald-900/30 text-emerald-400 border-emerald-600/30'
                    : shopifyStatus?.storefrontApi?.configured
                      ? 'bg-red-900/30 text-red-400 border-red-600/30'
                      : 'bg-amber-900/30 text-amber-400 border-amber-600/30'
                }`}>
                  {shopifyStatus?.storefrontApi?.connected ? (
                    <><CheckCircle className="mr-1 h-3 w-3" /> Connected</>
                  ) : shopifyStatus?.storefrontApi?.configured ? (
                    <><XCircle className="mr-1 h-3 w-3" /> Error</>
                  ) : (
                    <><WifiOff className="mr-1 h-3 w-3" /> Not Set</>
                  )}
                </Badge>
              </div>
            </div>

            {/* Admin API */}
            <div className={`rounded-lg border p-4 ${
              getStatusColor(shopifyStatus?.adminApi ?? { configured: false, connected: false }) === 'emerald'
                ? 'border-emerald-600/30 bg-emerald-900/10'
                : getStatusColor(shopifyStatus?.adminApi ?? { configured: false, connected: false }) === 'red'
                  ? 'border-red-600/30 bg-red-900/10'
                  : 'border-amber-600/30 bg-amber-900/10'
            }`}>
              <div className="flex items-center gap-3">
                {shopifyStatus?.adminApi?.connected ? (
                  <Shield className="h-5 w-5 text-emerald-400" />
                ) : shopifyStatus?.adminApi?.configured ? (
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                ) : (
                  <WifiOff className="h-5 w-5 text-amber-400" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    shopifyStatus?.adminApi?.connected
                      ? 'text-emerald-300'
                      : shopifyStatus?.adminApi?.configured
                        ? 'text-red-300'
                        : 'text-amber-300'
                  }`}>
                    Admin API
                  </p>
                  <p className="text-xs text-amber-200/40">
                    {shopifyStatus?.adminApi?.connected
                      ? `Connected to ${shopifyStatus.adminApi.shop || shopifyStatus.adminApi.shopName || 'store'}`
                      : shopifyStatus?.adminApi?.configured
                        ? shopifyStatus.adminApi.error || 'Token configured but not working'
                        : 'Not configured — required for push operations'}
                  </p>
                </div>
                <Badge className={`${
                  shopifyStatus?.adminApi?.connected
                    ? 'bg-emerald-900/30 text-emerald-400 border-emerald-600/30'
                    : shopifyStatus?.adminApi?.configured
                      ? 'bg-red-900/30 text-red-400 border-red-600/30'
                      : 'bg-amber-900/30 text-amber-400 border-amber-600/30'
                }`}>
                  {shopifyStatus?.adminApi?.connected ? (
                    <><CheckCircle className="mr-1 h-3 w-3" /> Connected</>
                  ) : shopifyStatus?.adminApi?.configured ? (
                    <><XCircle className="mr-1 h-3 w-3" /> Error</>
                  ) : (
                    <><WifiOff className="mr-1 h-3 w-3" /> Not Set</>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          {/* Store domain & product count */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
              <Globe className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-xs text-amber-200/40">Store Domain</p>
                <p className="text-sm text-amber-100 font-mono">{shopifyStatus?.storeDomain || '3boxesluxury-2.myshopify.com'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
              <Package className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-xs text-amber-200/40">Products with Shopify IDs</p>
                <p className="text-sm text-amber-100 font-semibold">
                  {shopifyStatus?.productsWithShopifyId ?? 0}/{shopifyStatus?.totalProducts ?? 0}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== 2. TOKEN CONFIGURATION CARD ====== */}
      <Card className="border-amber-900/20 bg-stone-900/60">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-400" />
            Token Configuration
          </CardTitle>
          <CardDescription className="text-amber-200/40">
            Enter and save your Shopify API tokens. Both tokens are required for full functionality.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Storefront API Token */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-medium text-amber-200">Storefront API Access Token</h4>
              <code className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-amber-400">X-Shopify-Storefront-Access-Token</code>
            </div>

            {/* Instructions */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-200/50 space-y-1">
                  <p className="font-medium text-amber-200/60">How to get this token:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Shopify Admin → Settings → Apps → Develop apps</li>
                    <li>Click on your custom app</li>
                    <li>Under API credentials → Storefront API access token</li>
                    <li>Copy the token value</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Token Input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="password"
                  placeholder="Enter Storefront API access token"
                  value={storefrontTokenInput}
                  onChange={(e) => setStorefrontTokenInput(e.target.value)}
                  className="bg-stone-800/60 border-amber-900/30 text-amber-100 placeholder:text-amber-200/20 font-mono text-sm"
                />
              </div>
              <Button
                onClick={saveStorefrontToken}
                disabled={savingStorefrontToken || !storefrontTokenInput.trim()}
                className="bg-amber-600 text-stone-950 hover:bg-amber-500 font-medium"
              >
                {savingStorefrontToken ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save &amp; Test</>
                )}
              </Button>
            </div>

            {/* Current status indicator */}
            {shopifyStatus?.storefrontApi?.configured && (
              <div className={`flex items-center gap-2 text-xs ${
                shopifyStatus.storefrontApi.connected ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {shopifyStatus.storefrontApi.connected ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                <span>
                  {shopifyStatus.storefrontApi.connected
                    ? `Currently configured and connected${shopifyStatus.storefrontApi.shopName ? ` to ${shopifyStatus.storefrontApi.shopName}` : ''}`
                    : `Currently configured but not working: ${shopifyStatus.storefrontApi.error || 'unknown error'}`}
                </span>
              </div>
            )}

            {/* Test result */}
            {storefrontTestResult && (
              <div className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
                storefrontTestResult.success
                  ? 'border-emerald-600/30 bg-emerald-900/10 text-emerald-300'
                  : 'border-red-600/30 bg-red-900/10 text-red-300'
              }`}>
                {storefrontTestResult.success ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{storefrontTestResult.message}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-amber-900/20" />

          {/* Admin API Token */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-medium text-amber-200">Admin API Access Token</h4>
              <code className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-amber-400">X-Shopify-Access-Token</code>
              <Badge variant="outline" className="text-[10px] border-amber-600/40 text-amber-400">starts with shpat_</Badge>
            </div>

            {/* Instructions */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-200/50 space-y-1">
                  <p className="font-medium text-amber-200/60">How to get this token:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Shopify Admin → Settings → Apps → Develop apps</li>
                    <li>Click on your custom app</li>
                    <li>Under API credentials → Admin API access token</li>
                    <li>Copy the token (starts with <code className="rounded bg-stone-800 px-1 py-0 text-amber-400 text-[10px]">shpat_</code>)</li>
                  </ol>
                  <p className="text-amber-200/40 mt-1">
                    Required scopes: <code className="rounded bg-stone-800 px-1 py-0 text-amber-400 text-[10px]">write_products, read_products, write_inventory, read_inventory, write_custom_collections, read_custom_collections</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Token Input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="password"
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={adminTokenInput}
                  onChange={(e) => setAdminTokenInput(e.target.value)}
                  className="bg-stone-800/60 border-amber-900/30 text-amber-100 placeholder:text-amber-200/20 font-mono text-sm"
                />
              </div>
              <Button
                onClick={saveAdminToken}
                disabled={savingAdminToken || !adminTokenInput.trim()}
                className="bg-amber-600 text-stone-950 hover:bg-amber-500 font-medium"
              >
                {savingAdminToken ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save &amp; Test</>
                )}
              </Button>
            </div>

            {/* Current status indicator */}
            {shopifyStatus?.adminApi?.configured && (
              <div className={`flex items-center gap-2 text-xs ${
                shopifyStatus.adminApi.connected ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {shopifyStatus.adminApi.connected ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                <span>
                  {shopifyStatus.adminApi.connected
                    ? `Currently configured and connected${shopifyStatus.adminApi.shop ? ` to ${shopifyStatus.adminApi.shop}` : ''}`
                    : `Currently configured but not working: ${shopifyStatus.adminApi.error || 'unknown error'}`}
                </span>
              </div>
            )}

            {/* Test result */}
            {adminTestResult && (
              <div className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
                adminTestResult.success
                  ? 'border-emerald-600/30 bg-emerald-900/10 text-emerald-300'
                  : 'border-red-600/30 bg-red-900/10 text-red-300'
              }`}>
                {adminTestResult.success ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{adminTestResult.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ====== 3. PRODUCT OVERVIEW CARD ====== */}
      <Card className="border-amber-900/20 bg-stone-900/60">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-400" />
            Product Overview
          </CardTitle>
          <CardDescription className="text-amber-200/40">
            Current sync status between local database and Shopify
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-amber-200/60">Local Products</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-100">
                {syncStatus?.sync?.localToShopify?.totalLocalProducts ?? '—'}
              </p>
              <p className="text-[10px] text-amber-200/30 mt-1">Products in local database</p>
            </div>
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-amber-200/60">From Shopify</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-100">
                {syncStatus?.sync?.shopifyToLocal?.shopifyProductsInLocalDb ?? 0}
              </p>
              <p className="text-[10px] text-amber-200/30 mt-1">Products pulled from Shopify</p>
            </div>
            <div className="rounded-lg border border-emerald-600/20 bg-emerald-900/10 p-4">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-amber-200/60">Pushed to Shopify</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {syncStatus?.sync?.localToShopify?.pushedToShopify ?? 0}
              </p>
              <p className="text-[10px] text-amber-200/30 mt-1">Local products on Shopify</p>
            </div>
            <div className="rounded-lg border border-amber-600/20 bg-amber-900/10 p-4">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-amber-200/60">Not Yet Pushed</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-400">
                {syncStatus?.sync?.localToShopify?.notYetPushed ?? 0}
              </p>
              <p className="text-[10px] text-amber-200/30 mt-1">Local products not on Shopify</p>
            </div>
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-amber-200/60">Collections Pushed</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-purple-400">
                {syncStatus?.sync?.localToShopify?.categoriesPushed ?? 0} / {syncStatus?.sync?.localToShopify?.totalCategories ?? 0}
              </p>
              <p className="text-[10px] text-amber-200/30 mt-1">Categories synced as collections</p>
            </div>
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-200/40" />
                <span className="text-xs text-amber-200/60">Last Sync</span>
              </div>
              <p className="mt-2 text-sm font-medium text-amber-100">
                {formatDate(syncStatus?.sync?.localToShopify?.lastPushedAt)}
              </p>
              <p className="text-[10px] text-amber-200/30 mt-1">Last push to Shopify</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== 4. PUSH TO SHOPIFY CARD ====== */}
      <Card className="border-amber-900/20 bg-stone-900/60">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Upload className="h-5 w-5 text-amber-400" />
            Push to Shopify
          </CardTitle>
          <CardDescription className="text-amber-200/40">
            Push your local products and categories to your Shopify store. Requires Admin API token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Options */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="push-draft"
                checked={pushAsDraft}
                onCheckedChange={(checked) => setPushAsDraft(checked === true)}
                className="border-amber-600/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <label htmlFor="push-draft" className="text-sm text-amber-200/60 cursor-pointer">
                Push as Draft
              </label>
              <span className="text-xs text-amber-200/30">(vs Active)</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-images"
                checked={includeImages}
                onCheckedChange={(checked) => setIncludeImages(checked === true)}
                className="border-amber-600/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <label htmlFor="include-images" className="text-sm text-amber-200/60 cursor-pointer">
                Include images
              </label>
              <span className="text-xs text-amber-200/30">(uncheck for faster testing)</span>
            </div>
          </div>

          {/* Push Button */}
          <Button
            onClick={pushToShopify}
            disabled={pushing || !shopifyStatus?.adminApi?.connected}
            className="bg-emerald-600 text-white hover:bg-emerald-500 font-semibold text-base px-8 py-6 h-auto"
          >
            {pushing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Pushing Products...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Push All Products to Shopify
              </>
            )}
          </Button>

          {!shopifyStatus?.adminApi?.connected && !pushing && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Admin API token must be configured and working to push products
            </p>
          )}

          {/* Progress Bar */}
          {pushing && (
            <div className="space-y-2">
              <Progress value={pushProgress} className="h-2 bg-stone-800 [&>[data-slot=progress-indicator]]:bg-emerald-500" />
              <p className="text-xs text-amber-200/40">
                {pushProgress < 100
                  ? `Syncing products and collections to Shopify... ${pushProgress}%`
                  : 'Sync complete!'}
              </p>
            </div>
          )}

          {/* Push Result */}
          {pushResult && (
            <div className="rounded-lg border border-emerald-600/30 bg-emerald-900/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">Push Complete</span>
                {pushResult.shop && (
                  <span className="text-xs text-amber-200/30">— {pushResult.shop}</span>
                )}
              </div>

              {/* Summary grid */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 text-sm">
                <div>
                  <span className="text-amber-200/40">Products Created:</span>{' '}
                  <span className="text-emerald-400 font-semibold">{pushResult.products.created}</span>
                </div>
                <div>
                  <span className="text-amber-200/40">Products Updated:</span>{' '}
                  <span className="text-amber-400 font-semibold">{pushResult.products.updated}</span>
                </div>
                <div>
                  <span className="text-amber-200/40">Products Failed:</span>{' '}
                  <span className={pushResult.products.failed > 0 ? 'text-red-400 font-semibold' : 'text-amber-200/60 font-semibold'}>
                    {pushResult.products.failed}
                  </span>
                </div>
                <div>
                  <span className="text-amber-200/40">Collections Created:</span>{' '}
                  <span className="text-purple-400 font-semibold">{pushResult.categories.created}</span>
                </div>
                <div>
                  <span className="text-amber-200/40">Collects Created:</span>{' '}
                  <span className="text-blue-400 font-semibold">{pushResult.collects.created}</span>
                </div>
              </div>

              {/* Errors */}
              {(pushResult.products.failed > 0 || pushResult.categories.failed > 0) && (
                <div className="rounded border border-red-600/30 bg-red-900/10 p-3 space-y-2">
                  <p className="text-xs font-medium text-red-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Errors
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {pushResult.categories.details
                      .filter((d) => d.status === 'failed')
                      .map((d, i) => (
                        <p key={`cat-${i}`} className="text-xs text-red-200/60">
                          <span className="text-red-400">Collection: {d.name}</span> — {d.error}
                        </p>
                      ))}
                    {pushResult.products.details
                      .filter((d) => d.status === 'failed')
                      .map((d, i) => (
                        <p key={`prod-${i}`} className="text-xs text-red-200/60">
                          <span className="text-red-400">Product: {d.name}</span> — {d.error}
                        </p>
                      ))}
                  </div>
                </div>
              )}

              {/* Expandable Sync Log */}
              {pushResult.products.details.length > 0 && (
                <Collapsible open={logOpen} onOpenChange={setLogOpen}>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-amber-200/40 hover:text-amber-400 transition-colors">
                    <FileText className="h-3 w-3" />
                    View Sync Log ({pushResult.products.details.length + pushResult.categories.details.length} entries)
                    {logOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 max-h-64 overflow-y-auto rounded border border-amber-900/20 bg-stone-800/30 p-2 space-y-0.5">
                      {/* Categories */}
                      {pushResult.categories.details.length > 0 && (
                        <div className="text-[10px] text-amber-200/30 font-medium uppercase tracking-wider py-1">Collections</div>
                      )}
                      {pushResult.categories.details.map((entry, i) => (
                        <div key={`c-${i}`} className="flex items-start gap-2 text-xs py-0.5">
                          <Badge className={`shrink-0 text-[10px] px-1.5 py-0 ${
                            entry.status === 'created' ? 'bg-purple-900/30 text-purple-400 border-purple-600/30' :
                            entry.status === 'updated' ? 'bg-amber-900/30 text-amber-400 border-amber-600/30' :
                            'bg-red-900/30 text-red-400 border-red-600/30'
                          }`}>
                            {entry.status}
                          </Badge>
                          <span className="text-amber-100">{entry.name}</span>
                          {entry.shopifyId && (
                            <span className="text-amber-200/20 text-[10px]">→ {entry.shopifyId.split('/').pop()}</span>
                          )}
                          {entry.error && (
                            <span className="text-red-400/60 text-[10px]">{entry.error}</span>
                          )}
                        </div>
                      ))}
                      {/* Products */}
                      {pushResult.products.details.length > 0 && (
                        <div className="text-[10px] text-amber-200/30 font-medium uppercase tracking-wider py-1 mt-2">Products</div>
                      )}
                      {pushResult.products.details.map((entry, i) => (
                        <div key={`p-${i}`} className="flex items-start gap-2 text-xs py-0.5">
                          <Badge className={`shrink-0 text-[10px] px-1.5 py-0 ${
                            entry.status === 'created' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-600/30' :
                            entry.status === 'updated' ? 'bg-amber-900/30 text-amber-400 border-amber-600/30' :
                            entry.status === 'skipped' ? 'bg-stone-800 text-amber-200/40 border-amber-900/20' :
                            'bg-red-900/30 text-red-400 border-red-600/30'
                          }`}>
                            {entry.status}
                          </Badge>
                          <span className="text-amber-100">{entry.name}</span>
                          {entry.shopifyId && (
                            <span className="text-amber-200/20 text-[10px]">→ {entry.shopifyId.split('/').pop()}</span>
                          )}
                          {entry.error && (
                            <span className="text-red-400/60 text-[10px]">{entry.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && !pushResult && (
            <div className="rounded-lg border border-red-600/30 bg-red-900/10 p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-300">{error}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== 5. SYNC FROM SHOPIFY CARD ====== */}
      <Card className="border-amber-900/20 bg-stone-900/60">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-amber-400" />
            Sync from Shopify
          </CardTitle>
          <CardDescription className="text-amber-200/40">
            Pull products from Shopify to your local database. Uses Storefront API — no Admin token needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={pullFromShopify}
              disabled={pulling}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              {pulling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Sync from Shopify
                </>
              )}
            </Button>
            <span className="text-xs text-amber-200/30">
              Fetches all products from Shopify and creates/updates them locally
            </span>
          </div>

          {pullResult && (
            <div className="rounded-lg border border-blue-600/30 bg-blue-900/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Sync Complete</span>
              </div>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 text-sm">
                <div>
                  <span className="text-amber-200/40">Total Synced:</span>{' '}
                  <span className="text-amber-100">{pullResult.synced}</span>
                </div>
                <div>
                  <span className="text-amber-200/40">Created:</span>{' '}
                  <span className="text-emerald-400">{pullResult.created}</span>
                </div>
                <div>
                  <span className="text-amber-200/40">Updated:</span>{' '}
                  <span className="text-amber-400">{pullResult.updated}</span>
                </div>
                <div>
                  <span className="text-amber-200/40">Categories:</span>{' '}
                  <span className="text-purple-400">{pullResult.categoriesSynced}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== 6. PRODUCT MAPPING TABLE ====== */}
      <Card className="border-amber-900/20 bg-stone-900/60">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-amber-400" />
            Product Mapping
          </CardTitle>
          <CardDescription className="text-amber-200/40">
            Overview of all local products and their Shopify sync status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1">
              {([
                { value: 'all' as const, label: 'All' },
                { value: 'not-pushed' as const, label: 'Not Pushed' },
                { value: 'pushed' as const, label: 'Pushed' },
              ]).map((f) => (
                <Button
                  key={f.value}
                  variant={productFilter === f.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProductFilter(f.value)}
                  className={
                    productFilter === f.value
                      ? 'bg-amber-600 text-stone-950 hover:bg-amber-500'
                      : 'border-amber-900/30 text-amber-200/50 hover:bg-amber-900/20 hover:text-amber-400'
                  }
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-200/30" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="bg-stone-800/60 border-amber-900/30 text-amber-100 placeholder:text-amber-200/20 pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="max-h-96 overflow-y-auto rounded border border-amber-900/20">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/40">Product Name</TableHead>
                  <TableHead className="text-amber-200/40">Price</TableHead>
                  <TableHead className="text-amber-200/40 hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-amber-200/40">Shopify Status</TableHead>
                  <TableHead className="text-amber-200/40 hidden md:table-cell">Shopify ID</TableHead>
                  <TableHead className="text-amber-200/40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-amber-200/30 py-8">
                      No products found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="border-amber-900/10 hover:bg-stone-800/30">
                      <TableCell>
                        <div className="max-w-[200px] truncate text-amber-100 text-sm font-medium">
                          {product.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-amber-200/60 text-sm">
                        ₹{product.price.toLocaleString('en-IN')}
                        {product.compareAtPrice && (
                          <span className="ml-1 text-xs line-through text-amber-200/30">
                            ₹{product.compareAtPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-amber-200/50 text-sm hidden sm:table-cell">
                        {product.category}
                      </TableCell>
                      <TableCell>
                        {product.shopifyId ? (
                          <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-600/30 text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Pushed
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-900/30 text-amber-400 border-amber-600/30 text-xs">
                            <ArrowUpFromLine className="mr-1 h-3 w-3" />
                            Not Pushed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-amber-200/30 text-xs font-mono hidden md:table-cell">
                        {product.shopifyId
                          ? product.shopifyId.replace('gid://shopify/Product/', '')
                          : '—'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!product.shopifyId && shopifyStatus?.adminApi?.connected && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-amber-200/40 hover:text-emerald-400"
                              title="Push individual product"
                            >
                              <Upload className="h-3 w-3" />
                            </Button>
                          )}
                          {product.shopifyId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-amber-200/40 hover:text-blue-400"
                              title="View on Shopify"
                              asChild
                            >
                              <a
                                href={`https://3boxesluxury-2.myshopify.com/admin/products/${product.shopifyId.replace('gid://shopify/Product/', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-amber-200/40 hover:text-amber-400"
                            title="View details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-amber-200/30">
            Showing {filteredProducts.length} of {localProducts.length} local products
          </p>
        </CardContent>
      </Card>

      {/* ====== 7. CATEGORY MAPPING TABLE ====== */}
      <Card className="border-amber-900/20 bg-stone-900/60">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-amber-400" />
            Category Mapping
          </CardTitle>
          <CardDescription className="text-amber-200/40">
            Overview of categories and their Shopify collection mapping status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-y-auto rounded border border-amber-900/20">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/40">Category</TableHead>
                  <TableHead className="text-amber-200/40 hidden sm:table-cell">Slug</TableHead>
                  <TableHead className="text-amber-200/40">Products</TableHead>
                  <TableHead className="text-amber-200/40">Shopify Status</TableHead>
                  <TableHead className="text-amber-200/40 hidden md:table-cell">Shopify Collection ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-amber-200/30 py-8">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id} className="border-amber-900/10 hover:bg-stone-800/30">
                      <TableCell className="text-amber-100 text-sm font-medium">
                        {cat.name}
                      </TableCell>
                      <TableCell className="text-amber-200/40 text-xs font-mono hidden sm:table-cell">
                        {cat.slug}
                      </TableCell>
                      <TableCell className="text-amber-200/60 text-sm">
                        {cat.productCount}
                      </TableCell>
                      <TableCell>
                        {cat.shopifyId ? (
                          <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-600/30 text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Synced
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-900/30 text-amber-400 border-amber-600/30 text-xs">
                            <ArrowUpFromLine className="mr-1 h-3 w-3" />
                            Not Pushed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-amber-200/30 text-xs font-mono hidden md:table-cell">
                        {cat.shopifyId
                          ? cat.shopifyId.replace('gid://shopify/CustomCollection/', '').replace('gid://shopify/Collection/', '')
                          : '—'
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-amber-200/30 mt-2">
            {categories.filter(c => c.shopifyId).length} of {categories.length} categories synced to Shopify collections
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
