import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_models.dart';
import '../services/api_service.dart';
import '../config/app_config.dart';

// App State Provider - Main state management
class AppProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  // Navigation
  int _currentTab = 0;
  int get currentTab => _currentTab;
  void setTab(int tab) {
    _currentTab = tab;
    notifyListeners();
  }

  // Auth
  User? _user;
  User? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get isAdmin => _user?.isAdmin ?? false;

  // Products
  List<Product> _products = [];
  List<Product> get products => _products;
  List<Product> _featuredProducts = [];
  List<Product> get featuredProducts => _featuredProducts;
  
  // Categories
  List<Category> _categories = [];
  List<Category> get categories => _categories;
  String? _selectedCategory;
  String? get selectedCategory => _selectedCategory;
  
  // Cart
  List<CartItem> _cartItems = [];
  List<CartItem> get cartItems => _cartItems;
  int get cartCount => _cartItems.fold(0, (sum, item) => sum + item.quantity);
  double get cartTotal => _cartItems.fold(0, (sum, item) => sum + item.price * item.quantity);

  // Wishlist
  List<String> _wishlistIds = [];
  List<String> get wishlistIds => _wishlistIds;

  // Search
  String _searchQuery = '';
  String get searchQuery => _searchQuery;

  // Currency
  String _currencyCode = 'INR';
  String _currencySymbol = '₹';
  double _currencyRate = 1.0;
  String get currencyCode => _currencyCode;
  String get currencySymbol => _currencySymbol;

  // Loading states
  bool _isLoading = false;
  bool get isLoading => _isLoading;
  bool _isSearching = false;
  bool get isSearching => _isSearching;

  // Selected product
  Product? _selectedProduct;
  Product? get selectedProduct => _selectedProduct;

  // Initialize
  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();
    
    try {
      // Restore auth token from SharedPreferences before making API calls
      final prefs = await SharedPreferences.getInstance();
      final savedToken = prefs.getString('auth_token');
      if (savedToken != null) {
        _api.setAuthToken(savedToken);
      }

      await Future.wait([
        loadCategories(),
        loadProducts(),
        loadCurrency(),
      ]);
      
      // Try to restore auth
      final user = await _api.getMe();
      if (user != null) {
        _user = user;

        // Load cart from backend
        try {
          final cartData = await _api.getCart();
          final List<dynamic> items = cartData['items'] ?? [];
          _cartItems = items.map((e) => CartItem.fromJson(e)).toList();
        } catch (_) {
          // Cart might be empty, that's fine
        }

        // Load wishlist from backend
        try {
          final wishlistData = await _api.getWishlist();
          _wishlistIds = wishlistData.map((p) => p.id).toList();
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('Init error: $e');
    }
    
    _isLoading = false;
    notifyListeners();
  }

  // Categories
  Future<void> loadCategories() async {
    try {
      _categories = await _api.getCategories();
      notifyListeners();
    } catch (e) {
      debugPrint('Categories error: $e');
    }
  }

  void setCategory(String? slug) {
    _selectedCategory = slug;
    loadProducts();
    notifyListeners();
  }

  // Products
  Future<void> loadProducts() async {
    try {
      _products = await _api.getProducts(
        category: _selectedCategory,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        limit: 50,
      );
      _featuredProducts = _products.where((p) => p.featured).toList();
      notifyListeners();
    } catch (e) {
      debugPrint('Products error: $e');
    }
  }

  void selectProduct(Product product) {
    _selectedProduct = product;
    notifyListeners();
  }

  void clearSelectedProduct() {
    _selectedProduct = null;
    notifyListeners();
  }

  // Search
  void setSearch(String query) {
    _searchQuery = query;
    _isSearching = query.isNotEmpty;
    loadProducts();
    notifyListeners();
  }

  void clearSearch() {
    _searchQuery = '';
    _isSearching = false;
    loadProducts();
    notifyListeners();
  }

  // Cart operations
  Future<void> addToCart(Product product) async {
    final existingIndex = _cartItems.indexWhere((item) => item.productId == product.id);
    if (existingIndex >= 0) {
      _cartItems[existingIndex].quantity++;
    } else {
      _cartItems.add(CartItem(
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images.isNotEmpty ? AppConfig.getImageUrl(product.images[0]) : '/images/logo.png',
      ));
    }
    notifyListeners();
    
    // Sync with backend if logged in
    if (isLoggedIn) {
      try {
        await _api.addToCart(_cartItems[existingIndex >= 0 ? existingIndex : _cartItems.length - 1]);
      } catch (_) {}
    }
  }

  Future<void> removeFromCart(String productId) async {
    _cartItems.removeWhere((item) => item.productId == productId);
    notifyListeners();

    // Sync with backend if logged in
    if (isLoggedIn) {
      try {
        await _api.removeFromCart(productId);
      } catch (_) {}
    }
  }

  Future<void> updateCartQuantity(String productId, int quantity) async {
    final index = _cartItems.indexWhere((item) => item.productId == productId);
    if (index >= 0) {
      if (quantity <= 0) {
        _cartItems.removeAt(index);
      } else {
        _cartItems[index].quantity = quantity;
      }
    }
    notifyListeners();

    // Sync with backend if logged in
    if (isLoggedIn) {
      try {
        await _api.updateCartItem(productId, quantity);
      } catch (_) {}
    }
  }

  Future<void> clearCart() async {
    // Save product IDs before clearing local state
    final productIds = _cartItems.map((item) => item.productId).toList();
    _cartItems = [];
    notifyListeners();

    // Sync with backend if logged in
    if (isLoggedIn) {
      try {
        for (final productId in productIds) {
          await _api.removeFromCart(productId);
        }
      } catch (_) {}
    }
  }

  // Wishlist
  Future<void> toggleWishlist(String productId) async {
    if (_wishlistIds.contains(productId)) {
      _wishlistIds.remove(productId);
      if (isLoggedIn) {
        try { await _api.removeFromWishlist(productId); } catch (_) {}
      }
    } else {
      _wishlistIds.add(productId);
      if (isLoggedIn) {
        try { await _api.addToWishlist(productId); } catch (_) {}
      }
    }
    notifyListeners();
  }

  bool isInWishlist(String productId) => _wishlistIds.contains(productId);

  // Auth
  Future<bool> login(String email, String password) async {
    try {
      final data = await _api.login(email, password);
      _user = User.fromJson(data['user']);

      // Save auth token
      final token = data['token'] as String?;
      if (token != null) {
        _api.setAuthToken(token);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
      }

      notifyListeners();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> register(String name, String email, String password) async {
    try {
      final data = await _api.register(name, email, password);
      _user = User.fromJson(data['user']);

      // Save auth token
      final token = data['token'] as String?;
      if (token != null) {
        _api.setAuthToken(token);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
      }

      notifyListeners();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> logout() async {
    _user = null;
    _api.clearAuthToken();

    // Clear saved token
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');

    notifyListeners();
  }

  // Currency
  Future<void> loadCurrency() async {
    try {
      final data = await _api.getCurrencyRates();
      _currencyCode = data['code'] ?? 'INR';
      _currencySymbol = data['symbol'] ?? '₹';
      _currencyRate = (data['rate'] ?? 1.0).toDouble();
      notifyListeners();
    } catch (_) {}
  }

  String formatPrice(double price) {
    final converted = price * _currencyRate;
    return '$_currencySymbol${converted.toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => ',')}';
  }

  // Gift Recommendations
  Future<List<GiftRecommendation>> getGiftRecommendations({
    required String occasion,
    required String recipient,
    required String relationship,
    required double budget,
  }) async {
    try {
      return await _api.getGiftRecommendations({
        'occasion': occasion,
        'recipient': recipient,
        'relationship': relationship,
        'budget': budget,
      });
    } catch (e) {
      return [];
    }
  }
}
