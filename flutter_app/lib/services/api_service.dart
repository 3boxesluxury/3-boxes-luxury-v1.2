import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/app_models.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _authToken;
  
  void setAuthToken(String token) => _authToken = token;
  void clearAuthToken() => _authToken = null;
  String? get authToken => _authToken;

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  Future<Map<String, dynamic>> _get(String path, {Map<String, String>? queryParams}) async {
    final uri = Uri.parse('${AppConfig.effectiveBaseUrl}$path').replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: _headers);
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw ApiException(response.statusCode, response.body);
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('${AppConfig.effectiveBaseUrl}$path');
    final response = await http.post(uri, headers: _headers, body: json.encode(body));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(response.body);
    }
    throw ApiException(response.statusCode, response.body);
  }

  Future<Map<String, dynamic>> _put(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('${AppConfig.effectiveBaseUrl}$path');
    final response = await http.put(uri, headers: _headers, body: json.encode(body));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(response.body);
    }
    throw ApiException(response.statusCode, response.body);
  }

  Future<Map<String, dynamic>> _delete(String path) async {
    final uri = Uri.parse('${AppConfig.effectiveBaseUrl}$path');
    final response = await http.delete(uri, headers: _headers);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(response.body);
    }
    throw ApiException(response.statusCode, response.body);
  }

  // Products
  Future<List<Product>> getProducts({String? category, String? search, int? limit, int? offset}) async {
    final params = <String, String>{};
    if (category != null) params['category'] = category;
    if (search != null) params['search'] = search;
    if (limit != null) params['limit'] = limit.toString();
    if (offset != null) params['offset'] = offset.toString();
    
    final data = await _get(AppConfig.productsApi, queryParams: params.isNotEmpty ? params : null);
    final products = (data['products'] as List?)?.map((e) => Product.fromJson(e)).toList() ?? [];
    return products;
  }

  Future<Product> getProduct(String id) async {
    final data = await _get('${AppConfig.productsApi}/$id');
    return Product.fromJson(data['product'] ?? data);
  }

  // Categories
  Future<List<Category>> getCategories() async {
    final data = await _get(AppConfig.categoriesApi);
    final categories = (data['categories'] as List?)?.map((e) => Category.fromJson(e)).toList() ?? [];
    return categories;
  }

  // Auth
  Future<Map<String, dynamic>> login(String email, String password) async {
    return await _post(AppConfig.authLoginApi, {'email': email, 'password': password});
  }

  Future<Map<String, dynamic>> register(String name, String email, String password) async {
    return await _post(AppConfig.authRegisterApi, {'name': name, 'email': email, 'password': password});
  }

  Future<User?> getMe() async {
    try {
      final data = await _get(AppConfig.authMeApi);
      return User.fromJson(data['user'] ?? data);
    } catch (_) {
      return null;
    }
  }

  // Cart
  Future<Map<String, dynamic>> getCart() async {
    return await _get(AppConfig.cartApi);
  }

  Future<Map<String, dynamic>> addToCart(CartItem item) async {
    return await _post(AppConfig.cartApi, item.toJson());
  }

  Future<Map<String, dynamic>> updateCartItem(String productId, int quantity) async {
    return await _put(AppConfig.cartApi, {'productId': productId, 'quantity': quantity});
  }

  Future<Map<String, dynamic>> removeFromCart(String productId) async {
    return await _delete('${AppConfig.cartApi}?productId=$productId');
  }

  // Orders
  Future<List<Order>> getOrders() async {
    final data = await _get(AppConfig.ordersApi);
    final orders = (data['orders'] as List?)?.map((e) => Order.fromJson(e)).toList() ?? [];
    return orders;
  }

  Future<Order> getOrder(String id) async {
    final data = await _get('${AppConfig.ordersApi}/$id');
    return Order.fromJson(data['order'] ?? data);
  }

  // Checkout
  Future<Map<String, dynamic>> checkout(Map<String, dynamic> checkoutData) async {
    return await _post(AppConfig.checkoutApi, checkoutData);
  }

  Future<Map<String, dynamic>> estimateShipping(Map<String, dynamic> address) async {
    return await _post('${AppConfig.checkoutApi}/estimate', address);
  }

  // Wishlist
  Future<List<Product>> getWishlist() async {
    final data = await _get(AppConfig.wishlistApi);
    final products = (data['items'] as List?)?.map((e) => Product.fromJson(e)).toList() ?? [];
    return products;
  }

  Future<Map<String, dynamic>> addToWishlist(String productId) async {
    return await _post(AppConfig.wishlistApi, {'productId': productId});
  }

  Future<Map<String, dynamic>> removeFromWishlist(String productId) async {
    return await _delete('${AppConfig.wishlistApi}?productId=$productId');
  }

  // Gift Recommendations
  Future<List<GiftRecommendation>> getGiftRecommendations(Map<String, dynamic> preferences) async {
    final data = await _post(AppConfig.giftRecommendApi, preferences);
    final recommendations = (data['recommendations'] as List?)?.map((e) => GiftRecommendation.fromJson(e)).toList() ?? [];
    return recommendations;
  }

  // Offers
  Future<List<Map<String, dynamic>>> getOffers() async {
    final data = await _get(AppConfig.offersApi);
    return List<Map<String, dynamic>>.from(data['offers'] ?? []);
  }

  // Currency
  Future<Map<String, dynamic>> getCurrencyRates() async {
    return await _get(AppConfig.currencyRatesApi);
  }

  // Geo
  Future<Map<String, dynamic>> getGeoInfo() async {
    return await _get(AppConfig.geoApi);
  }

  // Admin APIs
  Future<Map<String, dynamic>> getAdminProducts() async {
    return await _get('${AppConfig.productsApi}?limit=100');
  }

  Future<Map<String, dynamic>> getAdminOrders() async {
    return await _get(AppConfig.ordersApi);
  }

  Future<Map<String, dynamic>> getAdminUsers() async {
    return await _get('/api/admin/users');
  }

  Future<Map<String, dynamic>> getAdminCategories() async {
    return await _get('/api/admin/categories');
  }

  // Admin write operations
  Future<Map<String, dynamic>> adminCreateProduct(Map<String, dynamic> data) async {
    return await _post('/api/admin/products', data);
  }

  Future<Map<String, dynamic>> adminUpdateProduct(String id, Map<String, dynamic> data) async {
    return await _put('/api/admin/products/$id', data);
  }

  Future<Map<String, dynamic>> adminDeleteProduct(String id) async {
    return await _delete('/api/admin/products/$id');
  }

  Future<Map<String, dynamic>> adminUpdateOrder(String id, Map<String, dynamic> data) async {
    return await _put('/api/admin/orders/$id', data);
  }

  Future<Map<String, dynamic>> adminUpdateUser(String id, Map<String, dynamic> data) async {
    return await _put('/api/admin/users/$id', data);
  }

  Future<Map<String, dynamic>> adminCreateCategory(Map<String, dynamic> data) async {
    return await _post('/api/admin/categories', data);
  }

  Future<Map<String, dynamic>> adminUpdateCategory(String id, Map<String, dynamic> data) async {
    return await _put('/api/admin/categories/$id', data);
  }

  // Corporate APIs
  Future<Map<String, dynamic>> getCorporateCampaigns() async {
    return await _get('/api/corporate/campaigns');
  }

  Future<Map<String, dynamic>> createCorporateCampaign(Map<String, dynamic> data) async {
    return await _post('/api/corporate/campaigns', data);
  }

  Future<Map<String, dynamic>> sendCorporateCampaignGifts(String campaignId) async {
    return await _post('/api/corporate/campaigns/$campaignId/send', {});
  }

  Future<Map<String, dynamic>> updateCorporateBranding(Map<String, dynamic> data) async {
    return await _put('/api/corporate/branding', data);
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  
  @override
  String toString() => 'ApiException($statusCode): $message';
}
