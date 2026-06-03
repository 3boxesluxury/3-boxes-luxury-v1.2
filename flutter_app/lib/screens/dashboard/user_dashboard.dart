import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../auth/auth_screen.dart';

class UserDashboard extends StatefulWidget {
  const UserDashboard({super.key});

  @override
  State<UserDashboard> createState() => _UserDashboardState();
}

class _UserDashboardState extends State<UserDashboard> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  bool _notificationsEnabled = true;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
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
      appBar: AppBar(
        backgroundColor: darkBg,
        elevation: 0,
        title: Text(
          'My Account',
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: gold, size: 22),
            onPressed: () {
              _showSettingsSheet(context);
            },
          ),
        ],
      ),
      body: Consumer<AppProvider>(
        builder: (context, provider, _) {
          final user = provider.user;

          if (user == null) {
            return _buildNotLoggedInState(provider);
          }

          return FadeTransition(
            opacity: _animController,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Profile Header ──
                  _ProfileHeader(user: user),
                  const SizedBox(height: 24),

                  // ── Order Statistics ──
                  _sectionTitle('Order Statistics'),
                  const SizedBox(height: 12),
                  _OrderStatsGrid(provider: provider),
                  const SizedBox(height: 24),

                  // ── Recent Orders ──
                  _sectionTitle('Recent Orders'),
                  const SizedBox(height: 12),
                  _RecentOrdersList(provider: provider),
                  const SizedBox(height: 24),

                  // ── Quick Actions ──
                  _sectionTitle('Quick Actions'),
                  const SizedBox(height: 12),
                  _QuickActionsGrid(),
                  const SizedBox(height: 24),

                  // ── Settings Section ──
                  _sectionTitle('Preferences'),
                  const SizedBox(height: 12),
                  _SettingsSection(
                    notificationsEnabled: _notificationsEnabled,
                    onNotificationsChanged: (val) {
                      setState(() => _notificationsEnabled = val);
                    },
                    provider: provider,
                  ),
                  const SizedBox(height: 24),

                  // ── Logout Button ──
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => _handleLogout(provider),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.redAccent.withOpacity(0.4), width: 0.5),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.logout, color: Colors.redAccent, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'Logout',
                            style: GoogleFonts.poppins(
                              color: Colors.redAccent,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
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
        },
      ),
    );
  }

  // ── Not Logged In State ──
  Widget _buildNotLoggedInState(AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: const Color(AppConfig.surfaceBg),
              shape: BoxShape.circle,
              border: Border.all(
                color: gold.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Icon(Icons.person_outline, color: gold.withOpacity(0.4), size: 40),
          ),
          const SizedBox(height: 20),
          Text(
            'Sign in to your account',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Access your orders, wishlist, and more',
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.4),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const AuthScreen()),
              );
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
            child: Text(
              'Sign In',
              style: GoogleFonts.poppins(
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Section Title ──
  Widget _sectionTitle(String title) {
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

  // ── Logout Handler ──
  void _handleLogout(AppProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(AppConfig.cardBg),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Logout',
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: Text(
          'Are you sure you want to logout?',
          style: GoogleFonts.poppins(
            color: Colors.white.withOpacity(0.6),
            fontSize: 14,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: GoogleFonts.poppins(color: Colors.white54),
            ),
          ),
          TextButton(
            onPressed: () {
              provider.logout();
              Navigator.pop(context);
            },
            child: Text(
              'Logout',
              style: GoogleFonts.poppins(color: Colors.redAccent, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  // ── Settings Sheet ──
  void _showSettingsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(AppConfig.cardBg),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Settings',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 20),
            _settingRow(Icons.language, 'Language', 'English'),
            const SizedBox(height: 16),
            _settingRow(Icons.currency_exchange, 'Currency', 'INR (₹)'),
            const SizedBox(height: 16),
            _settingRow(Icons.info_outline, 'App Version', '1.0.0'),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _settingRow(IconData icon, String label, String value) {
    const gold = Color(AppConfig.primaryGold);
    return Row(
      children: [
        Icon(icon, color: gold, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: GoogleFonts.poppins(color: Colors.white, fontSize: 14),
          ),
        ),
        Text(
          value,
          style: GoogleFonts.poppins(
            color: Colors.white.withOpacity(0.4),
            fontSize: 13,
          ),
        ),
        const SizedBox(width: 4),
        Icon(Icons.chevron_right, color: Colors.white.withOpacity(0.3), size: 18),
      ],
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Profile Header
// ════════════════════════════════════════════════════════════════
class _ProfileHeader extends StatelessWidget {
  final User user;

  const _ProfileHeader({required this.user});

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    final initials = user.name
        .split(' ')
        .map((e) => e.isNotEmpty ? e[0] : '')
        .take(2)
        .join()
        .toUpperCase();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: gold.withOpacity(0.15),
          width: 0.5,
        ),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  gold,
                  gold.withOpacity(0.7),
                ],
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                initials,
                style: GoogleFonts.poppins(
                  color: const Color(AppConfig.darkBg),
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),

          // Name, email, role
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  user.email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.4),
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 8),
                // Role badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: _getRoleColor(user.role).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _getRoleColor(user.role).withOpacity(0.3),
                      width: 0.5,
                    ),
                  ),
                  child: Text(
                    _getRoleLabel(user.role),
                    style: GoogleFonts.poppins(
                      color: _getRoleColor(user.role),
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Edit icon
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(AppConfig.surfaceBg),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: gold.withOpacity(0.15),
                width: 0.5,
              ),
            ),
            child: Icon(Icons.edit_outlined, color: gold, size: 16),
          ),
        ],
      ),
    );
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

  String _getRoleLabel(String role) {
    switch (role) {
      case 'ADMIN':
        return 'ADMIN';
      case 'AGENT':
        return 'AGENT';
      case 'TEAM_LEAD':
        return 'TEAM LEAD';
      case 'CORPORATE':
        return 'CORPORATE';
      default:
        return 'MEMBER';
    }
  }
}

// ════════════════════════════════════════════════════════════════
// Order Statistics Grid
// ════════════════════════════════════════════════════════════════
class _OrderStatsGrid extends StatelessWidget {
  final AppProvider provider;

  const _OrderStatsGrid({required this.provider});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: [
        _StatCard(
          title: 'Total Orders',
          value: '12',
          icon: Icons.receipt_long_outlined,
          color: const Color(AppConfig.primaryGold),
        ),
        _StatCard(
          title: 'Pending',
          value: '2',
          icon: Icons.schedule_outlined,
          color: Colors.orange.shade400,
        ),
        _StatCard(
          title: 'Delivered',
          value: '9',
          icon: Icons.check_circle_outline,
          color: Colors.green.shade400,
        ),
        _StatCard(
          title: 'Wishlist',
          value: '${provider.wishlistIds.length}',
          icon: Icons.favorite_outline,
          color: Colors.redAccent,
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(AppConfig.cardBg),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.1),
          width: 0.5,
        ),
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
                  value,
                  style: GoogleFonts.poppins(
                    color: color,
                    fontSize: 14,
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
}

// ════════════════════════════════════════════════════════════════
// Recent Orders List
// ════════════════════════════════════════════════════════════════
class _RecentOrdersList extends StatelessWidget {
  final AppProvider provider;

  const _RecentOrdersList({required this.provider});

  @override
  Widget build(BuildContext context) {
    // Sample orders since we don't have a real orders API call in the provider
    final sampleOrders = [
      _SampleOrder('#3BL-2847', 'Feb 28, 2025', 'Delivered', 4599.0),
      _SampleOrder('#3BL-2831', 'Feb 25, 2025', 'Shipped', 3249.0),
      _SampleOrder('#3BL-2815', 'Feb 20, 2025', 'Processing', 7899.0),
      _SampleOrder('#3BL-2790', 'Feb 15, 2025', 'Delivered', 1999.0),
    ];

    return Column(
      children: sampleOrders.map((order) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _OrderCard(order: order, provider: provider),
        );
      }).toList(),
    );
  }
}

class _SampleOrder {
  final String orderNumber;
  final String date;
  final String status;
  final double total;

  _SampleOrder(this.orderNumber, this.date, this.status, this.total);
}

class _OrderCard extends StatelessWidget {
  final _SampleOrder order;
  final AppProvider provider;

  const _OrderCard({required this.order, required this.provider});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(AppConfig.cardBg),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(AppConfig.primaryGold).withOpacity(0.08),
          width: 0.5,
        ),
      ),
      child: Row(
        children: [
          // Order icon
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(AppConfig.surfaceBg),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.receipt_outlined,
              color: const Color(AppConfig.primaryGold).withOpacity(0.6),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),

          // Order details
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
                  order.date,
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.4),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),

          // Status + total
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _getStatusColor(order.status).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  order.status,
                  style: GoogleFonts.poppins(
                    color: _getStatusColor(order.status),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                provider.formatPrice(order.total),
                style: GoogleFonts.poppins(
                  color: const Color(AppConfig.primaryGold),
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

  Color _getStatusColor(String status) {
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
}

// ════════════════════════════════════════════════════════════════
// Quick Actions Grid
// ════════════════════════════════════════════════════════════════
class _QuickActionsGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    final actions = [
      _QuickAction(Icons.receipt_long_outlined, 'My Orders', gold),
      _QuickAction(Icons.favorite_outline, 'Wishlist', Colors.redAccent),
      _QuickAction(Icons.local_shipping_outlined, 'Track Order', Colors.blue.shade400),
      _QuickAction(Icons.headset_mic_outlined, 'Support', Colors.green.shade400),
    ];

    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 0.85,
      children: actions.map((action) {
        return GestureDetector(
          onTap: () {
            // TODO: Navigate to respective screens
          },
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(AppConfig.cardBg),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: action.color.withOpacity(0.15),
                    width: 0.5,
                  ),
                ),
                child: Icon(action.icon, color: action.color, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                action.label,
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  color: Colors.white.withOpacity(0.7),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _QuickAction {
  final IconData icon;
  final String label;
  final Color color;

  _QuickAction(this.icon, this.label, this.color);
}

// ════════════════════════════════════════════════════════════════
// Settings Section
// ════════════════════════════════════════════════════════════════
class _SettingsSection extends StatelessWidget {
  final bool notificationsEnabled;
  final ValueChanged<bool> onNotificationsChanged;
  final AppProvider provider;

  const _SettingsSection({
    required this.notificationsEnabled,
    required this.onNotificationsChanged,
    required this.provider,
  });

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(AppConfig.cardBg),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: gold.withOpacity(0.08),
          width: 0.5,
        ),
      ),
      child: Column(
        children: [
          // Currency
          _settingRow(
            icon: Icons.currency_exchange_outlined,
            title: 'Currency',
            value: '${provider.currencyCode} (${provider.currencySymbol})',
            onTap: () {},
          ),
          Container(height: 0.5, color: const Color(0xFF44403C)),
          // Language
          _settingRow(
            icon: Icons.language_outlined,
            title: 'Language',
            value: 'English',
            onTap: () {},
          ),
          Container(height: 0.5, color: const Color(0xFF44403C)),
          // Notifications
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Row(
              children: [
                Icon(Icons.notifications_outlined, color: gold, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Notifications',
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                ),
                SizedBox(
                  height: 28,
                  child: Switch(
                    value: notificationsEnabled,
                    onChanged: onNotificationsChanged,
                    activeColor: gold,
                    activeTrackColor: gold.withOpacity(0.4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _settingRow({
    required IconData icon,
    required String title,
    required String value,
    required VoidCallback onTap,
  }) {
    const gold = Color(AppConfig.primaryGold);

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Icon(icon, color: gold, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 14,
                ),
              ),
            ),
            Text(
              value,
              style: GoogleFonts.poppins(
                color: Colors.white.withOpacity(0.4),
                fontSize: 13,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right, color: Colors.white.withOpacity(0.3), size: 18),
          ],
        ),
      ),
    );
  }
}
