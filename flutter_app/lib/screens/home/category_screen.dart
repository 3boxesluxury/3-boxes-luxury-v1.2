import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../../widgets/product_card.dart';
import '../product/product_detail_screen.dart';

class CategoryScreen extends StatefulWidget {
  const CategoryScreen({super.key});

  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  String? _activeCategory;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )..forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);

    return Scaffold(
      backgroundColor: darkBg,
      body: Consumer<AppProvider>(
        builder: (context, provider, _) {
          // If a category is active, show filtered products
          if (_activeCategory != null) {
            return _buildCategoryProducts(provider);
          }

          // Otherwise show the categories grid
          return CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── AppBar ──
              SliverAppBar(
                backgroundColor: darkBg,
                elevation: 0,
                floating: true,
                snap: true,
                centerTitle: false,
                title: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.category, color: gold, size: 22),
                    const SizedBox(width: 8),
                    Text(
                      'All Categories',
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),

              // ── Category count ──
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                  child: Text(
                    '${provider.categories.length} collections to explore',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 13,
                    ),
                  ),
                ),
              ),

              // ── Loading state ──
              if (provider.isLoading && provider.categories.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 60),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const CircularProgressIndicator(
                            color: gold,
                            strokeWidth: 2,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Loading categories...',
                            style: GoogleFonts.poppins(
                              color: Colors.white.withOpacity(0.5),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // ── Categories Grid ──
              if (!provider.isLoading || provider.categories.isNotEmpty)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.72,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final category = provider.categories[index];
                        // Staggered animation
                        final itemAnim = Tween<double>(begin: 0, end: 1).animate(
                          CurvedAnimation(
                            parent: _animController,
                            curve: Interval(
                              (index / provider.categories.length).clamp(0, 0.8),
                              ((index + 1) / provider.categories.length).clamp(0.1, 1.0),
                              curve: Curves.easeOutCubic,
                            ),
                          ),
                        );
                        return AnimatedBuilder(
                          animation: itemAnim,
                          builder: (context, child) {
                            return Opacity(
                              opacity: itemAnim.value,
                              child: Transform.translate(
                                offset: Offset(0, 30 * (1 - itemAnim.value)),
                                child: child,
                              ),
                            );
                          },
                          child: _CategoryCard(
                            category: category,
                            onTap: () {
                              provider.setCategory(category.slug);
                              setState(() {
                                _activeCategory = category.slug;
                              });
                            },
                          ),
                        );
                      },
                      childCount: provider.categories.length,
                    ),
                  ),
                ),

              // ── Empty state ──
              if (!provider.isLoading && provider.categories.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.category_outlined,
                          size: 64,
                          color: gold.withOpacity(0.3),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No categories yet',
                          style: GoogleFonts.poppins(
                            color: Colors.white.withOpacity(0.5),
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Check back soon for new collections',
                          style: GoogleFonts.poppins(
                            color: Colors.white.withOpacity(0.3),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              // Bottom padding
              const SliverToBoxAdapter(
                child: SizedBox(height: 80),
              ),
            ],
          );
        },
      ),
    );
  }

  // ── Category Products View ──
  Widget _buildCategoryProducts(AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);

    final categoryName = provider.categories
        .firstWhere(
          (c) => c.slug == _activeCategory,
          orElse: () => Category(id: '', name: 'Products', slug: '', productCount: 0),
        )
        .name;

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        backgroundColor: darkBg,
        elevation: 0,
        leading: Container(
          margin: const EdgeInsets.only(left: 8, top: 4, bottom: 4),
          decoration: BoxDecoration(
            color: const Color(AppConfig.cardBg).withOpacity(0.8),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: gold, size: 20),
            onPressed: () {
              provider.setCategory(null);
              setState(() => _activeCategory = null);
            },
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              categoryName,
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              '${provider.products.length} items',
              style: GoogleFonts.poppins(
                color: Colors.white.withOpacity(0.4),
                fontSize: 11,
              ),
            ),
          ],
        ),
        actions: [
          // Clear filter
          TextButton.icon(
            onPressed: () {
              provider.setCategory(null);
              setState(() => _activeCategory = null);
            },
            icon: const Icon(Icons.clear, size: 16),
            label: Text(
              'Clear',
              style: GoogleFonts.poppins(fontSize: 12),
            ),
            style: TextButton.styleFrom(
              foregroundColor: gold,
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: provider.products.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.inventory_2_outlined,
                    size: 56,
                    color: gold.withOpacity(0.3),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No products in this category',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Try browsing another collection',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.3),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            )
          : GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.62,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: provider.products.length,
              itemBuilder: (context, index) {
                final product = provider.products[index];
                return ProductCard(
                  product: product,
                  onTap: () {
                    provider.selectProduct(product);
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const ProductDetailScreen(),
                      ),
                    );
                  },
                );
              },
            ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Category Card
// ════════════════════════════════════════════════════════════════
class _CategoryCard extends StatefulWidget {
  final Category category;
  final VoidCallback onTap;

  const _CategoryCard({
    required this.category,
    required this.onTap,
  });

  @override
  State<_CategoryCard> createState() => _CategoryCardState();
}

class _CategoryCardState extends State<_CategoryCard> with SingleTickerProviderStateMixin {
  late AnimationController _scaleController;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
      lowerBound: 0.95,
      upperBound: 1.0,
    )..value = 1.0;
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    _scaleController.reverse();
  }

  void _onTapUp(TapUpDetails details) {
    _scaleController.forward();
  }

  void _onTapCancel() {
    _scaleController.forward();
  }

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onTap: widget.onTap,
      child: ScaleTransition(
        scale: _scaleController,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(AppConfig.cardBg),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: gold.withOpacity(0.1),
              width: 0.5,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // ── Category Image ──
              if (widget.category.image != null && widget.category.image!.isNotEmpty)
                Image.network(
                  widget.category.image!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: const Color(AppConfig.surfaceBg),
                    child: Center(
                      child: Icon(
                        Icons.diamond,
                        color: Color(0xFFD4A437).withOpacity(0.4),
                        size: 36,
                      ),
                    ),
                  ),
                )
              else
                Container(
                  color: const Color(AppConfig.surfaceBg),
                  child: Center(
                    child: Icon(
                      Icons.diamond,
                      color: Color(0xFFD4A437).withOpacity(0.4),
                      size: 36,
                    ),
                  ),
                ),

              // ── Gradient Overlay ──
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.1),
                      Colors.black.withOpacity(0.85),
                    ],
                    stops: const [0.3, 1.0],
                  ),
                ),
              ),

              // ── Category Info ──
              Positioned(
                left: 14,
                right: 14,
                bottom: 14,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.category.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (widget.category.productCount > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: gold.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${widget.category.productCount} items',
                              style: GoogleFonts.poppins(
                                color: gold,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        const Spacer(),
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: gold.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.arrow_forward,
                            color: gold,
                            size: 14,
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
      ),
    );
  }
}
