import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../../services/api_service.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _api = ApiService();

  // Data
  List<Product> _products = [];
  List<Order> _orders = [];
  List<Map<String, dynamic>> _users = [];
  List<Category> _categories = [];

  bool _isLoading = true;
  String? _error;

  // Filters
  String _orderStatusFilter = 'All';
  String _userRoleFilter = 'All';
  String _productSearchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) setState(() {});
    });
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _api.getAdminProducts(),
        _api.getAdminOrders(),
        _api.getAdminUsers(),
        _api.getAdminCategories(),
      ]);

      final productData = results[0] as Map<String, dynamic>;
      final orderData = results[1] as Map<String, dynamic>;
      final userData = results[2] as Map<String, dynamic>;
      final categoryData = results[3] as Map<String, dynamic>;

      if (mounted) {
        setState(() {
          _products = (productData['products'] as List?)
                  ?.map((e) => Product.fromJson(e))
                  .toList() ??
              [];
          _orders = (orderData['orders'] as List?)
                  ?.map((e) => Order.fromJson(e))
                  .toList() ??
              [];
          _users = List<Map<String, dynamic>>.from(userData['users'] ?? []);
          _categories = (categoryData['categories'] as List?)
                  ?.map((e) => Category.fromJson(e))
                  .toList() ??
              [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);
    const cardBg = Color(AppConfig.cardBg);

    return Consumer<AppProvider>(
      builder: (context, provider, _) {
        // Role check
        if (provider.user == null || !provider.user!.isAdmin) {
          return Scaffold(
            backgroundColor: darkBg,
            appBar: AppBar(
              backgroundColor: darkBg,
              elevation: 0,
              title: Text(
                'Access Denied',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.lock_outline, size: 64, color: gold.withOpacity(0.4)),
                  const SizedBox(height: 16),
                  Text(
                    'Admin Access Required',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'You do not have permission to view this page.',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.3),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          backgroundColor: darkBg,
          appBar: AppBar(
            backgroundColor: darkBg,
            elevation: 0,
            title: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(6),
                    boxShadow: [
                      BoxShadow(
                        color: gold.withOpacity(0.5),
                        blurRadius: 8,
                        spreadRadius: 1,
                      ),
                      BoxShadow(
                        color: gold.withOpacity(0.25),
                        blurRadius: 16,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: SizedBox(
                    width: 32,
                    height: 32,
                    child: Image.network(
                      '${AppConfig.effectiveBaseUrl}/images/logo-uploaded.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Icon(Icons.admin_panel_settings, color: gold, size: 22),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '3 BOXES LUXURY',
                      style: GoogleFonts.poppins(
                        color: gold,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.5,
                      ),
                    ),
                    Text(
                      'Management Console',
                      style: GoogleFonts.poppins(
                        color: Colors.white54,
                        fontSize: 10,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh, color: gold, size: 22),
                onPressed: _loadData,
                tooltip: 'Refresh',
              ),
            ],
            bottom: TabBar(
              controller: _tabController,
              isScrollable: true,
              indicatorColor: gold,
              indicatorWeight: 2,
              labelColor: gold,
              unselectedLabelColor: Colors.white38,
              labelStyle: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
              unselectedLabelStyle: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
              tabs: const [
                Tab(text: 'Overview'),
                Tab(text: 'Products'),
                Tab(text: 'Orders'),
                Tab(text: 'Users'),
                Tab(text: 'Categories'),
              ],
            ),
          ),
          body: _isLoading
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(color: gold, strokeWidth: 2),
                      const SizedBox(height: 16),
                      Text(
                        'Loading dashboard...',
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.5),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                )
              : _error != null
                  ? _buildErrorState()
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        _buildOverviewTab(provider),
                        _buildProductsTab(provider),
                        _buildOrdersTab(provider),
                        _buildUsersTab(provider),
                        _buildCategoriesTab(provider),
                      ],
                    ),
          floatingActionButton: _tabController.index == 1
              ? FloatingActionButton(
                  onPressed: () => _showAddProductDialog(provider),
                  backgroundColor: gold,
                  child: Icon(Icons.add, color: darkBg),
                )
              : _tabController.index == 4
                  ? FloatingActionButton(
                      onPressed: () => _showAddCategoryDialog(provider),
                      backgroundColor: gold,
                      child: Icon(Icons.add, color: darkBg),
                    )
                  : null,
        );
      },
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Error State
  // ════════════════════════════════════════════════════════════════
  Widget _buildErrorState() {
    const gold = Color(AppConfig.primaryGold);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.redAccent.withOpacity(0.6)),
            const SizedBox(height: 16),
            Text(
              'Failed to load data',
              style: GoogleFonts.poppins(color: Colors.white60, fontSize: 16),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _loadData,
              style: ElevatedButton.styleFrom(
                backgroundColor: gold,
                foregroundColor: const Color(AppConfig.darkBg),
              ),
              child: Text('Retry', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // OVERVIEW TAB
  // ════════════════════════════════════════════════════════════════
  Widget _buildOverviewTab(AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);

    final totalRevenue = _orders.fold<double>(0, (sum, o) => sum + o.total);
    final lowStockProducts = _products.where((p) => p.stock <= 5).toList();
    final recentOrders = _orders.take(5).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Stats Cards Row ──
          SizedBox(
            height: 110,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildStatCard(
                  icon: Icons.payments_outlined,
                  title: 'Total Revenue',
                  value: provider.formatPrice(totalRevenue),
                  color: Colors.green.shade400,
                ),
                const SizedBox(width: 12),
                _buildStatCard(
                  icon: Icons.receipt_long_outlined,
                  title: 'Total Orders',
                  value: '${_orders.length}',
                  color: Colors.blue.shade400,
                ),
                const SizedBox(width: 12),
                _buildStatCard(
                  icon: Icons.inventory_2_outlined,
                  title: 'Total Products',
                  value: '${_products.length}',
                  color: gold,
                ),
                const SizedBox(width: 12),
                _buildStatCard(
                  icon: Icons.people_outlined,
                  title: 'Total Users',
                  value: '${_users.length}',
                  color: Colors.purple.shade400,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ── Recent Orders ──
          _buildSectionTitle('Recent Orders'),
          const SizedBox(height: 12),
          if (recentOrders.isEmpty)
            _buildEmptyState('No orders yet', Icons.receipt_outlined)
          else
            ...recentOrders.map((order) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _buildRecentOrderCard(order, provider),
                )),
          const SizedBox(height: 24),

          // ── Low Stock Alerts ──
          _buildSectionTitle('Low Stock Alerts'),
          const SizedBox(height: 12),
          if (lowStockProducts.isEmpty)
            _buildEmptyState('All products well stocked', Icons.check_circle_outline)
          else
            ...lowStockProducts.map((product) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _buildLowStockCard(product, provider),
                )),
          const SizedBox(height: 24),

          // ── Quick Actions ──
          _buildSectionTitle('Quick Actions'),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildQuickActionCard(Icons.add_box_outlined, 'Add Product', Colors.blue.shade400, () => _showAddProductDialog(provider))),
              const SizedBox(width: 12),
              Expanded(child: _buildQuickActionCard(Icons.receipt_long_outlined, 'View Orders', Colors.orange.shade400, () => _tabController.animateTo(2))),
              const SizedBox(width: 12),
              Expanded(child: _buildQuickActionCard(Icons.people_outlined, 'Manage Users', Colors.purple.shade400, () => _tabController.animateTo(3))),
            ],
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
  }) {
    const cardBg = Color(AppConfig.cardBg);
    return Container(
      width: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.15), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 20),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  value.length > 10 ? '${value.substring(0, 10)}...' : value,
                  style: GoogleFonts.poppins(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          Text(
            title,
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.5),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentOrderCard(Order order, AppProvider provider) {
    const cardBg = Color(AppConfig.cardBg);
    const gold = Color(AppConfig.primaryGold);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: gold.withOpacity(0.08), width: 0.5),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(AppConfig.surfaceBg),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.receipt_outlined, color: gold.withOpacity(0.6), size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.orderNumber,
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  _formatDate(order.createdAt),
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.4),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _buildStatusBadge(order.status),
              const SizedBox(height: 4),
              Text(
                provider.formatPrice(order.total),
                style: GoogleFonts.poppins(
                  color: gold,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLowStockCard(Product product, AppProvider provider) {
    const cardBg = Color(AppConfig.cardBg);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.redAccent.withOpacity(0.15), width: 0.5),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(AppConfig.surfaceBg),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.warning_amber_rounded, color: Colors.redAccent.shade200, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              product.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.poppins(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.redAccent.withOpacity(0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              '${product.stock} left',
              style: GoogleFonts.poppins(
                color: Colors.redAccent.shade200,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard(IconData icon, String label, Color color, VoidCallback onTap) {
    const cardBg = Color(AppConfig.cardBg);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.15), width: 0.5),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                color: Colors.white.withOpacity(0.7),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PRODUCTS TAB
  // ════════════════════════════════════════════════════════════════
  Widget _buildProductsTab(AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    final filtered = _productSearchQuery.isEmpty
        ? _products
        : _products
            .where((p) => p.name.toLowerCase().contains(_productSearchQuery.toLowerCase()))
            .toList();

    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            onChanged: (val) => setState(() => _productSearchQuery = val),
            style: GoogleFonts.poppins(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Search products...',
              hintStyle: GoogleFonts.poppins(color: Colors.white38, fontSize: 14),
              prefixIcon: Icon(Icons.search, color: gold.withOpacity(0.6), size: 20),
              filled: true,
              fillColor: cardBg,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: gold.withOpacity(0.1), width: 0.5),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: gold.withOpacity(0.1), width: 0.5),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: gold.withOpacity(0.3), width: 1),
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
        // Product count
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${filtered.length} products',
                style: GoogleFonts.poppins(color: Colors.white38, fontSize: 12),
              ),
            ],
          ),
        ),
        // Product list
        Expanded(
          child: filtered.isEmpty
              ? _buildEmptyState('No products found', Icons.inventory_2_outlined)
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final product = filtered[index];
                    return _buildProductCard(product, provider);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildProductCard(Product product, AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: gold.withOpacity(0.08), width: 0.5),
      ),
      child: Row(
        children: [
          // Product image
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 56,
              height: 56,
              child: product.images.isNotEmpty
                  ? Image.network(
                      AppConfig.getImageUrl(product.images[0]),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Center(
                        child: Icon(Icons.diamond, color: const Color(0xFFD4A437).withOpacity(0.4)),
                      ),
                    )
                  : Center(
                      child: Icon(Icons.diamond, color: const Color(0xFFD4A437).withOpacity(0.4)),
                    ),
            ),
          ),
          const SizedBox(width: 12),
          // Product info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  product.category,
                  style: GoogleFonts.poppins(color: Colors.white38, fontSize: 11),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      provider.formatPrice(product.price),
                      style: GoogleFonts.poppins(color: gold, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: product.stock > 5
                            ? Colors.green.withOpacity(0.1)
                            : product.stock > 0
                                ? Colors.orange.withOpacity(0.1)
                                : Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'Stock: ${product.stock}',
                        style: GoogleFonts.poppins(
                          color: product.stock > 5
                              ? Colors.green.shade400
                              : product.stock > 0
                                  ? Colors.orange.shade400
                                  : Colors.redAccent,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: product.stock > 0 ? Colors.blue.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        product.stock > 0 ? 'Active' : 'Inactive',
                        style: GoogleFonts.poppins(
                          color: product.stock > 0 ? Colors.blue.shade400 : Colors.grey,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Actions
          Column(
            children: [
              IconButton(
                icon: Icon(Icons.edit_outlined, color: gold, size: 18),
                onPressed: () => _showEditProductDialog(product, provider),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
              IconButton(
                icon: Icon(Icons.delete_outline, color: Colors.redAccent.shade200, size: 18),
                onPressed: () => _showDeleteProductDialog(product),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ORDERS TAB
  // ════════════════════════════════════════════════════════════════
  Widget _buildOrdersTab(AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    final statuses = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    final filtered = _orderStatusFilter == 'All'
        ? _orders
        : _orders.where((o) => o.status.toLowerCase() == _orderStatusFilter.toLowerCase()).toList();

    return Column(
      children: [
        // Status filter chips
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            children: statuses.map((status) {
              final isSelected = _orderStatusFilter == status;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: ChoiceChip(
                  label: Text(status),
                  selected: isSelected,
                  onSelected: (_) => setState(() => _orderStatusFilter = status),
                  labelStyle: GoogleFonts.poppins(
                    color: isSelected ? const Color(AppConfig.darkBg) : Colors.white60,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                  selectedColor: gold,
                  backgroundColor: cardBg,
                  side: BorderSide(
                    color: isSelected ? gold : Colors.white12,
                    width: 0.5,
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              );
            }).toList(),
          ),
        ),
        // Orders list
        Expanded(
          child: filtered.isEmpty
              ? _buildEmptyState('No orders found', Icons.receipt_outlined)
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final order = filtered[index];
                    return _buildOrderCard(order, provider);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildOrderCard(Order order, AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: gold.withOpacity(0.08), width: 0.5),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.orderNumber,
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      _formatDate(order.createdAt),
                      style: GoogleFonts.poppins(
                        color: Colors.white38,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              _buildStatusBadge(order.status),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Text(
                  '${order.items.length} item${order.items.length != 1 ? 's' : ''}',
                  style: GoogleFonts.poppins(color: Colors.white54, fontSize: 12),
                ),
              ),
              Text(
                provider.formatPrice(order.total),
                style: GoogleFonts.poppins(
                  color: gold,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () => _showOrderDetailDialog(order, provider),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(color: gold.withOpacity(0.3), width: 0.5),
                  ),
                ),
                child: Text(
                  'View Details',
                  style: GoogleFonts.poppins(color: gold, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () => _showUpdateOrderStatusDialog(order),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(color: Colors.blue.shade400.withOpacity(0.3), width: 0.5),
                  ),
                ),
                child: Text(
                  'Update Status',
                  style: GoogleFonts.poppins(color: Colors.blue.shade400, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // USERS TAB
  // ════════════════════════════════════════════════════════════════
  Widget _buildUsersTab(AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    final roles = ['All', 'ADMIN', 'AGENT', 'TEAM_LEAD', 'CORPORATE', 'CUSTOMER'];
    final filtered = _userRoleFilter == 'All'
        ? _users
        : _users.where((u) => (u['role'] ?? '') == _userRoleFilter).toList();

    return Column(
      children: [
        // Role filter chips
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            children: roles.map((role) {
              final isSelected = _userRoleFilter == role;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: ChoiceChip(
                  label: Text(role == 'TEAM_LEAD' ? 'TEAM LEAD' : role),
                  selected: isSelected,
                  onSelected: (_) => setState(() => _userRoleFilter = role),
                  labelStyle: GoogleFonts.poppins(
                    color: isSelected ? const Color(AppConfig.darkBg) : Colors.white60,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                  selectedColor: gold,
                  backgroundColor: cardBg,
                  side: BorderSide(
                    color: isSelected ? gold : Colors.white12,
                    width: 0.5,
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              );
            }).toList(),
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? _buildEmptyState('No users found', Icons.people_outline)
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final user = filtered[index];
                    return _buildUserCard(user, provider);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildUserCard(Map<String, dynamic> user, AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);
    final role = user['role'] ?? 'CUSTOMER';
    final status = user['status'] ?? 'active';
    final name = user['name'] ?? 'Unknown';
    final email = user['email'] ?? '';
    final joinedAt = user['createdAt'] ?? '';

    final initials = name
        .split(' ')
        .map((e) => e.isNotEmpty ? e[0] : '')
        .take(2)
        .join()
        .toUpperCase();

    final roleColor = _getRoleColor(role);
    final isPending = status.toLowerCase() == 'pending';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isPending ? Colors.orange.withOpacity(0.2) : gold.withOpacity(0.08),
          width: 0.5,
        ),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [roleColor, roleColor.withOpacity(0.7)],
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                initials,
                style: GoogleFonts.poppins(
                  color: const Color(AppConfig.darkBg),
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // User info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                Text(
                  email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(color: Colors.white38, fontSize: 11),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    _buildRoleBadge(role),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isPending ? Colors.orange.withOpacity(0.1) : Colors.green.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        isPending ? 'Pending' : 'Active',
                        style: GoogleFonts.poppins(
                          color: isPending ? Colors.orange.shade400 : Colors.green.shade400,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                if (joinedAt.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Joined: ${_formatDateString(joinedAt)}',
                      style: GoogleFonts.poppins(color: Colors.white24, fontSize: 10),
                    ),
                  ),
              ],
            ),
          ),
          // Approve/Reject for pending users
          if (isPending)
            Column(
              children: [
                IconButton(
                  icon: Icon(Icons.check_circle_outline, color: Colors.green.shade400, size: 20),
                  onPressed: () => _approveUser(user['id']),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
                IconButton(
                  icon: Icon(Icons.cancel_outlined, color: Colors.redAccent.shade200, size: 20),
                  onPressed: () => _rejectUser(user['id']),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
              ],
            ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // CATEGORIES TAB
  // ════════════════════════════════════════════════════════════════
  Widget _buildCategoriesTab(AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    return _categories.isEmpty
        ? _buildEmptyState('No categories yet', Icons.category_outlined)
        : ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
            itemCount: _categories.length,
            itemBuilder: (context, index) {
              final category = _categories[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: gold.withOpacity(0.08), width: 0.5),
                ),
                child: Row(
                  children: [
                    // Category image
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        width: 52,
                        height: 52,
                        child: category.image != null && category.image!.isNotEmpty
                            ? Image.network(
                                AppConfig.getImageUrl(category.image),
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Center(
                                  child: Icon(Icons.diamond, color: const Color(0xFFD4A437).withOpacity(0.4)),
                                ),
                              )
                            : Container(
                                color: const Color(AppConfig.surfaceBg),
                                child: Icon(Icons.category, color: gold.withOpacity(0.4), size: 24),
                              ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            category.name,
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (category.description != null && category.description!.isNotEmpty)
                            Text(
                              category.description!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.poppins(color: Colors.white38, fontSize: 11),
                            ),
                          const SizedBox(height: 2),
                          Text(
                            '${category.productCount} products',
                            style: GoogleFonts.poppins(color: gold.withOpacity(0.8), fontSize: 11, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.edit_outlined, color: gold, size: 18),
                      onPressed: () => _showEditCategoryDialog(category, provider),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    ),
                  ],
                ),
              );
            },
          );
  }

  // ════════════════════════════════════════════════════════════════
  // DIALOGS
  // ════════════════════════════════════════════════════════════════

  void _showAddProductDialog(AppProvider provider) {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final stockCtrl = TextEditingController();
    final categoryCtrl = TextEditingController();
    String selectedCategory = _categories.isNotEmpty ? _categories.first.slug : '';

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: const Color(AppConfig.cardBg),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Add Product', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700)),
          content: SingleChildScrollView(
            child: SizedBox(
              width: MediaQuery.of(context).size.width * 0.85,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _dialogTextField(nameCtrl, 'Product Name'),
                  const SizedBox(height: 12),
                  _dialogTextField(descCtrl, 'Description', maxLines: 2),
                  const SizedBox(height: 12),
                  _dialogTextField(priceCtrl, 'Price', keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  _dialogTextField(stockCtrl, 'Stock', keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  if (_categories.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(AppConfig.surfaceBg),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(AppConfig.primaryGold).withOpacity(0.15), width: 0.5),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedCategory.isEmpty ? null : selectedCategory,
                          hint: Text('Category', style: GoogleFonts.poppins(color: Colors.white38, fontSize: 14)),
                          isExpanded: true,
                          dropdownColor: const Color(AppConfig.cardBg),
                          style: GoogleFonts.poppins(color: Colors.white, fontSize: 14),
                          items: _categories.map((c) => DropdownMenuItem(value: c.slug, child: Text(c.name))).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              selectedCategory = val;
                              setDialogState(() {});
                            }
                          },
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel', style: GoogleFonts.poppins(color: Colors.white54)),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                try {
                  await _api.adminCreateProduct({
                    'name': nameCtrl.text,
                    'description': descCtrl.text,
                    'price': double.tryParse(priceCtrl.text) ?? 0,
                    'stock': int.tryParse(stockCtrl.text) ?? 0,
                    'categorySlug': selectedCategory,
                  });
                  _loadData();
                } catch (e) {
                  _showSnackBar('Failed to add product: $e');
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(AppConfig.primaryGold)),
              child: Text('Add', style: GoogleFonts.poppins(color: const Color(AppConfig.darkBg), fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }

  void _showEditProductDialog(Product product, AppProvider provider) {
    final nameCtrl = TextEditingController(text: product.name);
    final priceCtrl = TextEditingController(text: product.price.toString());
    final stockCtrl = TextEditingController(text: product.stock.toString());

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(AppConfig.cardBg),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Edit Product', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700)),
        content: SingleChildScrollView(
          child: SizedBox(
            width: MediaQuery.of(context).size.width * 0.85,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _dialogTextField(nameCtrl, 'Product Name'),
                const SizedBox(height: 12),
                _dialogTextField(priceCtrl, 'Price', keyboardType: TextInputType.number),
                const SizedBox(height: 12),
                _dialogTextField(stockCtrl, 'Stock', keyboardType: TextInputType.number),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: GoogleFonts.poppins(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await _api.adminUpdateProduct(product.id, {
                  'name': nameCtrl.text,
                  'price': double.tryParse(priceCtrl.text) ?? product.price,
                  'stock': int.tryParse(stockCtrl.text) ?? product.stock,
                });
                _loadData();
              } catch (e) {
                _showSnackBar('Failed to update product: $e');
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(AppConfig.primaryGold)),
            child: Text('Save', style: GoogleFonts.poppins(color: const Color(AppConfig.darkBg), fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  void _showDeleteProductDialog(Product product) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(AppConfig.cardBg),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Delete Product', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700)),
        content: Text(
          'Are you sure you want to delete "${product.name}"? This action cannot be undone.',
          style: GoogleFonts.poppins(color: Colors.white60, fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: GoogleFonts.poppins(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await _api.adminDeleteProduct(product.id);
                _loadData();
              } catch (e) {
                _showSnackBar('Failed to delete product: $e');
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            child: Text('Delete', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  void _showOrderDetailDialog(Order order, AppProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(AppConfig.cardBg),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Text('Order ', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700)),
            Text(order.orderNumber, style: GoogleFonts.poppins(color: const Color(AppConfig.primaryGold), fontWeight: FontWeight.w700)),
          ],
        ),
        content: SingleChildScrollView(
          child: SizedBox(
            width: MediaQuery.of(context).size.width * 0.85,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Status', style: GoogleFonts.poppins(color: Colors.white38, fontSize: 13)),
                    _buildStatusBadge(order.status),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Date', style: GoogleFonts.poppins(color: Colors.white38, fontSize: 13)),
                    Text(_formatDate(order.createdAt), style: GoogleFonts.poppins(color: Colors.white, fontSize: 13)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Total', style: GoogleFonts.poppins(color: Colors.white38, fontSize: 13)),
                    Text(provider.formatPrice(order.total),
                        style: GoogleFonts.poppins(color: const Color(AppConfig.primaryGold), fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
                const SizedBox(height: 16),
                Text('Items', style: GoogleFonts.poppins(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                ...order.items.map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${item.name} x${item.quantity}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.poppins(color: Colors.white70, fontSize: 12),
                            ),
                          ),
                          Text(
                            provider.formatPrice(item.price * item.quantity),
                            style: GoogleFonts.poppins(color: Colors.white54, fontSize: 12),
                          ),
                        ],
                      ),
                    )),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Close', style: GoogleFonts.poppins(color: const Color(AppConfig.primaryGold))),
          ),
        ],
      ),
    );
  }

  void _showUpdateOrderStatusDialog(Order order) {
    final statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    String selectedStatus = order.status.toLowerCase();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: const Color(AppConfig.cardBg),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Update Order Status', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: statuses.map((status) {
              return RadioListTile<String>(
                value: status,
                groupValue: selectedStatus,
                onChanged: (val) {
                  if (val != null) {
                    selectedStatus = val;
                    setDialogState(() {});
                  }
                },
                title: Text(
                  status[0].toUpperCase() + status.substring(1),
                  style: GoogleFonts.poppins(color: Colors.white, fontSize: 14),
                ),
                activeColor: const Color(AppConfig.primaryGold),
                dense: true,
              );
            }).toList(),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel', style: GoogleFonts.poppins(color: Colors.white54)),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                try {
                  await _api.adminUpdateOrder(order.id, {'status': selectedStatus});
                  _loadData();
                } catch (e) {
                  _showSnackBar('Failed to update status: $e');
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(AppConfig.primaryGold)),
              child: Text('Update', style: GoogleFonts.poppins(color: const Color(AppConfig.darkBg), fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddCategoryDialog(AppProvider provider) {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final imageCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(AppConfig.cardBg),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Add Category', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700)),
        content: SingleChildScrollView(
          child: SizedBox(
            width: MediaQuery.of(context).size.width * 0.85,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _dialogTextField(nameCtrl, 'Category Name'),
                const SizedBox(height: 12),
                _dialogTextField(descCtrl, 'Description', maxLines: 2),
                const SizedBox(height: 12),
                _dialogTextField(imageCtrl, 'Image URL'),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: GoogleFonts.poppins(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await _api.adminCreateCategory({
                  'name': nameCtrl.text,
                  'description': descCtrl.text,
                  'image': imageCtrl.text,
                });
                _loadData();
              } catch (e) {
                _showSnackBar('Failed to add category: $e');
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(AppConfig.primaryGold)),
            child: Text('Add', style: GoogleFonts.poppins(color: const Color(AppConfig.darkBg), fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  void _showEditCategoryDialog(Category category, AppProvider provider) {
    final nameCtrl = TextEditingController(text: category.name);
    final descCtrl = TextEditingController(text: category.description ?? '');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(AppConfig.cardBg),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Edit Category', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700)),
        content: SingleChildScrollView(
          child: SizedBox(
            width: MediaQuery.of(context).size.width * 0.85,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _dialogTextField(nameCtrl, 'Category Name'),
                const SizedBox(height: 12),
                _dialogTextField(descCtrl, 'Description', maxLines: 2),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: GoogleFonts.poppins(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await _api.adminUpdateCategory(category.id, {
                  'name': nameCtrl.text,
                  'description': descCtrl.text,
                });
                _loadData();
              } catch (e) {
                _showSnackBar('Failed to update category: $e');
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(AppConfig.primaryGold)),
            child: Text('Save', style: GoogleFonts.poppins(color: const Color(AppConfig.darkBg), fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════

  Future<void> _approveUser(String? userId) async {
    if (userId == null) return;
    try {
      await _api.adminUpdateUser(userId, {'status': 'active'});
      _loadData();
    } catch (e) {
      _showSnackBar('Failed to approve user: $e');
    }
  }

  Future<void> _rejectUser(String? userId) async {
    if (userId == null) return;
    try {
      await _api.adminUpdateUser(userId, {'status': 'rejected'});
      _loadData();
    } catch (e) {
      _showSnackBar('Failed to reject user: $e');
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.poppins(fontSize: 13)),
        backgroundColor: const Color(AppConfig.cardBg),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _dialogTextField(TextEditingController controller, String hint, {int maxLines = 1, TextInputType? keyboardType}) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      style: GoogleFonts.poppins(color: Colors.white, fontSize: 14),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.poppins(color: Colors.white38, fontSize: 14),
        filled: true,
        fillColor: const Color(AppConfig.surfaceBg),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    final color = _getOrderStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status[0].toUpperCase() + status.substring(1),
        style: GoogleFonts.poppins(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildRoleBadge(String role) {
    final color = _getRoleColor(role);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3), width: 0.5),
      ),
      child: Text(
        role == 'TEAM_LEAD' ? 'TEAM LEAD' : role,
        style: GoogleFonts.poppins(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Color _getOrderStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'delivered':
        return Colors.green.shade400;
      case 'shipped':
        return Colors.blue.shade400;
      case 'processing':
        return Colors.orange.shade400;
      case 'pending':
        return Colors.yellow.shade400;
      case 'cancelled':
        return Colors.redAccent;
      default:
        return Colors.white54;
    }
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'ADMIN':
        return const Color(AppConfig.primaryGold);
      case 'AGENT':
        return Colors.blue.shade400;
      case 'TEAM_LEAD':
        return Colors.purple.shade400;
      case 'CORPORATE':
        return Colors.teal.shade400;
      default:
        return Colors.green.shade400;
    }
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.poppins(
        color: Colors.white.withOpacity(0.5),
        fontSize: 12,
        fontWeight: FontWeight.w600,
        letterSpacing: 1,
      ),
    );
  }

  Widget _buildEmptyState(String message, IconData icon) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 48, color: const Color(AppConfig.primaryGold).withOpacity(0.3)),
          const SizedBox(height: 12),
          Text(
            message,
            style: GoogleFonts.poppins(color: Colors.white38, fontSize: 14),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  String _formatDateString(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return _formatDate(date);
    } catch (_) {
      return dateStr;
    }
  }
}
