import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../../services/api_service.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  static const _tabs = ['All', 'Pending', 'Shipped', 'Delivered', 'Cancelled'];

  List<Order> _orders = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _loadOrders();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final api = ApiService();
      final provider = context.read<AppProvider>();
      if (!provider.isLoggedIn) {
        setState(() { _isLoading = false; _orders = []; });
        return;
      }
      final orders = await api.getOrders();
      setState(() {
        _orders = orders;
        _isLoading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  Future<void> _onRefresh() async {
    await _loadOrders();
  }

  List<Order> _getFilteredOrders(String tab) {
    if (tab == 'All') return _orders;
    return _orders.where((o) => o.status.toLowerCase() == tab.toLowerCase()).toList();
  }

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
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.receipt_long_outlined, color: gold, size: 22),
            const SizedBox(width: 10),
            Text(
              'My Orders',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: gold,
          unselectedLabelColor: Colors.white.withOpacity(0.4),
          indicatorColor: gold,
          indicatorSize: TabBarIndicatorSize.label,
          labelStyle: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600),
          unselectedLabelStyle: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w400),
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                color: gold,
                strokeWidth: 2,
              ),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.error_outline, color: Colors.redAccent.withOpacity(0.5), size: 48),
                      const SizedBox(height: 12),
                      Text(
                        'Failed to load orders',
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.6),
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _error!,
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.4),
                          fontSize: 12,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _loadOrders,
                        icon: const Icon(Icons.refresh, size: 18),
                        label: Text(
                          'Retry',
                          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: _tabs.map((tab) {
                    final filtered = _getFilteredOrders(tab);
                    return filtered.isEmpty
                        ? _EmptyOrdersState(tab: tab)
                        : RefreshIndicator(
                            color: gold,
                            backgroundColor: const Color(AppConfig.cardBg),
                            onRefresh: _onRefresh,
                            child: ListView.separated(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.all(16),
                              itemCount: filtered.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                return _OrderCard(order: filtered[index]);
                              },
                            ),
                          );
                  }).toList(),
                ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Empty Orders State
// ════════════════════════════════════════════════════════════════
class _EmptyOrdersState extends StatelessWidget {
  final String tab;

  const _EmptyOrdersState({required this.tab});

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
              border: Border.all(color: gold.withOpacity(0.15), width: 0.5),
            ),
            child: Icon(
              Icons.inventory_2_outlined,
              size: 48,
              color: gold.withOpacity(0.3),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            tab == 'All' ? 'No orders yet' : 'No $tab orders',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            tab == 'All'
                ? 'Start shopping and your orders\nwill appear here'
                : 'Orders with $tab status\nwill show up here',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.4),
              fontSize: 13,
              height: 1.5,
            ),
          ),
          if (tab == 'All') ...[
            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: () {
                context.read<AppProvider>().setTab(0);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: gold,
                foregroundColor: const Color(AppConfig.darkBg),
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Shop Now',
                    style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(width: 6),
                  const Icon(Icons.arrow_forward, size: 16),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Order Card
// ════════════════════════════════════════════════════════════════
class _OrderCard extends StatelessWidget {
  final Order order;

  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);
    final provider = context.read<AppProvider>();

    return GestureDetector(
      onTap: () => _showOrderDetail(context),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: gold.withOpacity(0.08), width: 0.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row: order number + status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    order.orderNumber,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                _StatusBadge(status: order.status),
              ],
            ),
            const SizedBox(height: 6),

            // Date
            Text(
              _formatDate(order.createdAt),
              style: GoogleFonts.poppins(
                color: Colors.white.withOpacity(0.4),
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 12),

            // Items preview
            Row(
              children: [
                // First item image
                if (order.items.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: SizedBox(
                      width: 48,
                      height: 48,
                      child: order.items.first.image != null &&
                              order.items.first.image!.isNotEmpty
                          ? Image.network(
                              AppConfig.getImageUrl(order.items.first.image),
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: const Color(AppConfig.surfaceBg),
                                child: Center(
                                  child: Icon(Icons.diamond,
                                      color: gold.withOpacity(0.4), size: 18),
                                ),
                              ),
                            )
                          : Container(
                              color: const Color(AppConfig.surfaceBg),
                              child: Center(
                                child: Icon(Icons.diamond,
                                    color: gold.withOpacity(0.4), size: 18),
                              ),
                            ),
                    ),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.items.length == 1
                            ? order.items.first.name
                            : '${order.items.first.name} + ${order.items.length - 1} more',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.8),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${order.items.length} item${order.items.length > 1 ? 's' : ''}',
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.4),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  provider.formatPrice(order.total),
                  style: GoogleFonts.poppins(
                    color: gold,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Action buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (order.status == 'shipped')
                  _ActionButton(
                    label: 'Track Order',
                    icon: Icons.local_shipping_outlined,
                    onTap: () => _showOrderDetail(context),
                  ),
                const SizedBox(width: 8),
                _ActionButton(
                  label: 'View Details',
                  icon: Icons.receipt_long_outlined,
                  onTap: () => _showOrderDetail(context),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showOrderDetail(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _OrderDetailScreen(order: order),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${date.day} ${months[date.month]}, ${date.year}';
  }
}

// ════════════════════════════════════════════════════════════════
// Status Badge
// ════════════════════════════════════════════════════════════════
class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  Color _getColor() {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'processing':
        return Colors.amber;
      case 'shipped':
        return Colors.blue;
      case 'delivered':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getIcon() {
    switch (status.toLowerCase()) {
      case 'pending':
        return Icons.schedule;
      case 'processing':
        return Icons.settings;
      case 'shipped':
        return Icons.local_shipping;
      case 'delivered':
        return Icons.check_circle;
      case 'cancelled':
        return Icons.cancel;
      default:
        return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getColor();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3), width: 0.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_getIcon(), color: color, size: 12),
          const SizedBox(width: 4),
          Text(
            status[0].toUpperCase() + status.substring(1),
            style: GoogleFonts.poppins(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Action Button
// ════════════════════════════════════════════════════════════════
class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: gold.withOpacity(0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: gold.withOpacity(0.2), width: 0.5),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: gold, size: 14),
            const SizedBox(width: 5),
            Text(
              label,
              style: GoogleFonts.poppins(
                color: gold,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Order Detail Screen
// ════════════════════════════════════════════════════════════════
class _OrderDetailScreen extends StatelessWidget {
  final Order order;

  const _OrderDetailScreen({required this.order});

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);
    final provider = context.read<AppProvider>();

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        backgroundColor: darkBg,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: gold, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Order Details',
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(AppConfig.cardBg),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: gold.withOpacity(0.08), width: 0.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        order.orderNumber,
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      _StatusBadge(status: order.status),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Placed on ${_formatDate(order.createdAt)}',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Order Timeline
            _buildTimeline(),
            const SizedBox(height: 16),

            // Items list
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(AppConfig.cardBg),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: gold.withOpacity(0.08), width: 0.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.shopping_bag_outlined, color: gold, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Items (${order.items.length})',
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...order.items.map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: SizedBox(
                                width: 52,
                                height: 52,
                                child: item.image != null && item.image!.isNotEmpty
                                    ? Image.network(
                                        AppConfig.getImageUrl(item.image),
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => Container(
                                          color: const Color(AppConfig.surfaceBg),
                                          child: Center(
                                            child: Icon(Icons.diamond,
                                                color: gold.withOpacity(0.4), size: 20),
                                          ),
                                        ),
                                      )
                                    : Container(
                                        color: const Color(AppConfig.surfaceBg),
                                        child: Center(
                                          child: Icon(Icons.diamond,
                                              color: gold.withOpacity(0.4), size: 20),
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(width: 12),
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
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Qty: ${item.quantity}',
                                    style: GoogleFonts.poppins(
                                      color: Colors.white.withOpacity(0.4),
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              provider.formatPrice(item.price * item.quantity),
                              style: GoogleFonts.poppins(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      )),
                  Container(height: 0.5, color: const Color(0xFF44403C)),
                  const SizedBox(height: 10),
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
                        provider.formatPrice(order.total),
                        style: GoogleFonts.poppins(
                          color: gold,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Order Timeline
  // ════════════════════════════════════════════════════════════════
  Widget _buildTimeline() {
    const gold = Color(AppConfig.primaryGold);
    const surfaceBg = Color(AppConfig.surfaceBg);

    final steps = [
      {'label': 'Ordered', 'icon': Icons.receipt_outlined},
      {'label': 'Confirmed', 'icon': Icons.verified_outlined},
      {'label': 'Shipped', 'icon': Icons.local_shipping_outlined},
      {'label': 'Delivered', 'icon': Icons.check_circle_outline},
    ];

    int currentStep;
    switch (order.status.toLowerCase()) {
      case 'pending':
        currentStep = 0;
        break;
      case 'confirmed':
      case 'processing':
        currentStep = 1;
        break;
      case 'shipped':
        currentStep = 2;
        break;
      case 'delivered':
        currentStep = 3;
        break;
      case 'cancelled':
        currentStep = -1;
        break;
      default:
        currentStep = 0;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(AppConfig.cardBg),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: gold.withOpacity(0.08), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (order.status.toLowerCase() == 'cancelled')
            Row(
              children: [
                const Icon(Icons.cancel, color: Colors.red, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Order Cancelled',
                  style: GoogleFonts.poppins(
                    color: Colors.red,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            )
          else
            ...List.generate(steps.length, (index) {
              final isCompleted = index <= currentStep;
              final isCurrent = index == currentStep;
              final isLast = index == steps.length - 1;

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Timeline dot + line
                  Column(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: isCompleted ? gold : surfaceBg,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isCompleted ? gold : gold.withOpacity(0.2),
                            width: isCurrent ? 2 : 1,
                          ),
                        ),
                        child: Icon(
                          steps[index]['icon'] as IconData,
                          color: isCompleted
                              ? const Color(AppConfig.darkBg)
                              : gold.withOpacity(0.3),
                          size: 14,
                        ),
                      ),
                      if (!isLast)
                        Container(
                          width: 2,
                          height: 24,
                          color: isCompleted ? gold : surfaceBg,
                        ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  // Label
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        steps[index]['label'] as String,
                        style: GoogleFonts.poppins(
                          color: isCompleted
                              ? Colors.white
                              : Colors.white.withOpacity(0.3),
                          fontSize: 13,
                          fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${date.day} ${months[date.month]}, ${date.year}';
  }
}
