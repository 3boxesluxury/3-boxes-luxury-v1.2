import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../checkout/checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        backgroundColor: darkBg,
        elevation: 0,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.shopping_bag_outlined, color: gold, size: 22),
            const SizedBox(width: 10),
            Text(
              'Shopping Bag',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        actions: [
          Consumer<AppProvider>(
            builder: (context, provider, _) {
              if (provider.cartCount == 0) return const SizedBox.shrink();
              return Container(
                margin: const EdgeInsets.only(right: 16, top: 14, bottom: 14),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: gold,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${provider.cartCount}',
                  style: GoogleFonts.poppins(
                    color: darkBg,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: Consumer<AppProvider>(
        builder: (context, provider, _) {
          if (provider.cartItems.isEmpty) {
            return _EmptyCartState(provider: provider);
          }
          return Column(
            children: [
              // ── Cart Items List ──
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  itemCount: provider.cartItems.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final item = provider.cartItems[index];
                    return _CartItemCard(
                      item: item,
                      provider: provider,
                    );
                  },
                ),
              ),

              // ── Order Summary Card ──
              _OrderSummaryCard(provider: provider),
            ],
          );
        },
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Empty Cart State
// ════════════════════════════════════════════════════════════════
class _EmptyCartState extends StatelessWidget {
  final AppProvider provider;

  const _EmptyCartState({required this.provider});

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
                color: gold.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Icon(
              Icons.shopping_bag_outlined,
              size: 48,
              color: gold.withOpacity(0.4),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Your bag is empty',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Discover luxury gifts and add them\nto your shopping bag',
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
              provider.setTab(0);
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
                  'Shop Now',
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
// Cart Item Card
// ════════════════════════════════════════════════════════════════
class _CartItemCard extends StatelessWidget {
  final CartItem item;
  final AppProvider provider;

  const _CartItemCard({
    required this.item,
    required this.provider,
  });

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    return Dismissible(
      key: Key(item.productId),
      direction: DismissDirection.endToStart,
      onDismissed: (_) {
        provider.removeFromCart(item.productId);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: cardBg,
            content: Row(
              children: [
                const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '${item.name} removed from bag',
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
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: Colors.redAccent.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 28),
      ),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: gold.withOpacity(0.08),
            width: 0.5,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Product Image ──
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 80,
                height: 80,
                child: Image.network(
                  item.image,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: const Color(AppConfig.surfaceBg),
                    child: Center(
                      child: Icon(
                        Icons.diamond,
                        color: gold.withOpacity(0.4),
                        size: 28,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),

            // ── Product Details ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    provider.formatPrice(item.price),
                    style: GoogleFonts.poppins(
                      color: gold,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // ── Quantity Controls ──
                  Row(
                    children: [
                      // Decrease
                      _QuantityButton(
                        icon: Icons.remove,
                        onTap: () {
                          provider.updateCartQuantity(
                            item.productId,
                            item.quantity - 1,
                          );
                        },
                      ),
                      const SizedBox(width: 12),
                      // Quantity
                      Container(
                        constraints: const BoxConstraints(minWidth: 28),
                        child: Text(
                          '${item.quantity}',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Increase
                      _QuantityButton(
                        icon: Icons.add,
                        onTap: () {
                          provider.updateCartQuantity(
                            item.productId,
                            item.quantity + 1,
                          );
                        },
                      ),
                      const Spacer(),
                      // Item total
                      Text(
                        provider.formatPrice(item.price * item.quantity),
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.6),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Quantity Button
// ════════════════════════════════════════════════════════════════
class _QuantityButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _QuantityButton({
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: const Color(AppConfig.surfaceBg),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: gold.withOpacity(0.2),
            width: 0.5,
          ),
        ),
        child: Icon(icon, color: gold, size: 16),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Order Summary Card
// ════════════════════════════════════════════════════════════════
class _OrderSummaryCard extends StatelessWidget {
  final AppProvider provider;

  const _OrderSummaryCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    final subtotal = provider.cartTotal;
    final shipping = subtotal >= 5000 ? 0.0 : 149.0;
    final total = subtotal + shipping;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      decoration: BoxDecoration(
        color: cardBg,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
        border: Border(
          top: BorderSide(
            color: gold.withOpacity(0.15),
            width: 0.5,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Subtotal
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Subtotal',
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 13,
                  ),
                ),
                Text(
                  provider.formatPrice(subtotal),
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Shipping
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Shipping',
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 13,
                  ),
                ),
                Text(
                  shipping == 0 ? 'FREE' : provider.formatPrice(shipping),
                  style: GoogleFonts.poppins(
                    color: shipping == 0 ? Colors.green.shade400 : Colors.white,
                    fontSize: 13,
                    fontWeight: shipping == 0 ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ],
            ),
            if (shipping > 0) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Spacer(),
                  Text(
                    'Free shipping on orders above ${provider.formatPrice(5000)}',
                    style: GoogleFonts.poppins(
                      color: gold.withOpacity(0.6),
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ],

            const SizedBox(height: 12),
            Container(height: 0.5, color: const Color(0xFF44403C)),
            const SizedBox(height: 12),

            // Total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total',
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  provider.formatPrice(total),
                  style: GoogleFonts.poppins(
                    color: gold,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Proceed to Checkout
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const CheckoutScreen(),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: gold,
                  foregroundColor: const Color(AppConfig.darkBg),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Proceed to Checkout',
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward, size: 18),
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
