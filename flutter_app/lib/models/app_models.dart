// Product model
class Product {
  final String id;
  final String name;
  final String slug;
  final String description;
  final double price;
  final double? compareAtPrice;
  final List<String> images;
  final String category;
  final String categorySlug;
  final int stock;
  final double rating;
  final int reviewCount;
  final bool featured;
  final List<String> tags;
  final bool isExternal;
  final String? platform;
  final String? sourceUrl;
  final String? affiliateUrl;
  final String? platformLogo;
  final double? commission;

  Product({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    required this.price,
    this.compareAtPrice,
    required this.images,
    required this.category,
    required this.categorySlug,
    required this.stock,
    required this.rating,
    required this.reviewCount,
    required this.featured,
    required this.tags,
    this.isExternal = false,
    this.platform,
    this.sourceUrl,
    this.affiliateUrl,
    this.platformLogo,
    this.commission,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      compareAtPrice: json['compareAtPrice'] != null ? (json['compareAtPrice']).toDouble() : null,
      images: List<String>.from(json['images'] ?? []),
      category: json['category'] ?? '',
      categorySlug: json['categorySlug'] ?? '',
      stock: json['stock'] ?? 0,
      rating: (json['rating'] ?? 0).toDouble(),
      reviewCount: json['reviewCount'] ?? 0,
      featured: json['featured'] ?? false,
      tags: List<String>.from(json['tags'] ?? []),
      isExternal: json['isExternal'] ?? false,
      platform: json['platform'],
      sourceUrl: json['sourceUrl'],
      affiliateUrl: json['affiliateUrl'],
      platformLogo: json['platformLogo'],
      commission: json['commission'] != null ? (json['commission']).toDouble() : null,
    );
  }

  int get discountPercent {
    if (compareAtPrice != null && compareAtPrice! > price) {
      return ((compareAtPrice! - price) / compareAtPrice! * 100).round();
    }
    return 0;
  }
}

// Category model
class Category {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? image;
  final int productCount;

  Category({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.image,
    this.productCount = 0,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'],
      image: json['image'],
      productCount: json['productCount'] ?? 0,
    );
  }
}

// CartItem model
class CartItem {
  final String productId;
  final String name;
  final double price;
  final String image;
  int quantity;

  CartItem({
    required this.productId,
    required this.name,
    required this.price,
    required this.image,
    this.quantity = 1,
  });

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'name': name,
    'price': price,
    'image': image,
    'quantity': quantity,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      productId: json['productId'] ?? '',
      name: json['name'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      image: json['image'] ?? '',
      quantity: json['quantity'] ?? 1,
    );
  }
}

// User model
class User {
  final String id;
  final String name;
  final String email;
  final String role;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'CUSTOMER',
    );
  }

  bool get isAdmin => role == 'ADMIN';
  bool get isAgent => role == 'AGENT';
  bool get isTeamLead => role == 'TEAM_LEAD';
  bool get isCorporate => role == 'CORPORATE';
}

// Order model
class Order {
  final String id;
  final String orderNumber;
  final double total;
  final String status;
  final List<OrderItem> items;
  final DateTime createdAt;

  Order({
    required this.id,
    required this.orderNumber,
    required this.total,
    required this.status,
    required this.items,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] ?? '',
      orderNumber: json['orderNumber'] ?? '',
      total: (json['total'] ?? 0).toDouble(),
      status: json['status'] ?? 'pending',
      items: (json['items'] as List?)?.map((e) => OrderItem.fromJson(e)).toList() ?? [],
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
    );
  }
}

class OrderItem {
  final String name;
  final double price;
  final int quantity;
  final String? image;

  OrderItem({required this.name, required this.price, required this.quantity, this.image});

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      name: json['name'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      quantity: json['quantity'] ?? 1,
      image: json['image'],
    );
  }
}

// Gift recommendation
class GiftRecommendation {
  final String id;
  final String name;
  final double price;
  final String image;
  final String reason;
  final String category;

  GiftRecommendation({
    required this.id,
    required this.name,
    required this.price,
    required this.image,
    required this.reason,
    required this.category,
  });

  factory GiftRecommendation.fromJson(Map<String, dynamic> json) {
    return GiftRecommendation(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      image: json['image'] ?? '',
      reason: json['reason'] ?? '',
      category: json['category'] ?? '',
    );
  }
}

// Currency rate
class CurrencyInfo {
  final String code;
  final String symbol;
  final double rate;

  CurrencyInfo({required this.code, required this.symbol, required this.rate});
}
