import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../../services/api_service.dart';

// ════════════════════════════════════════════════════════════════
// Campaign Model
// ════════════════════════════════════════════════════════════════
class Campaign {
  final String id;
  final String name;
  final String occasion;
  final String status;
  final double budget;
  final double spent;
  final List<CampaignRecipient> recipients;
  final DateTime? deadline;

  Campaign({
    required this.id,
    required this.name,
    required this.occasion,
    required this.status,
    required this.budget,
    this.spent = 0,
    this.recipients = const [],
    this.deadline,
  });

  factory Campaign.fromJson(Map<String, dynamic> json) {
    return Campaign(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      occasion: json['occasion'] ?? '',
      status: json['status'] ?? 'draft',
      budget: (json['budget'] ?? 0).toDouble(),
      spent: (json['spent'] ?? 0).toDouble(),
      recipients: (json['recipients'] as List?)
              ?.map((e) => CampaignRecipient.fromJson(e))
              .toList() ??
          [],
      deadline: json['deadline'] != null ? DateTime.tryParse(json['deadline']) : null,
    );
  }

  double get progress => budget > 0 ? (spent / budget).clamp(0.0, 1.0) : 0.0;
  int get sentCount => recipients.where((r) => r.status.toLowerCase() != 'pending').length;
}

class CampaignRecipient {
  final String name;
  final String email;
  final String address;
  final String status;

  CampaignRecipient({
    required this.name,
    required this.email,
    required this.address,
    this.status = 'Pending',
  });

  factory CampaignRecipient.fromJson(Map<String, dynamic> json) {
    return CampaignRecipient(
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      address: json['address'] ?? '',
      status: json['status'] ?? 'Pending',
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Corporate Dashboard Screen
// ════════════════════════════════════════════════════════════════
class CorporateDashboardScreen extends StatefulWidget {
  const CorporateDashboardScreen({super.key});

  @override
  State<CorporateDashboardScreen> createState() => _CorporateDashboardScreenState();
}

class _CorporateDashboardScreenState extends State<CorporateDashboardScreen>
    with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();

  List<Campaign> _campaigns = [];
  bool _isLoading = true;
  String? _error;

  // Branding
  Color _primaryBrandColor = const Color(0xFFD4A437);
  Color _secondaryBrandColor = const Color(0xFF1C1917);
  bool _logoUploaded = false;

  // Create campaign form
  final _campaignNameCtrl = TextEditingController();
  final _campaignBudgetCtrl = TextEditingController();
  String _selectedOccasion = 'Diwali';
  DateTime? _campaignDeadline;
  final List<CampaignRecipient> _newRecipients = [];
  final List<String> _selectedProductIds = [];

  // Recipient form
  final _recipientNameCtrl = TextEditingController();
  final _recipientEmailCtrl = TextEditingController();
  final _recipientAddressCtrl = TextEditingController();

  // Available products for selection
  List<Product> _availableProducts = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _campaignNameCtrl.dispose();
    _campaignBudgetCtrl.dispose();
    _recipientNameCtrl.dispose();
    _recipientEmailCtrl.dispose();
    _recipientAddressCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _api.getCorporateCampaigns(),
        _api.getProducts(limit: 50),
      ]);

      final campaignData = results[0] as Map<String, dynamic>;
      final products = results[1] as List<Product>;

      if (mounted) {
        setState(() {
          _campaigns = (campaignData['campaigns'] as List?)
                  ?.map((e) => Campaign.fromJson(e))
                  .toList() ??
              [];
          _availableProducts = products;
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

    return Consumer<AppProvider>(
      builder: (context, provider, _) {
        // Role check
        if (provider.user == null || !provider.user!.isCorporate) {
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
                    'Corporate Access Required',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'You need a corporate account to access this dashboard.',
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
                Icon(Icons.business_center, color: gold, size: 22),
                const SizedBox(width: 8),
                Text(
                  'Corporate Gifting',
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh, color: gold, size: 22),
                onPressed: _loadData,
              ),
              IconButton(
                icon: const Icon(Icons.palette_outlined, color: gold, size: 22),
                onPressed: () => _showBrandingBottomSheet(provider),
                tooltip: 'Branding',
              ),
            ],
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
                  : _buildMainContent(provider),
          floatingActionButton: FloatingActionButton(
            onPressed: () => _showCreateCampaignDialog(provider),
            backgroundColor: gold,
            child: Icon(Icons.add, color: darkBg),
          ),
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
  // Main Content
  // ════════════════════════════════════════════════════════════════
  Widget _buildMainContent(AppProvider provider) {
    final totalRecipients = _campaigns.fold<int>(0, (sum, c) => sum + c.recipients.length);
    final totalBudget = _campaigns.fold<double>(0, (sum, c) => sum + c.budget);
    final totalSpent = _campaigns.fold<double>(0, (sum, c) => sum + c.spent);
    final totalSent = _campaigns.fold<int>(0, (sum, c) => sum + c.sentCount);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Overview Stats ──
          SizedBox(
            height: 110,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildStatCard(
                  icon: Icons.campaign_outlined,
                  title: 'Campaigns',
                  value: '${_campaigns.length}',
                  color: const Color(AppConfig.primaryGold),
                ),
                const SizedBox(width: 12),
                _buildStatCard(
                  icon: Icons.people_outlined,
                  title: 'Recipients',
                  value: '$totalRecipients',
                  color: Colors.teal.shade400,
                ),
                const SizedBox(width: 12),
                _buildStatCard(
                  icon: Icons.account_balance_wallet_outlined,
                  title: 'Budget Used',
                  value: provider.formatPrice(totalSpent),
                  color: Colors.orange.shade400,
                ),
                const SizedBox(width: 12),
                _buildStatCard(
                  icon: Icons.card_giftcard,
                  title: 'Gifts Sent',
                  value: '$totalSent',
                  color: Colors.green.shade400,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ── Active Campaigns ──
          _buildSectionTitle('Active Campaigns'),
          const SizedBox(height: 12),
          if (_campaigns.isEmpty)
            _buildEmptyState('No campaigns yet. Create your first campaign!', Icons.campaign_outlined)
          else
            ..._campaigns.map((campaign) => Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: _buildCampaignCard(campaign, provider),
                )),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Stat Card
  // ════════════════════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════════════════════
  // Campaign Card
  // ════════════════════════════════════════════════════════════════
  Widget _buildCampaignCard(Campaign campaign, AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    final statusColor = _getCampaignStatusColor(campaign.status);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: gold.withOpacity(0.12), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Expanded(
                child: Text(
                  campaign.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusColor.withOpacity(0.3), width: 0.5),
                ),
                child: Text(
                  campaign.status[0].toUpperCase() + campaign.status.substring(1),
                  style: GoogleFonts.poppins(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Occasion
          Row(
            children: [
              Icon(Icons.celebration_outlined, color: gold.withOpacity(0.6), size: 14),
              const SizedBox(width: 6),
              Text(
                campaign.occasion,
                style: GoogleFonts.poppins(
                  color: Colors.white54,
                  fontSize: 12,
                ),
              ),
              if (campaign.deadline != null) ...[
                const SizedBox(width: 16),
                Icon(Icons.event_outlined, color: gold.withOpacity(0.6), size: 14),
                const SizedBox(width: 6),
                Text(
                  _formatDate(campaign.deadline!),
                  style: GoogleFonts.poppins(
                    color: Colors.white54,
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 14),

          // Progress bar
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Budget',
                    style: GoogleFonts.poppins(color: Colors.white38, fontSize: 11),
                  ),
                  Text(
                    '${provider.formatPrice(campaign.spent)} / ${provider.formatPrice(campaign.budget)}',
                    style: GoogleFonts.poppins(color: Colors.white54, fontSize: 11),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: campaign.progress,
                  minHeight: 6,
                  backgroundColor: const Color(AppConfig.surfaceBg),
                  valueColor: AlwaysStoppedAnimation<Color>(
                    campaign.progress > 0.8 ? Colors.redAccent : gold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Recipient count & budget
          Row(
            children: [
              _buildInfoChip(Icons.people_outline, '${campaign.recipients.length} recipients', Colors.teal.shade400),
              const SizedBox(width: 12),
              _buildInfoChip(Icons.payments_outlined, provider.formatPrice(campaign.budget), Colors.orange.shade400),
              const SizedBox(width: 12),
              _buildInfoChip(Icons.card_giftcard, '${campaign.sentCount} sent', Colors.green.shade400),
            ],
          ),
          const SizedBox(height: 14),

          // Manage button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => _showCampaignDetail(campaign, provider),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: gold.withOpacity(0.3), width: 0.5),
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(
                'Manage Campaign',
                style: GoogleFonts.poppins(
                  color: gold,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 14),
        const SizedBox(width: 4),
        Text(
          label,
          style: GoogleFonts.poppins(
            color: Colors.white54,
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Campaign Detail Dialog
  // ════════════════════════════════════════════════════════════════
  void _showCampaignDetail(Campaign campaign, AppProvider provider) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: const Color(AppConfig.cardBg),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
            maxWidth: MediaQuery.of(context).size.width * 0.92,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(AppConfig.surfaceBg),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                  border: Border(
                    bottom: BorderSide(color: const Color(AppConfig.primaryGold).withOpacity(0.15), width: 0.5),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            campaign.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(Icons.celebration_outlined, color: const Color(AppConfig.primaryGold).withOpacity(0.7), size: 14),
                              const SizedBox(width: 4),
                              Text(
                                campaign.occasion,
                                style: GoogleFonts.poppins(color: Colors.white54, fontSize: 12),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white54),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Budget tracking
                      _buildDetailSection('Budget Tracking'),
                      const SizedBox(height: 10),
                      _buildBudgetRow('Total Budget', provider.formatPrice(campaign.budget), Colors.white),
                      const SizedBox(height: 6),
                      _buildBudgetRow('Spent', provider.formatPrice(campaign.spent), Colors.orange.shade400),
                      const SizedBox(height: 6),
                      _buildBudgetRow('Remaining', provider.formatPrice(campaign.budget - campaign.spent), Colors.green.shade400),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: campaign.progress,
                          minHeight: 8,
                          backgroundColor: const Color(AppConfig.surfaceBg),
                          valueColor: AlwaysStoppedAnimation<Color>(
                            campaign.progress > 0.8 ? Colors.redAccent : const Color(AppConfig.primaryGold),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Recipients list
                      _buildDetailSection('Recipients (${campaign.recipients.length})'),
                      const SizedBox(height: 10),
                      if (campaign.recipients.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Center(
                            child: Text(
                              'No recipients added',
                              style: GoogleFonts.poppins(color: Colors.white38, fontSize: 13),
                            ),
                          ),
                        )
                      else
                        ...campaign.recipients.map((recipient) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: _buildRecipientRow(recipient),
                            )),

                      const SizedBox(height: 20),

                      // Send Gifts button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: campaign.recipients.isEmpty
                              ? null
                              : () async {
                                  try {
                                    await _api.sendCorporateCampaignGifts(campaign.id);
                                    Navigator.pop(context);
                                    _showSnackBar('Gifts sent successfully!');
                                    _loadData();
                                  } catch (e) {
                                    Navigator.pop(context);
                                    _showSnackBar('Failed to send gifts: $e');
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(AppConfig.primaryGold),
                            foregroundColor: const Color(AppConfig.darkBg),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.card_giftcard, size: 18),
                              const SizedBox(width: 8),
                              Text(
                                'Send Gifts',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailSection(String title) {
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

  Widget _buildBudgetRow(String label, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.poppins(color: Colors.white38, fontSize: 13)),
        Text(value, style: GoogleFonts.poppins(color: valueColor, fontSize: 13, fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildRecipientRow(CampaignRecipient recipient) {
    const gold = Color(AppConfig.primaryGold);
    final statusColor = _getRecipientStatusColor(recipient.status);

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(AppConfig.surfaceBg),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: gold.withOpacity(0.08), width: 0.5),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [statusColor, statusColor.withOpacity(0.7)],
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                recipient.name
                    .split(' ')
                    .map((e) => e.isNotEmpty ? e[0] : '')
                    .take(2)
                    .join()
                    .toUpperCase(),
                style: GoogleFonts.poppins(
                  color: const Color(AppConfig.darkBg),
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  recipient.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                ),
                Text(
                  recipient.email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(color: Colors.white38, fontSize: 10),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              recipient.status,
              style: GoogleFonts.poppins(
                color: statusColor,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Create Campaign Dialog
  // ════════════════════════════════════════════════════════════════
  void _showCreateCampaignDialog(AppProvider provider) {
    _campaignNameCtrl.clear();
    _campaignBudgetCtrl.clear();
    _selectedOccasion = 'Diwali';
    _campaignDeadline = null;
    _newRecipients.clear();
    _selectedProductIds.clear();
    _recipientNameCtrl.clear();
    _recipientEmailCtrl.clear();
    _recipientAddressCtrl.clear();

    final occasions = ['Diwali', 'Holi', 'Christmas', 'New Year', 'Corporate Anniversary', 'Employee Birthday', 'Client Appreciation', 'Farewell', 'Other'];

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Dialog(
          backgroundColor: const Color(AppConfig.cardBg),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.9,
              maxWidth: MediaQuery.of(context).size.width * 0.92,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(AppConfig.surfaceBg),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                    border: Border(
                      bottom: BorderSide(color: const Color(AppConfig.primaryGold).withOpacity(0.15), width: 0.5),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Create Campaign',
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white54),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),

                // Form content
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Campaign name
                        _dialogTextField(_campaignNameCtrl, 'Campaign Name'),
                        const SizedBox(height: 12),

                        // Occasion dropdown
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(AppConfig.surfaceBg),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: const Color(AppConfig.primaryGold).withOpacity(0.15),
                              width: 0.5,
                            ),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedOccasion,
                              isExpanded: true,
                              dropdownColor: const Color(AppConfig.cardBg),
                              style: GoogleFonts.poppins(color: Colors.white, fontSize: 14),
                              icon: Icon(Icons.arrow_drop_down, color: const Color(AppConfig.primaryGold)),
                              items: occasions.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  _selectedOccasion = val;
                                  setDialogState(() {});
                                }
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Budget
                        _dialogTextField(
                          _campaignBudgetCtrl,
                          'Budget Amount',
                          keyboardType: TextInputType.number,
                        ),
                        const SizedBox(height: 12),

                        // Deadline picker
                        GestureDetector(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _campaignDeadline ?? DateTime.now().add(const Duration(days: 30)),
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                              builder: (context, child) {
                                return Theme(
                                  data: Theme.of(context).copyWith(
                                    colorScheme: const ColorScheme.dark(
                                      primary: Color(AppConfig.primaryGold),
                                      surface: Color(AppConfig.cardBg),
                                    ),
                                  ),
                                  child: child!,
                                );
                              },
                            );
                            if (picked != null) {
                              _campaignDeadline = picked;
                              setDialogState(() {});
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: const Color(AppConfig.surfaceBg),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: const Color(AppConfig.primaryGold).withOpacity(0.15),
                                width: 0.5,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.event_outlined, color: const Color(AppConfig.primaryGold), size: 18),
                                const SizedBox(width: 10),
                                Text(
                                  _campaignDeadline != null
                                      ? _formatDate(_campaignDeadline!)
                                      : 'Select Deadline',
                                  style: GoogleFonts.poppins(
                                    color: _campaignDeadline != null ? Colors.white : Colors.white38,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Add Recipients section
                        _buildDetailSection('Add Recipients'),
                        const SizedBox(height: 10),
                        _dialogTextField(_recipientNameCtrl, 'Recipient Name'),
                        const SizedBox(height: 8),
                        _dialogTextField(_recipientEmailCtrl, 'Email', keyboardType: TextInputType.emailAddress),
                        const SizedBox(height: 8),
                        _dialogTextField(_recipientAddressCtrl, 'Address'),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () {
                              if (_recipientNameCtrl.text.isNotEmpty && _recipientEmailCtrl.text.isNotEmpty) {
                                setDialogState(() {
                                  _newRecipients.add(CampaignRecipient(
                                    name: _recipientNameCtrl.text,
                                    email: _recipientEmailCtrl.text,
                                    address: _recipientAddressCtrl.text,
                                  ));
                                  _recipientNameCtrl.clear();
                                  _recipientEmailCtrl.clear();
                                  _recipientAddressCtrl.clear();
                                });
                              }
                            },
                            icon: const Icon(Icons.person_add_outlined, size: 16),
                            label: Text('Add Recipient', style: GoogleFonts.poppins(fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: const Color(AppConfig.primaryGold).withOpacity(0.3), width: 0.5),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),

                        // Show added recipients
                        if (_newRecipients.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          ..._newRecipients.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final r = entry.value;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: const Color(AppConfig.surfaceBg),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(r.name, style: GoogleFonts.poppins(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500)),
                                          Text(r.email, style: GoogleFonts.poppins(color: Colors.white38, fontSize: 10)),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: Icon(Icons.close, color: Colors.redAccent.shade200, size: 16),
                                      onPressed: () => setDialogState(() => _newRecipients.removeAt(idx)),
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        ],

                        const SizedBox(height: 20),

                        // Product selection
                        _buildDetailSection('Select Products'),
                        const SizedBox(height: 10),
                        if (_availableProducts.isEmpty)
                          Text(
                            'No products available',
                            style: GoogleFonts.poppins(color: Colors.white38, fontSize: 12),
                          )
                        else
                          ..._availableProducts.take(10).map((product) {
                            final isSelected = _selectedProductIds.contains(product.id);
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: GestureDetector(
                                onTap: () => setDialogState(() {
                                  if (isSelected) {
                                    _selectedProductIds.remove(product.id);
                                  } else {
                                    _selectedProductIds.add(product.id);
                                  }
                                }),
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? const Color(AppConfig.primaryGold).withOpacity(0.08)
                                        : const Color(AppConfig.surfaceBg),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isSelected
                                          ? const Color(AppConfig.primaryGold)
                                          : Colors.white12,
                                      width: 0.5,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      // Checkbox
                                      Container(
                                        width: 20,
                                        height: 20,
                                        decoration: BoxDecoration(
                                          color: isSelected ? const Color(AppConfig.primaryGold) : Colors.transparent,
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(
                                            color: isSelected ? const Color(AppConfig.primaryGold) : Colors.white24,
                                            width: 1,
                                          ),
                                        ),
                                        child: isSelected
                                            ? Icon(Icons.check, color: const Color(AppConfig.darkBg), size: 14)
                                            : null,
                                      ),
                                      const SizedBox(width: 10),
                                      // Product info
                                      Expanded(
                                        child: Text(
                                          product.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.poppins(
                                            color: Colors.white,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        provider.formatPrice(product.price),
                                        style: GoogleFonts.poppins(
                                          color: const Color(AppConfig.primaryGold),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }),

                        const SizedBox(height: 24),

                        // Create button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () async {
                              if (_campaignNameCtrl.text.isEmpty || _campaignBudgetCtrl.text.isEmpty) {
                                _showSnackBar('Please fill in campaign name and budget');
                                return;
                              }
                              Navigator.pop(context);
                              try {
                                await _api.createCorporateCampaign({
                                  'name': _campaignNameCtrl.text,
                                  'occasion': _selectedOccasion,
                                  'budget': double.tryParse(_campaignBudgetCtrl.text) ?? 0,
                                  'deadline': _campaignDeadline?.toIso8601String(),
                                  'recipients': _newRecipients.map((r) => {
                                    'name': r.name,
                                    'email': r.email,
                                    'address': r.address,
                                  }).toList(),
                                  'productIds': _selectedProductIds,
                                });
                                _showSnackBar('Campaign created successfully!');
                                _loadData();
                              } catch (e) {
                                _showSnackBar('Failed to create campaign: $e');
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(AppConfig.primaryGold),
                              foregroundColor: const Color(AppConfig.darkBg),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            child: Text(
                              'Create Campaign',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Branding Bottom Sheet
  // ════════════════════════════════════════════════════════════════
  void _showBrandingBottomSheet(AppProvider provider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(AppConfig.cardBg),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Drag handle
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
                  'Brand Customization',
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 20),

                // Company logo upload area
                _buildDetailSection('Company Logo'),
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () {
                    // Simulate logo upload
                    setSheetState(() => _logoUploaded = true);
                  },
                  child: Container(
                    width: double.infinity,
                    height: 120,
                    decoration: BoxDecoration(
                      color: const Color(AppConfig.surfaceBg),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: const Color(AppConfig.primaryGold).withOpacity(0.2),
                        width: 1,
                        strokeAlign: BorderSide.strokeAlignOutside,
                      ),
                    ),
                    child: _logoUploaded
                        ? Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.check_circle, color: Colors.green.shade400, size: 32),
                              const SizedBox(height: 8),
                              Text(
                                'Logo uploaded',
                                style: GoogleFonts.poppins(color: Colors.green.shade400, fontSize: 12, fontWeight: FontWeight.w500),
                              ),
                            ],
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.cloud_upload_outlined, color: const Color(AppConfig.primaryGold).withOpacity(0.5), size: 32),
                              const SizedBox(height: 8),
                              Text(
                                'Tap to upload logo',
                                style: GoogleFonts.poppins(color: Colors.white38, fontSize: 12),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'PNG, JPG up to 2MB',
                                style: GoogleFonts.poppins(color: Colors.white24, fontSize: 10),
                              ),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 20),

                // Primary color picker
                _buildDetailSection('Primary Brand Color'),
                const SizedBox(height: 10),
                _buildColorPickerRow(
                  label: 'Primary Color',
                  color: _primaryBrandColor,
                  onColorSelected: (color) {
                    setSheetState(() => _primaryBrandColor = color);
                  },
                ),
                const SizedBox(height: 14),

                // Secondary color picker
                _buildColorPickerRow(
                  label: 'Secondary Color',
                  color: _secondaryBrandColor,
                  onColorSelected: (color) {
                    setSheetState(() => _secondaryBrandColor = color);
                  },
                ),
                const SizedBox(height: 20),

                // Branded gift card preview
                _buildDetailSection('Gift Card Preview'),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        _primaryBrandColor,
                        _primaryBrandColor.withOpacity(0.7),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: _primaryBrandColor.withOpacity(0.3),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Text(
                        AppConfig.appName,
                        style: GoogleFonts.poppins(
                          color: _secondaryBrandColor,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        AppConfig.appTagline,
                        style: GoogleFonts.poppins(
                          color: _secondaryBrandColor.withOpacity(0.7),
                          fontSize: 11,
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                        decoration: BoxDecoration(
                          color: _secondaryBrandColor,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'GIFT CARD',
                          style: GoogleFonts.poppins(
                            color: _primaryBrandColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 2,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Save button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      Navigator.pop(context);
                      try {
                        await _api.updateCorporateBranding({
                          'primaryColor': '#${_primaryBrandColor.toARGB32().toRadixString(16).substring(2).toUpperCase()}',
                          'secondaryColor': '#${_secondaryBrandColor.toARGB32().toRadixString(16).substring(2).toUpperCase()}',
                        });
                        _showSnackBar('Branding saved successfully!');
                      } catch (e) {
                        _showSnackBar('Failed to save branding: $e');
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(AppConfig.primaryGold),
                      foregroundColor: const Color(AppConfig.darkBg),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: Text(
                      'Save Branding',
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildColorPickerRow({
    required String label,
    required Color color,
    required ValueChanged<Color> onColorSelected,
  }) {
    const presetColors = [
      Color(0xFFD4A437), // Gold
      Color(0xFF000000), // Black
      Color(0xFF1C1917), // Dark brown
      Color(0xFF0F172A), // Navy
      Color(0xFF991B1B), // Maroon
      Color(0xFF166534), // Forest green
      Color(0xFF1E40AF), // Royal blue
      Color(0xFF6B21A8), // Purple
      Color(0xFF9F1239), // Rose
      Color(0xFF78350F), // Brown
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white24, width: 1),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              label,
              style: GoogleFonts.poppins(color: Colors.white, fontSize: 13),
            ),
            const Spacer(),
            Text(
              '#${color.toARGB32().toRadixString(16).substring(2).toUpperCase()}',
              style: GoogleFonts.poppins(color: Colors.white38, fontSize: 11),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: presetColors.map((c) {
            final isSelected = c.toARGB32() == color.toARGB32();
            return GestureDetector(
              onTap: () => onColorSelected(c),
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: c,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected ? Colors.white : Colors.white12,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: isSelected
                    ? Icon(Icons.check, color: c.computeLuminance() > 0.5 ? Colors.black : Colors.white, size: 16)
                    : null,
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  // ════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.poppins(fontSize: 13)),
        backgroundColor: const Color(AppConfig.cardBg),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _dialogTextField(TextEditingController controller, String hint,
      {int maxLines = 1, TextInputType? keyboardType}) {
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
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: const Color(AppConfig.primaryGold).withOpacity(0.3)),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(color: Colors.white38, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  Color _getCampaignStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return Colors.green.shade400;
      case 'draft':
        return Colors.grey.shade400;
      case 'completed':
        return Colors.blue.shade400;
      case 'paused':
        return Colors.orange.shade400;
      case 'cancelled':
        return Colors.redAccent;
      default:
        return const Color(AppConfig.primaryGold);
    }
  }

  Color _getRecipientStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'delivered':
        return Colors.green.shade400;
      case 'sent':
        return Colors.blue.shade400;
      case 'pending':
        return Colors.orange.shade400;
      case 'failed':
        return Colors.redAccent;
      default:
        return Colors.grey.shade400;
    }
  }
}
