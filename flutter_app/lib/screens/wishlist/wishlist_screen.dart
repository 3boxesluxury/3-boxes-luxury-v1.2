import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../product/product_detail_screen.dart';

class WishlistScreen extends StatelessWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        backgroundColor: darkBg,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: gold, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Consumer<AppProvider>(
          builder: (context, provider, _) {
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.favorite_border, color: gold, size: 22),
                const SizedBox(width: 10),
                Text(
                  'Wishlist',
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (provider.wishlistIds.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: gold.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${provider.wishlistIds.length}',
                      style: GoogleFonts.poppins(
                        color: gold,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ],
            );
          },
        ),
      ),
      body: Consumer<AppProvider>(
        builder: (context, provider, _) {
          if (provider.wishlistIds.isEmpty) {
            return const _EmptyWishlist();
          }

          // Get wishlisted products
          final wishlistedProducts = provider.products
              .where((p) => provider.wishlistIds.contains(p.id))
              .toList();

          if (wishlistedProducts.isEmpty) {
            return const _EmptyWishlist();
          }

          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.58,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: wishlistedProducts.length,
            itemBuilder: (context, index) {
              final product = wishlistedProducts[index];
              return _WishlistProductCard(product: product);
            },
          );
        },
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Empty Wishlist State
// ════════════════════════════════════════════════════════════════
class _EmptyWishlist extends StatelessWidget {
  const _EmptyWishlist();

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: const Color(AppConfig.surfaceBg),
              shape: BoxShape.circle,
              border: Border.all(
                color: gold.withOpacity(0.15),
                width: 0.5,
              ),
            ),
            child: Icon(
              Icons.favorite_border,
              size: 48,
              color: gold.withOpacity(0.35),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Your wishlist is empty',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Save items you love and\nfind them here later',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.4),
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () {
              context.read<AppProvider>().setTab(0);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: gold,
              foregroundColor: const Color(AppConfig.darkBg),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Explore',
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.arrow_forward, size: 18),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Wishlist Product Card with swipe-to-remove
// ════════════════════════════════════════════════════════════════
class _WishlistProductCard extends StatelessWidget {
  final Product product;

  const _WishlistProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    return Dismissible(
      key: Key('wishlist-${product.id}'),
      direction: DismissDirection.endToStart,
      confirmDismiss: (direction) async {
        return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: cardBg,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            title: Text(
              'Remove from Wishlist?',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            content: Text(
              '${product.name} will be removed from your wishlist.',
              style: GoogleFonts.poppins(
                color: Colors.white.withOpacity(0.6),
                fontSize: 13,
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text(
                  'Cancel',
                  style: GoogleFonts.poppins(color: Colors.white54),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: Text(
                  'Remove',
                  style: GoogleFonts.poppins(color: Colors.redAccent),
                ),
              ),
            ],
          ),
        );
      },
      onDismissed: (_) {
        context.read<AppProvider>().toggleWishlist(product.id);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: cardBg,
            content: Row(
              children: [
                const Icon(Icons.heart_broken, color: Colors.redAccent, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '${product.name} removed from wishlist',
                    style: const TextStyle(color: Colors.white),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: Colors.redAccent.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.delete_outline, color: Colors.redAccent, size: 24),
            const SizedBox(height: 4),
            Text(
              'Remove',
              style: GoogleFonts.poppins(
                color: Colors.redAccent,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: gold.withOpacity(0.08),
            width: 0.5,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with heart overlay
            Expanded(
              flex: 4,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  GestureDetector(
                    onTap: () {
                      final provider = context.read<AppProvider>();
                      provider.selectProduct(product);
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const ProductDetailScreen(),
                        ),
                      );
                    },
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                      child: Image.network(
                        product.images.isNotEmpty
                            ? AppConfig.getImageUrl(product.images[0])
                            : '',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: const Color(AppConfig.surfaceBg),
                          child: Center(
                            child: Icon(
                              Icons.diamond,
                              color: gold.withOpacity(0.4),
                              size: 32,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Heart icon (remove from wishlist)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: GestureDetector(
                      onTap: () {
                        context.read<AppProvider>().toggleWishlist(product.id);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(AppConfig.darkBg).withOpacity(0.7),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.favorite,
                          color: Colors.redAccent,
                          size: 16,
                        ),
                      ),
                    ),
                  ),

                  // Discount badge
                  if (product.discountPercent > 0)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.redAccent,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '-${product.discountPercent}%',
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Product details
            Expanded(
              flex: 3,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Price row
                    Row(
                      children: [
                        Consumer<AppProvider>(
                          builder: (context, provider, _) {
                            return Text(
                              provider.formatPrice(product.price),
                              style: GoogleFonts.poppins(
                                color: gold,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            );
                          },
                        ),
                        if (product.compareAtPrice != null &&
                            product.compareAtPrice! > product.price) ...[
                          const SizedBox(width: 6),
                          Consumer<AppProvider>(
                            builder: (context, provider, _) {
                              return Text(
                                provider.formatPrice(product.compareAtPrice!),
                                style: GoogleFonts.poppins(
                                  color: Colors.white.withOpacity(0.35),
                                  fontSize: 11,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              );
                            },
                          ),
                        ],
                      ],
                    ),
                    const Spacer(),
                    // Add to Cart / Move to Cart button
                    SizedBox(
                      width: double.infinity,
                      child: Consumer<AppProvider>(
                        builder: (context, provider, _) {
                          final isInCart = provider.cartItems
                              .any((item) => item.productId == product.id);

                          return ElevatedButton(
                            onPressed: () {
                              if (isInCart) return;
                              provider.addToCart(product);
                              // Optionally remove from wishlist after moving to cart
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: const Color(AppConfig.cardBg),
                                  content: Row(
                                    children: [
                                      const Icon(
                                        Icons.check_circle,
                                        color: Color(AppConfig.primaryGold),
                                        size: 20,
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          '${product.name} moved to bag',
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
                                  action: SnackBarAction(
                                    label: 'UNDO',
                                    textColor: const Color(AppConfig.primaryGold),
                                    onPressed: () {
                                      provider.removeFromCart(product.id);
                                    },
                                  ),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isInCart
                                  ? gold.withOpacity(0.15)
                                  : gold,
                              foregroundColor: const Color(AppConfig.darkBg),
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              elevation: 0,
                              minimumSize: Size.zero,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  isInCart
                                      ? Icons.check
                                      : Icons.shopping_bag_outlined,
                                  size: 14,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  isInCart ? 'In Bag' : 'Move to Bag',
                                  style: GoogleFonts.poppins(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: isInCart
                                        ? gold
                                        : const Color(AppConfig.darkBg),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
