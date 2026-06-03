import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../../widgets/product_card.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _currentImageIndex = 0;
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);
    const cardBg = Color(AppConfig.cardBg);

    final provider = context.watch<AppProvider>();
    final product = provider.selectedProduct;

    if (product == null) {
      return Scaffold(
        backgroundColor: darkBg,
        appBar: AppBar(backgroundColor: darkBg),
        body: const Center(
          child: Text(
            'Product not found',
            style: TextStyle(color: Colors.white54),
          ),
        ),
      );
    }

    final isInWishlist = provider.isInWishlist(product.id);
    final relatedProducts = provider.products
        .where((p) => p.categorySlug == product.categorySlug && p.id != product.id)
        .take(6)
        .toList();

    return Scaffold(
      backgroundColor: darkBg,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Container(
          margin: const EdgeInsets.only(left: 8, top: 4, bottom: 4),
          decoration: BoxDecoration(
            color: cardBg.withOpacity(0.8),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: gold, size: 20),
            onPressed: () {
              provider.clearSelectedProduct();
              Navigator.of(context).pop();
            },
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8, top: 4, bottom: 4),
            decoration: BoxDecoration(
              color: cardBg.withOpacity(0.8),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: Icon(
                isInWishlist ? Icons.favorite : Icons.favorite_border,
                color: isInWishlist ? Colors.redAccent : gold,
                size: 20,
              ),
              onPressed: () {
                provider.toggleWishlist(product.id);
              },
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Image Carousel ──
            _ImageCarousel(
              product: product,
              pageController: _pageController,
              onPageChanged: (index) {
                setState(() => _currentImageIndex = index);
              },
            ),

            // Indicator dots
            if (product.images.length > 1)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    product.images.length,
                    (index) => AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: _currentImageIndex == index ? 20 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: _currentImageIndex == index
                            ? gold
                            : Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),

            // ── Product Info ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: gold.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: gold.withOpacity(0.3),
                        width: 0.5,
                      ),
                    ),
                    child: Text(
                      product.category.toUpperCase(),
                      style: GoogleFonts.poppins(
                        color: gold,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Product name
                  Text(
                    product.name,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Star rating with review count
                  Row(
                    children: [
                      _buildStarRating(product.rating, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        '${product.rating.toStringAsFixed(1)}',
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '(${product.reviewCount} reviews)',
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.4),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Price row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      // Current price
                      Text(
                        provider.formatPrice(product.price),
                        style: GoogleFonts.poppins(
                          color: gold,
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Compare-at price
                      if (product.compareAtPrice != null &&
                          product.compareAtPrice! > product.price) ...[
                        Text(
                          provider.formatPrice(product.compareAtPrice!),
                          style: GoogleFonts.poppins(
                            color: Colors.white.withOpacity(0.35),
                            fontSize: 16,
                            decoration: TextDecoration.lineThrough,
                            decorationColor: Colors.white.withOpacity(0.35),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Discount %
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.green.shade700,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '-${product.discountPercent}%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Stock status
                  if (!product.isExternal)
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: product.stock > 0 ? Colors.green : Colors.red,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          product.stock > 0
                              ? 'In Stock (${product.stock} available)'
                              : 'Out of Stock',
                          style: GoogleFonts.poppins(
                            color: product.stock > 0
                                ? Colors.green.shade300
                                : Colors.red.shade300,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),

                  // Platform badge for external products
                  if (product.isExternal && product.platform != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: _getPlatformColor(product.platform!).withOpacity(0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: _getPlatformColor(product.platform!).withOpacity(0.4),
                                width: 0.5,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.open_in_new,
                                  size: 14,
                                  color: _getPlatformColor(product.platform!),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Available on ${product.platform}',
                                  style: GoogleFonts.poppins(
                                    color: _getPlatformColor(product.platform!),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Divider
                  Container(height: 0.5, color: const Color(0xFF44403C)),

                  const SizedBox(height: 20),

                  // Description header
                  Text(
                    'Description',
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Description text
                  Text(
                    product.description.isNotEmpty
                        ? product.description
                        : 'No description available for this product.',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 14,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Tags
                  if (product.tags.isNotEmpty)
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: product.tags.map((tag) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(AppConfig.surfaceBg),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '#$tag',
                            style: GoogleFonts.poppins(
                              color: gold.withOpacity(0.7),
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                  // ── Related Products ──
                  if (relatedProducts.isNotEmpty) ...[
                    const SizedBox(height: 32),
                    Container(height: 0.5, color: const Color(0xFF44403C)),
                    const SizedBox(height: 20),
                    Text(
                      'Related Products',
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 280,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: relatedProducts.length,
                        itemBuilder: (context, index) {
                          final relatedProduct = relatedProducts[index];
                          return Padding(
                            padding: const EdgeInsets.only(right: 12),
                            child: SizedBox(
                              width: 160,
                              child: ProductCard(
                                product: relatedProduct,
                                onTap: () {
                                  provider.selectProduct(relatedProduct);
                                  _pageController.jumpToPage(0);
                                  setState(() => _currentImageIndex = 0);
                                },
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],

                  const SizedBox(height: 100), // Space for bottom buttons
                ],
              ),
            ),
          ],
        ),
      ),

      // ── Bottom Action Bar ──
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        decoration: BoxDecoration(
          color: cardBg,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: product.isExternal
              ? _buildExternalButton(context, product)
              : _buildAddToCartButton(context, product),
        ),
      ),
    );
  }

  Widget _buildAddToCartButton(BuildContext context, Product product) {
    const gold = Color(AppConfig.primaryGold);
    final provider = context.read<AppProvider>();

    return Row(
      children: [
        // Wishlist button
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: const Color(AppConfig.surfaceBg),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: gold.withOpacity(0.3),
              width: 0.5,
            ),
          ),
          child: IconButton(
            icon: Icon(
              provider.isInWishlist(product.id)
                  ? Icons.favorite
                  : Icons.favorite_border,
              color: provider.isInWishlist(product.id) ? Colors.redAccent : gold,
              size: 22,
            ),
            onPressed: () => provider.toggleWishlist(product.id),
          ),
        ),
        const SizedBox(width: 12),
        // Add to Cart button
        Expanded(
          child: ElevatedButton(
            onPressed: product.stock > 0
                ? () {
                    provider.addToCart(product);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: const Color(AppConfig.cardBg),
                        content: Row(
                          children: [
                            const Icon(Icons.check_circle, color: Colors.green, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                '${product.name} added to cart',
                                style: const TextStyle(color: Colors.white),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        duration: const Duration(seconds: 2),
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    );
                  }
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: gold,
              disabledBackgroundColor: gold.withOpacity(0.3),
              foregroundColor: const Color(AppConfig.darkBg),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: Text(
              product.stock > 0 ? 'Add to Cart' : 'Out of Stock',
              style: GoogleFonts.poppins(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildExternalButton(BuildContext context, Product product) {
    final platformColor = _getPlatformColor(product.platform ?? '');

    return Row(
      children: [
        // Wishlist button
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: const Color(AppConfig.surfaceBg),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(AppConfig.primaryGold).withOpacity(0.3),
              width: 0.5,
            ),
          ),
          child: IconButton(
            icon: Icon(
              context.watch<AppProvider>().isInWishlist(product.id)
                  ? Icons.favorite
                  : Icons.favorite_border,
              color: context.watch<AppProvider>().isInWishlist(product.id)
                  ? Colors.redAccent
                  : const Color(AppConfig.primaryGold),
              size: 22,
            ),
            onPressed: () => context.read<AppProvider>().toggleWishlist(product.id),
          ),
        ),
        const SizedBox(width: 12),
        // Shop on Platform button
        Expanded(
          child: ElevatedButton(
            onPressed: () {
              // TODO: Launch URL with url_launcher
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: const Color(AppConfig.cardBg),
                  content: Text(
                    'Redirecting to ${product.platform ?? 'platform'}...',
                    style: const TextStyle(color: Colors.white),
                  ),
                  duration: const Duration(seconds: 1),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: platformColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.open_in_new, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Shop on ${product.platform ?? 'Platform'}',
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStarRating(double rating, {double size = 18}) {
    final stars = <Widget>[];
    final fullStars = rating.floor();
    final hasHalf = (rating - fullStars) >= 0.5;

    for (int i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.add(Icon(Icons.star, color: const Color(AppConfig.primaryGold), size: size));
      } else if (i == fullStars && hasHalf) {
        stars.add(Icon(Icons.star_half, color: const Color(AppConfig.primaryGold), size: size));
      } else {
        stars.add(Icon(
          Icons.star_border,
          color: const Color(AppConfig.primaryGold).withOpacity(0.4),
          size: size,
        ));
      }
    }
    return Row(mainAxisSize: MainAxisSize.min, children: stars);
  }

  Color _getPlatformColor(String platform) {
    switch (platform.toLowerCase()) {
      case 'amazon':
        return const Color(0xFFFF9900);
      case 'flipkart':
        return const Color(0xFF2874F0);
      case 'myntra':
        return const Color(0xFFFF3F6C);
      case 'ajio':
        return const Color(0xFF3B3B3B);
      case 'nykaa':
        return const Color(0xFFFFAF87);
      default:
        return const Color(AppConfig.primaryGold);
    }
  }
}

// ════════════════════════════════════════════════════════════════
// Image Carousel
// ════════════════════════════════════════════════════════════════
class _ImageCarousel extends StatelessWidget {
  final Product product;
  final PageController pageController;
  final ValueChanged<int> onPageChanged;

  const _ImageCarousel({
    required this.product,
    required this.pageController,
    required this.onPageChanged,
  });

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    if (product.images.isEmpty) {
      return Container(
        height: 360,
        color: const Color(AppConfig.surfaceBg),
        child: Center(
          child: Icon(Icons.diamond, color: gold.withOpacity(0.4), size: 64),
        ),
      );
    }

    return SizedBox(
      height: 360,
      child: Stack(
        children: [
          PageView.builder(
            controller: pageController,
            itemCount: product.images.length,
            onPageChanged: onPageChanged,
            itemBuilder: (context, index) {
              return Container(
                color: const Color(AppConfig.surfaceBg),
                child: Image.network(
                  AppConfig.getImageUrl(product.images[index]),
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Center(
                    child: Icon(
                      Icons.diamond,
                      color: gold.withOpacity(0.4),
                      size: 64,
                    ),
                  ),
                ),
              );
            },
          ),

          // Gradient at bottom for visual blend
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              height: 60,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    const Color(AppConfig.darkBg).withOpacity(0.8),
                  ],
                ),
              ),
            ),
          ),

          // Discount badge
          if (product.discountPercent > 0)
            Positioned(
              top: 60,
              left: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.green.shade700,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '-${product.discountPercent}% OFF',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),

          // Featured badge
          if (product.featured)
            Positioned(
              top: 60,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: gold,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'FEATURED',
                  style: TextStyle(
                    color: Color(AppConfig.darkBg),
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ),

          // Platform badge
          if (product.isExternal && product.platform != null)
            Positioned(
              top: product.featured ? 96 : 60,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: _getPlatformColor(product.platform!).withOpacity(0.9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  product.platform!.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Color _getPlatformColor(String platform) {
    switch (platform.toLowerCase()) {
      case 'amazon':
        return const Color(0xFFFF9900);
      case 'flipkart':
        return const Color(0xFF2874F0);
      case 'myntra':
        return const Color(0xFFFF3F6C);
      case 'ajio':
        return const Color(0xFF3B3B3B);
      case 'nykaa':
        return const Color(0xFFFFAF87);
      default:
        return const Color(AppConfig.primaryGold);
    }
  }
}
