import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../../widgets/product_card.dart';
import '../product/product_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late AnimationController _particleController;
  final GlobalKey<RefreshIndicatorState> _refreshKey = GlobalKey<RefreshIndicatorState>();

  @override
  void initState() {
    super.initState();
    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();
  }

  @override
  void dispose() {
    _particleController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    final provider = context.read<AppProvider>();
    await Future.wait([
      provider.loadProducts(),
      provider.loadCategories(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);
    final provider = context.watch<AppProvider>();

    return Scaffold(
      backgroundColor: darkBg,
      body: RefreshIndicator(
        key: _refreshKey,
        color: gold,
        backgroundColor: const Color(AppConfig.cardBg),
        onRefresh: _onRefresh,
        child: CustomScrollView(
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
                  SizedBox(
                    width: 40,
                    height: 40,
                    child: Image.network(
                      '${AppConfig.effectiveBaseUrl}/images/logo-uploaded.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Icon(Icons.diamond, color: gold, size: 22),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    AppConfig.appName,
                    style: GoogleFonts.poppins(
                      color: gold,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2,
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.search, color: gold, size: 24),
                  onPressed: () {
                    showSearch(
                      context: context,
                      delegate: _ProductSearchDelegate(),
                    );
                  },
                  tooltip: 'Search',
                ),
                IconButton(
                  icon: const Icon(Icons.notifications_outlined, color: gold, size: 24),
                  onPressed: () {
                    // TODO: Notifications screen
                  },
                  tooltip: 'Notifications',
                ),
                const SizedBox(width: 4),
              ],
            ),

            // ── Hero Banner ──
            SliverToBoxAdapter(
              child: _HeroBanner(
                particleAnimation: _particleController,
              ),
            ),

            // ── Loading state ──
            if (provider.isLoading)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40),
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
                          'Loading luxury...',
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

            // ── Featured Products Section ──
            if (!provider.isLoading && provider.featuredProducts.isNotEmpty)
              SliverToBoxAdapter(
                child: _SectionHeader(
                  title: 'Featured Products',
                  subtitle: 'Hand-picked luxury for you',
                  onSeeAll: () {
                    // TODO: Navigate to all featured products
                  },
                ),
              ),

            if (!provider.isLoading && provider.featuredProducts.isNotEmpty)
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 320,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.only(left: 16, right: 8),
                    itemCount: provider.featuredProducts.length,
                    itemBuilder: (context, index) {
                      final product = provider.featuredProducts[index];
                      return Padding(
                        padding: const EdgeInsets.only(right: 12, bottom: 8),
                        child: SizedBox(
                          width: 170,
                          child: ProductCard(
                            product: product,
                            onTap: () => _navigateToDetail(product),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

            // ── Categories Section ──
            if (!provider.isLoading && provider.categories.isNotEmpty)
              SliverToBoxAdapter(
                child: _SectionHeader(
                  title: 'Categories',
                  subtitle: 'Browse by collection',
                  onSeeAll: () {
                    // Switch to Categories tab
                    provider.setTab(1);
                  },
                ),
              ),

            if (!provider.isLoading && provider.categories.isNotEmpty)
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 1.2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final category = provider.categories[index];
                      return _CategoryCard(
                        category: category,
                        onTap: () {
                          provider.setCategory(category.slug);
                        },
                      );
                    },
                    childCount: provider.categories.length > 6
                        ? 6
                        : provider.categories.length,
                  ),
                ),
              ),

            // ── All Products Section ──
            if (!provider.isLoading && provider.products.isNotEmpty)
              SliverToBoxAdapter(
                child: _SectionHeader(
                  title: 'All Products',
                  subtitle: '${provider.products.length} items',
                  onSeeAll: null,
                ),
              ),

            if (!provider.isLoading && provider.products.isNotEmpty)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.62,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final product = provider.products[index];
                      return ProductCard(
                        product: product,
                        onTap: () => _navigateToDetail(product),
                      );
                    },
                    childCount: provider.products.length,
                  ),
                ),
              ),

            // ── Empty state ──
            if (!provider.isLoading && provider.products.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.inventory_2_outlined,
                        size: 64,
                        color: gold.withOpacity(0.3),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No products yet',
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.5),
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Check back soon for luxury finds',
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.3),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Bottom padding for nav bar
            const SliverToBoxAdapter(
              child: SizedBox(height: 20),
            ),
          ],
        ),
      ),
    );
  }

  void _navigateToDetail(Product product) {
    final provider = context.read<AppProvider>();
    provider.selectProduct(product);
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const ProductDetailScreen(),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Hero Banner
// ════════════════════════════════════════════════════════════════
class _HeroBanner extends StatelessWidget {
  final Animation<double> particleAnimation;

  const _HeroBanner({required this.particleAnimation});

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      height: 200,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF292524),
            Color(0xFF1C1917),
            Color(0xFF0C0A09),
          ],
        ),
        border: Border.all(
          color: gold.withOpacity(0.15),
          width: 0.5,
        ),
      ),
      child: Stack(
        children: [
          // Gold particles
          AnimatedBuilder(
            animation: particleAnimation,
            builder: (context, child) {
              return CustomPaint(
                painter: _GoldParticlePainter(particleAnimation.value),
                size: Size.infinite,
              );
            },
          ),

          // Content overlay
          Positioned(
            left: 24,
            top: 32,
            right: 24,
            bottom: 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Curated',
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    letterSpacing: 3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'LUXURY\nGIFTING',
                  style: GoogleFonts.poppins(
                    color: gold,
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    height: 1.1,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: gold,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'EXPLORE NOW',
                    style: GoogleFonts.poppins(
                      color: const Color(AppConfig.darkBg),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Decorative diamond icon
          Positioned(
            right: 24,
            top: 24,
            child: Icon(
              Icons.diamond,
              color: gold.withOpacity(0.1),
              size: 80,
            ),
          ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Gold Particle Painter
// ════════════════════════════════════════════════════════════════
class _GoldParticlePainter extends CustomPainter {
  final double progress;
  static final _random = Random(42); // Fixed seed for consistent particles
  static final _particles = List.generate(20, (index) {
    return {
      'x': _random.nextDouble(),
      'y': _random.nextDouble(),
      'size': 1.5 + _random.nextDouble() * 3,
      'speed': 0.3 + _random.nextDouble() * 0.7,
      'opacity': 0.1 + _random.nextDouble() * 0.4,
    };
  });

  _GoldParticlePainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(AppConfig.primaryGold);

    for (final p in _particles) {
      final double baseX = p['x'] as double;
      final double baseY = p['y'] as double;
      final double particleSize = p['size'] as double;
      final double speed = p['speed'] as double;
      final double opacity = p['opacity'] as double;

      final double animatedY = (baseY + progress * speed) % 1.0;
      final double x = baseX * size.width;
      final double y = animatedY * size.height;

      paint.color = const Color(AppConfig.primaryGold).withOpacity(opacity);
      canvas.drawCircle(Offset(x, y), particleSize, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GoldParticlePainter oldDelegate) => true;
}

// ════════════════════════════════════════════════════════════════
// Section Header
// ════════════════════════════════════════════════════════════════
class _SectionHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback? onSeeAll;

  const _SectionHeader({
    required this.title,
    required this.subtitle,
    this.onSeeAll,
  });

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: GoogleFonts.poppins(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 12,
                ),
              ),
            ],
          ),
          if (onSeeAll != null)
            GestureDetector(
              onTap: onSeeAll,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'See All',
                    style: GoogleFonts.poppins(
                      color: gold,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(Icons.arrow_forward_ios, color: gold, size: 12),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Category Card
// ════════════════════════════════════════════════════════════════
class _CategoryCard extends StatelessWidget {
  final Category category;
  final VoidCallback onTap;

  const _CategoryCard({
    required this.category,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: gold.withOpacity(0.1),
            width: 0.5,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Category image
            if (category.image != null && category.image!.isNotEmpty)
              Image.network(
                AppConfig.getImageUrl(category.image),
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: const Color(AppConfig.surfaceBg),
                  child: Center(
                    child: Icon(Icons.category, color: gold.withOpacity(0.3), size: 32),
                  ),
                ),
              )
            else
              Container(
                color: const Color(AppConfig.surfaceBg),
                child: Center(
                  child: Icon(Icons.category, color: gold.withOpacity(0.3), size: 32),
                ),
              ),

            // Gradient overlay
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.8),
                  ],
                  stops: const [0.4, 1.0],
                ),
              ),
            ),

            // Category name
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    category.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (category.productCount > 0)
                    Text(
                      '${category.productCount} items',
                      style: GoogleFonts.poppins(
                        color: gold.withOpacity(0.8),
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
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
// Search Delegate
// ════════════════════════════════════════════════════════════════
class _ProductSearchDelegate extends SearchDelegate<String> {
  @override
  ThemeData appBarTheme(BuildContext context) {
    return Theme.of(context).copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(AppConfig.cardBg),
        iconTheme: IconThemeData(color: Color(AppConfig.primaryGold)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        hintStyle: GoogleFonts.poppins(color: Colors.white54),
      ),
    );
  }

  @override
  String get searchFieldLabel => 'Search luxury gifts...';

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      if (query.isNotEmpty)
        IconButton(
          icon: const Icon(Icons.clear, color: Color(AppConfig.primaryGold)),
          onPressed: () {
            query = '';
            showSuggestions(context);
          },
        ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back, color: Color(AppConfig.primaryGold)),
      onPressed: () => close(context, ''),
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    final provider = context.read<AppProvider>();
    provider.setSearch(query);

    return Consumer<AppProvider>(
      builder: (context, provider, _) {
        if (provider.isSearching) {
          return const Center(
            child: CircularProgressIndicator(color: Color(AppConfig.primaryGold)),
          );
        }

        if (provider.products.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.search_off, size: 48, color: Colors.white24),
                const SizedBox(height: 12),
                Text(
                  'No results for "$query"',
                  style: GoogleFonts.poppins(color: Colors.white54),
                ),
              ],
            ),
          );
        }

        return GridView.builder(
          padding: const EdgeInsets.all(16),
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
        );
      },
    );
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    if (query.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.diamond, size: 48, color: const Color(AppConfig.primaryGold).withOpacity(0.3)),
            const SizedBox(height: 12),
            Text(
              'Search luxury gifts',
              style: GoogleFonts.poppins(color: Colors.white38, fontSize: 15),
            ),
          ],
        ),
      );
    }

    final provider = context.read<AppProvider>();
    provider.setSearch(query);

    return Consumer<AppProvider>(
      builder: (context, provider, _) {
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: provider.products.length > 10 ? 10 : provider.products.length,
          itemBuilder: (context, index) {
            final product = provider.products[index];
            return ListTile(
              leading: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 48,
                  height: 48,
                  child: Image.network(
                    AppConfig.getImageUrl(product.images.isNotEmpty ? product.images[0] : ''),
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: const Color(AppConfig.surfaceBg),
                      child: const Icon(Icons.diamond, color: Color(AppConfig.primaryGold), size: 20),
                    ),
                  ),
                ),
              ),
              title: Text(
                product.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.poppins(color: Colors.white, fontSize: 13),
              ),
              subtitle: Text(
                provider.formatPrice(product.price),
                style: GoogleFonts.poppins(color: const Color(AppConfig.primaryGold), fontSize: 12),
              ),
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
        );
      },
    );
  }
}
