import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConfig {
  // Production URL (Vercel deployment)
  static const String productionUrl = 'https://my-project-sepia-seven-42.vercel.app';
  // Local development URL (Android emulator via 10.0.2.2)
  static const String localUrl = 'http://10.0.2.2:81';

  // Use production URL by default; override with --dart-define=API_URL=... for local dev
  static const String baseUrl = String.fromEnvironment('API_URL', defaultValue: productionUrl);

  // Get the appropriate base URL for the current platform
  static String get effectiveBaseUrl {
    // For Flutter Web, use same origin (empty string = relative URLs)
    if (kIsWeb) return '';
    // For all native platforms, use the configured baseUrl (production by default)
    return baseUrl;
  }

  // API endpoints
  static const String productsApi = '/api/products';
  static const String categoriesApi = '/api/categories';
  static const String cartApi = '/api/cart';
  static const String ordersApi = '/api/orders';
  static const String authLoginApi = '/api/auth/login';
  static const String authRegisterApi = '/api/auth/register';
  static const String authMeApi = '/api/auth/me';
  static const String checkoutApi = '/api/checkout';
  static const String wishlistApi = '/api/wishlist';
  static const String giftRecommendApi = '/api/gift-recommend';
  static const String currencyRatesApi = '/api/currency/rates';
  static const String geoApi = '/api/geo';
  static const String imageProxy = '/api/image-proxy';
  static const String offersApi = '/api/offers';

  // App info
  static const String appName = '3 BOXES LUXURY';
  static const String appTagline = 'Curated Luxury Gifting';

  // Currency defaults
  static const String defaultCurrency = 'INR';
  static const String defaultCurrencySymbol = '₹';

  // Colors
  static const int primaryGold = 0xFFD4A437;
  static const int darkBg = 0xFF0C0A09;
  static const int cardBg = 0xFF1C1917;
  static const int surfaceBg = 0xFF292524;

  static String getImageUrl(String? path) {
    if (path == null || path.isEmpty) return '${effectiveBaseUrl}/images/logo-uploaded.png';
    // Data URLs (base64) can be used directly
    if (path.startsWith('data:')) return path;
    // Vercel Blob URLs are absolute and can be used directly
    if (path.startsWith('http://') || path.startsWith('https://')) {
      // Shopify CDN and Vercel Blob URLs work directly without proxy
      if (path.contains('cdn.shopify.com') || path.contains('blob.vercel-storage.com') || path.contains('vercel.app')) {
        return path;
      }
      return '${effectiveBaseUrl}/api/image-proxy?url=${Uri.encodeComponent(path)}';
    }
    return '$effectiveBaseUrl$path';
  }
}
