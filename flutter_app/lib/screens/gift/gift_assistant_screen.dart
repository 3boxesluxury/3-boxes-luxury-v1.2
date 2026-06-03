import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';

class GiftAssistantScreen extends StatefulWidget {
  const GiftAssistantScreen({super.key});

  @override
  State<GiftAssistantScreen> createState() => _GiftAssistantScreenState();
}

class _GiftAssistantScreenState extends State<GiftAssistantScreen>
    with SingleTickerProviderStateMixin {
  int _currentStep = 0;
  final int _totalSteps = 4;

  // Step selections
  String? _selectedOccasion;
  String? _selectedRecipient;
  String? _selectedRelationship;
  double _budget = 5000;

  // Results
  List<GiftRecommendation> _recommendations = [];
  bool _isLoadingRecommendations = false;
  bool _hasResults = false;

  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  // Options
  static const List<Map<String, dynamic>> _occasions = [
    {'label': 'Birthday', 'icon': Icons.cake_outlined},
    {'label': 'Anniversary', 'icon': Icons.favorite_outline},
    {'label': 'Wedding', 'icon': Icons.church_outlined},
    {'label': 'Festival', 'icon': Icons.celebration_outlined},
    {'label': "Valentine's", 'icon': Icons.favorite_border},
    {'label': 'Housewarming', 'icon': Icons.home_outlined},
    {'label': 'Congratulations', 'icon': Icons.emoji_events_outlined},
    {'label': 'Thank You', 'icon': Icons.volunteer_activism_outlined},
  ];

  static const List<Map<String, dynamic>> _recipients = [
    {'label': 'For Her', 'icon': Icons.face_3_outlined},
    {'label': 'For Him', 'icon': Icons.face_outlined},
    {'label': 'For Couple', 'icon': Icons.people_outline},
    {'label': 'For Kids', 'icon': Icons.child_care_outlined},
    {'label': 'For Parents', 'icon': Icons.family_restroom_outlined},
    {'label': 'For Friend', 'icon': Icons.waving_hand_outlined},
  ];

  static const List<Map<String, dynamic>> _relationships = [
    {'label': 'Partner', 'icon': Icons.favorite_outline},
    {'label': 'Parent', 'icon': Icons.elderly_outlined},
    {'label': 'Sibling', 'icon': Icons.people_outline},
    {'label': 'Friend', 'icon': Icons.handshake_outlined},
    {'label': 'Colleague', 'icon': Icons.work_outline},
    {'label': 'Boss', 'icon': Icons.badge_outlined},
  ];

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0.15, 0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _goToStep(int step) {
    if (step == _currentStep) return;
    setState(() => _currentStep = step);
    _animationController.reset();
    _animationController.forward();
  }

  void _nextStep() {
    if (_currentStep < _totalSteps - 1) {
      _goToStep(_currentStep + 1);
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      _goToStep(_currentStep - 1);
    }
  }

  Future<void> _getRecommendations() async {
    if (_selectedOccasion == null ||
        _selectedRecipient == null ||
        _selectedRelationship == null) {
      return;
    }

    setState(() {
      _isLoadingRecommendations = true;
      _hasResults = false;
    });

    final provider = context.read<AppProvider>();
    final results = await provider.getGiftRecommendations(
      occasion: _selectedOccasion!,
      recipient: _selectedRecipient!,
      relationship: _selectedRelationship!,
      budget: _budget,
    );

    if (mounted) {
      setState(() {
        _recommendations = results;
        _isLoadingRecommendations = false;
        _hasResults = true;
      });
      _animationController.reset();
      _animationController.forward();
    }
  }

  void _resetWizard() {
    setState(() {
      _currentStep = 0;
      _selectedOccasion = null;
      _selectedRecipient = null;
      _selectedRelationship = null;
      _budget = 5000;
      _recommendations = [];
      _hasResults = false;
    });
    _animationController.reset();
    _animationController.forward();
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
            const Icon(Icons.auto_awesome, color: gold, size: 22),
            const SizedBox(width: 10),
            Text(
              'AI Gift Assistant',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      body: _hasResults ? _buildResultsView() : _buildWizardView(),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Wizard View
  // ════════════════════════════════════════════════════════════════
  Widget _buildWizardView() {
    return Column(
      children: [
        // Step indicator
        _buildStepIndicator(),
        // Step content
        Expanded(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: SlideTransition(
              position: _slideAnimation,
              child: _buildStepContent(),
            ),
          ),
        ),
        // Bottom navigation
        _buildStepNavigation(),
      ],
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Step Indicator
  // ════════════════════════════════════════════════════════════════
  Widget _buildStepIndicator() {
    const gold = Color(AppConfig.primaryGold);
    const surfaceBg = Color(AppConfig.surfaceBg);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: List.generate(_totalSteps, (index) {
          final isActive = index == _currentStep;
          final isCompleted = index < _currentStep;

          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 4,
                    decoration: BoxDecoration(
                      color: isCompleted || isActive
                          ? gold
                          : surfaceBg,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                if (index < _totalSteps - 1) const SizedBox(width: 8),
              ],
            ),
          );
        }),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Step Content
  // ════════════════════════════════════════════════════════════════
  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildOccasionStep();
      case 1:
        return _buildRecipientStep();
      case 2:
        return _buildRelationshipStep();
      case 3:
        return _buildBudgetStep();
      default:
        return const SizedBox.shrink();
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Step 1: Occasion
  // ════════════════════════════════════════════════════════════════
  Widget _buildOccasionStep() {
    return _StepWrapper(
      title: 'What\'s the Occasion?',
      subtitle: 'Select the event you\'re celebrating',
      child: GridView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 2.2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: _occasions.length,
        itemBuilder: (context, index) {
          final item = _occasions[index];
          final isSelected = _selectedOccasion == item['label'];
          return _OptionCard(
            label: item['label'],
            icon: item['icon'] as IconData,
            isSelected: isSelected,
            onTap: () {
              setState(() => _selectedOccasion = item['label']);
              Future.delayed(const Duration(milliseconds: 200), _nextStep);
            },
          );
        },
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Step 2: Recipient
  // ════════════════════════════════════════════════════════════════
  Widget _buildRecipientStep() {
    return _StepWrapper(
      title: 'Who is it for?',
      subtitle: 'Select the gift recipient',
      child: GridView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 2.2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: _recipients.length,
        itemBuilder: (context, index) {
          final item = _recipients[index];
          final isSelected = _selectedRecipient == item['label'];
          return _OptionCard(
            label: item['label'],
            icon: item['icon'] as IconData,
            isSelected: isSelected,
            onTap: () {
              setState(() => _selectedRecipient = item['label']);
              Future.delayed(const Duration(milliseconds: 200), _nextStep);
            },
          );
        },
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Step 3: Relationship
  // ════════════════════════════════════════════════════════════════
  Widget _buildRelationshipStep() {
    return _StepWrapper(
      title: 'Your Relationship?',
      subtitle: 'Help us personalize recommendations',
      child: GridView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 2.2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: _relationships.length,
        itemBuilder: (context, index) {
          final item = _relationships[index];
          final isSelected = _selectedRelationship == item['label'];
          return _OptionCard(
            label: item['label'],
            icon: item['icon'] as IconData,
            isSelected: isSelected,
            onTap: () {
              setState(() => _selectedRelationship = item['label']);
              Future.delayed(const Duration(milliseconds: 200), _nextStep);
            },
          );
        },
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Step 4: Budget
  // ════════════════════════════════════════════════════════════════
  Widget _buildBudgetStep() {
    const gold = Color(AppConfig.primaryGold);
    final provider = context.read<AppProvider>();

    return _StepWrapper(
      title: 'Set Your Budget',
      subtitle: 'We\'ll find gifts within your range',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          children: [
            const Spacer(flex: 1),
            // Budget display
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(AppConfig.cardBg),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: gold.withOpacity(0.2),
                  width: 0.5,
                ),
              ),
              child: Column(
                children: [
                  Text(
                    'Your Budget',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    provider.formatPrice(_budget),
                    style: GoogleFonts.poppins(
                      color: gold,
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Range labels
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        provider.formatPrice(500),
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.4),
                          fontSize: 11,
                        ),
                      ),
                      Text(
                        provider.formatPrice(100000),
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.4),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Slider
                  SliderTheme(
                    data: SliderThemeData(
                      activeTrackColor: gold,
                      inactiveTrackColor: const Color(AppConfig.surfaceBg),
                      thumbColor: gold,
                      overlayColor: gold.withOpacity(0.12),
                      trackHeight: 4,
                      thumbShape: const RoundSliderThumbShape(
                        enabledThumbRadius: 12,
                      ),
                    ),
                    child: Slider(
                      value: _budget,
                      min: 500,
                      max: 100000,
                      onChanged: (value) {
                        setState(() => _budget = value);
                      },
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(flex: 2),
            // Get Recommendations button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _getRecommendations,
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
                    const Icon(Icons.auto_awesome, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Get Recommendations',
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Step Navigation
  // ════════════════════════════════════════════════════════════════
  Widget _buildStepNavigation() {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      decoration: BoxDecoration(
        color: cardBg,
        border: Border(
          top: BorderSide(
            color: gold.withOpacity(0.1),
            width: 0.5,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: _prevStep,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: gold,
                    side: const BorderSide(color: gold, width: 1),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.arrow_back_ios_new, size: 14),
                      const SizedBox(width: 6),
                      Text(
                        'Back',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            if (_currentStep > 0) const SizedBox(width: 12),
            if (_currentStep < _totalSteps - 1)
              Expanded(
                child: ElevatedButton(
                  onPressed: _canProceed() ? _nextStep : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: gold,
                    foregroundColor: const Color(AppConfig.darkBg),
                    disabledBackgroundColor: gold.withOpacity(0.3),
                    disabledForegroundColor: const Color(AppConfig.darkBg).withOpacity(0.5),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Continue',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.arrow_forward_ios, size: 14),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  bool _canProceed() {
    switch (_currentStep) {
      case 0:
        return _selectedOccasion != null;
      case 1:
        return _selectedRecipient != null;
      case 2:
        return _selectedRelationship != null;
      case 3:
        return _budget > 0;
      default:
        return false;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Results View
  // ════════════════════════════════════════════════════════════════
  Widget _buildResultsView() {
    const gold = Color(AppConfig.primaryGold);

    if (_isLoadingRecommendations) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: gold, strokeWidth: 2),
            const SizedBox(height: 16),
            Text(
              'Finding perfect gifts...',
              style: GoogleFonts.poppins(
                color: Colors.white.withOpacity(0.6),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Our AI is curating recommendations for you',
              style: GoogleFonts.poppins(
                color: Colors.white.withOpacity(0.3),
                fontSize: 12,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Summary bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          color: const Color(AppConfig.cardBg),
          child: Row(
            children: [
              Icon(Icons.auto_awesome, color: gold, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '$_selectedOccasion · $_selectedRecipient · $_selectedRelationship',
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              GestureDetector(
                onTap: _resetWizard,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    border: Border.all(color: gold.withOpacity(0.3)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Refine',
                    style: GoogleFonts.poppins(
                      color: gold,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Results grid
        Expanded(
          child: _recommendations.isEmpty
              ? _buildNoResults()
              : FadeTransition(
                  opacity: _fadeAnimation,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.55,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: _recommendations.length,
                    itemBuilder: (context, index) {
                      return _RecommendationCard(
                        recommendation: _recommendations[index],
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildNoResults() {
    const gold = Color(AppConfig.primaryGold);

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.search_off,
            size: 64,
            color: gold.withOpacity(0.3),
          ),
          const SizedBox(height: 16),
          Text(
            'No gifts found',
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.5),
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your preferences',
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.3),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _resetWizard,
            style: ElevatedButton.styleFrom(
              backgroundColor: gold,
              foregroundColor: const Color(AppConfig.darkBg),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              elevation: 0,
            ),
            child: Text(
              'Try Again',
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Step Wrapper
// ════════════════════════════════════════════════════════════════
class _StepWrapper extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;

  const _StepWrapper({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: GoogleFonts.poppins(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Option Card
// ════════════════════════════════════════════════════════════════
class _OptionCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _OptionCard({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected ? gold.withOpacity(0.12) : cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? gold : gold.withOpacity(0.08),
            width: isSelected ? 1.2 : 0.5,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isSelected ? gold : Colors.white.withOpacity(0.5),
              size: 20,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                label,
                style: GoogleFonts.poppins(
                  color: isSelected ? gold : Colors.white.withOpacity(0.7),
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Recommendation Card
// ════════════════════════════════════════════════════════════════
class _RecommendationCard extends StatelessWidget {
  final GiftRecommendation recommendation;

  const _RecommendationCard({required this.recommendation});

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);
    final provider = context.watch<AppProvider>();

    return Container(
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
          // Image
          Expanded(
            flex: 3,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  child: Image.network(
                    recommendation.image,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: const Color(AppConfig.surfaceBg),
                      child: Center(
                        child: Icon(Icons.diamond, color: gold.withOpacity(0.4), size: 32),
                      ),
                    ),
                  ),
                ),
                // AI badge
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: gold.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.auto_awesome, size: 10, color: Color(AppConfig.darkBg)),
                        const SizedBox(width: 3),
                        Text(
                          'AI Pick',
                          style: GoogleFonts.poppins(
                            color: const Color(AppConfig.darkBg),
                            fontSize: 8,
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

          // Details
          Expanded(
            flex: 3,
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    recommendation.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    provider.formatPrice(recommendation.price),
                    style: GoogleFonts.poppins(
                      color: gold,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    recommendation.reason,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 10,
                      height: 1.4,
                    ),
                  ),
                  const Spacer(),
                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            // Find matching product and add to cart
                            final products = provider.products;
                            final match = products.where(
                              (p) => p.id == recommendation.id || p.name == recommendation.name,
                            );
                            if (match.isNotEmpty) {
                              provider.addToCart(match.first);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: const Color(AppConfig.cardBg),
                                  content: Text(
                                    '${recommendation.name} added to bag',
                                    style: const TextStyle(color: Colors.white),
                                  ),
                                  duration: const Duration(seconds: 2),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: gold,
                            foregroundColor: const Color(AppConfig.darkBg),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            elevation: 0,
                            minimumSize: Size.zero,
                          ),
                          child: Text(
                            'Add to Cart',
                            style: GoogleFonts.poppins(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: gold.withOpacity(0.3)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(8),
                            onTap: () {
                              final products = provider.products;
                              final match = products.where(
                                (p) => p.id == recommendation.id || p.name == recommendation.name,
                              );
                              if (match.isNotEmpty) {
                                provider.selectProduct(match.first);
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => const _ProductDetailPlaceholder(),
                                  ),
                                );
                              }
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(8),
                              child: Icon(Icons.visibility, color: gold, size: 16),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Placeholder for product detail navigation
class _ProductDetailPlaceholder extends StatelessWidget {
  const _ProductDetailPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(AppConfig.darkBg),
      appBar: AppBar(
        backgroundColor: const Color(AppConfig.darkBg),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(AppConfig.primaryGold), size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Product Details',
          style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ),
      body: Center(
        child: Text(
          'Product detail view',
          style: GoogleFonts.poppins(color: Colors.white54, fontSize: 16),
        ),
      ),
    );
  }
}
