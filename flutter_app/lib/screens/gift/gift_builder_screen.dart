import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';

// Box size options
class _BoxSize {
  final String label;
  final String description;
  final double price;
  final int maxItems;
  final IconData icon;

  const _BoxSize({
    required this.label,
    required this.description,
    required this.price,
    required this.maxItems,
    required this.icon,
  });
}

const _boxSizes = [
  _BoxSize(label: 'Small', description: 'Up to 3 items', price: 999, maxItems: 3, icon: Icons.card_giftcard),
  _BoxSize(label: 'Medium', description: 'Up to 5 items', price: 1999, maxItems: 5, icon: Icons.inventory_2),
  _BoxSize(label: 'Large', description: 'Up to 8 items', price: 2999, maxItems: 8, icon: Icons.local_shipping),
];

class GiftBuilderScreen extends StatefulWidget {
  const GiftBuilderScreen({super.key});

  @override
  State<GiftBuilderScreen> createState() => _GiftBuilderScreenState();
}

class _GiftBuilderScreenState extends State<GiftBuilderScreen>
    with SingleTickerProviderStateMixin {
  int _currentStep = 0;
  final int _totalSteps = 4;

  // Builder state
  int _selectedBoxIndex = -1;
  final List<Product> _selectedProducts = [];
  final TextEditingController _messageController = TextEditingController();
  String _searchQuery = '';

  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  // Gift box animation
  late AnimationController _boxAnimController;

  _BoxSize? get _selectedBox =>
      _selectedBoxIndex >= 0 ? _boxSizes[_selectedBoxIndex] : null;

  double get _boxPrice => _selectedBox?.price ?? 0;
  double get _productsTotal =>
      _selectedProducts.fold(0.0, (sum, p) => sum + p.price);
  double get _grandTotal => _boxPrice + _productsTotal;

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

    _boxAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animationController.dispose();
    _boxAnimController.dispose();
    _messageController.dispose();
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

  void _addProduct(Product product) {
    if (_selectedBox == null) return;
    if (_selectedProducts.length >= _selectedBox!.maxItems) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(AppConfig.cardBg),
          content: Text(
            'Maximum ${_selectedBox!.maxItems} items for ${_selectedBox!.label} box',
            style: const TextStyle(color: Colors.white),
          ),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }
    if (_selectedProducts.any((p) => p.id == product.id)) return;
    setState(() => _selectedProducts.add(product));
  }

  void _removeProduct(Product product) {
    setState(() => _selectedProducts.removeWhere((p) => p.id == product.id));
  }

  void _addToCart() {
    if (_selectedBox == null) return;

    final provider = context.read<AppProvider>();

    // Add box as a special cart item
    provider.addToCart(Product(
      id: 'gift-box-${_selectedBox!.label.toLowerCase()}-${DateTime.now().millisecondsSinceEpoch}',
      name: '${_selectedBox!.label} Gift Box',
      slug: 'gift-box-${_selectedBox!.label.toLowerCase()}',
      description: _messageController.text.isNotEmpty
          ? 'Message: ${_messageController.text}'
          : 'Custom gift box with ${_selectedProducts.length} items',
      price: _grandTotal,
      images: [_selectedProducts.isNotEmpty ? _selectedProducts.first.images.first : ''],
      category: 'Gift Boxes',
      categorySlug: 'gift-boxes',
      stock: 99,
      rating: 5.0,
      reviewCount: 0,
      featured: false,
      tags: ['gift-box', 'custom'],
    ));

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(AppConfig.cardBg),
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Color(AppConfig.primaryGold), size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '${_selectedBox!.label} Gift Box added to bag!',
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );

    Navigator.of(context).pop();
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
            const Icon(Icons.card_giftcard, color: gold, size: 22),
            const SizedBox(width: 10),
            Text(
              'Build Your Gift Box',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          _buildStepIndicator(),
          Expanded(
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: _buildStepContent(),
              ),
            ),
          ),
          _buildRunningTotal(),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Step Indicator
  // ════════════════════════════════════════════════════════════════
  Widget _buildStepIndicator() {
    const gold = Color(AppConfig.primaryGold);
    const surfaceBg = Color(AppConfig.surfaceBg);

    final stepLabels = ['Box Size', 'Products', 'Message', 'Preview'];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: List.generate(_totalSteps, (index) {
          final isActive = index == _currentStep;
          final isCompleted = index < _currentStep;

          return Expanded(
            child: GestureDetector(
              onTap: () {
                if (isCompleted) _goToStep(index);
              },
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 3,
                          decoration: BoxDecoration(
                            color: isCompleted || isActive ? gold : surfaceBg,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      if (index < _totalSteps - 1) const SizedBox(width: 4),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    stepLabels[index],
                    style: GoogleFonts.poppins(
                      color: isActive
                          ? gold
                          : isCompleted
                              ? Colors.white.withOpacity(0.6)
                              : Colors.white.withOpacity(0.25),
                      fontSize: 10,
                      fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
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
        return _buildBoxSizeStep();
      case 1:
        return _buildProductsStep();
      case 2:
        return _buildMessageStep();
      case 3:
        return _buildPreviewStep();
      default:
        return const SizedBox.shrink();
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Step 1: Box Size
  // ════════════════════════════════════════════════════════════════
  Widget _buildBoxSizeStep() {
    const gold = Color(AppConfig.primaryGold);
    final provider = context.read<AppProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Choose Your Box',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Select the perfect box size for your gift',
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.4),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 24),
          // Gift box animation
          Center(
            child: AnimatedBuilder(
              animation: _boxAnimController,
              builder: (context, child) {
                final scale = 1.0 + 0.03 * _boxAnimController.value;
                return Transform.scale(
                  scale: scale,
                  child: child,
                );
              },
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      gold.withOpacity(0.2),
                      gold.withOpacity(0.05),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: gold.withOpacity(0.3), width: 1),
                ),
                child: Center(
                  child: Icon(
                    Icons.card_giftcard,
                    color: gold,
                    size: 52,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 28),
          ...List.generate(_boxSizes.length, (index) {
            final box = _boxSizes[index];
            final isSelected = _selectedBoxIndex == index;
            return Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: GestureDetector(
                onTap: () {
                  setState(() => _selectedBoxIndex = index);
                  // Remove excess products if new box is smaller
                  while (_selectedProducts.length > box.maxItems) {
                    _selectedProducts.removeLast();
                  }
                  Future.delayed(const Duration(milliseconds: 300), _nextStep);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? gold.withOpacity(0.12)
                        : const Color(AppConfig.cardBg),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? gold : gold.withOpacity(0.08),
                      width: isSelected ? 1.2 : 0.5,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? gold.withOpacity(0.2)
                              : const Color(AppConfig.surfaceBg),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          box.icon,
                          color: isSelected ? gold : Colors.white.withOpacity(0.5),
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${box.label} Box',
                              style: GoogleFonts.poppins(
                                color: isSelected ? gold : Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              box.description,
                              style: GoogleFonts.poppins(
                                color: Colors.white.withOpacity(0.4),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        provider.formatPrice(box.price),
                        style: GoogleFonts.poppins(
                          color: isSelected ? gold : Colors.white.withOpacity(0.7),
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Step 2: Add Products
  // ════════════════════════════════════════════════════════════════
  Widget _buildProductsStep() {
    const gold = Color(AppConfig.primaryGold);
    final provider = context.watch<AppProvider>();

    // Filter products
    final filteredProducts = _searchQuery.isEmpty
        ? provider.products
        : provider.products
            .where((p) => p.name.toLowerCase().contains(_searchQuery.toLowerCase()))
            .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Add Products',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _selectedBox != null
                    ? '${_selectedProducts.length}/${_selectedBox!.maxItems} items selected'
                    : 'Select a box first',
                style: GoogleFonts.poppins(
                  color: gold,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 12),
              // Search bar
              Container(
                decoration: BoxDecoration(
                  color: const Color(AppConfig.cardBg),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: gold.withOpacity(0.1), width: 0.5),
                ),
                child: TextField(
                  onChanged: (v) => setState(() => _searchQuery = v),
                  style: GoogleFonts.poppins(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search products...',
                    hintStyle: GoogleFonts.poppins(color: Colors.white38, fontSize: 14),
                    prefixIcon: Icon(Icons.search, color: gold.withOpacity(0.6), size: 20),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Selected products chips
        if (_selectedProducts.isNotEmpty)
          Container(
            height: 56,
            margin: const EdgeInsets.only(top: 12),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _selectedProducts.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final product = _selectedProducts[index];
                return Chip(
                  label: Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  deleteIconColor: Colors.redAccent,
                  onDeleted: () => _removeProduct(product),
                  backgroundColor: const Color(AppConfig.surfaceBg),
                  side: BorderSide(color: gold.withOpacity(0.2)),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                );
              },
            ),
          ),

        const SizedBox(height: 8),

        // Product grid
        Expanded(
          child: filteredProducts.isEmpty
              ? Center(
                  child: Text(
                    'No products found',
                    style: GoogleFonts.poppins(color: Colors.white38, fontSize: 14),
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.58,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: filteredProducts.length,
                  itemBuilder: (context, index) {
                    final product = filteredProducts[index];
                    final isSelected = _selectedProducts.any((p) => p.id == product.id);
                    return _BuilderProductCard(
                      product: product,
                      isSelected: isSelected,
                      canAdd: _selectedBox != null &&
                          _selectedProducts.length < _selectedBox!.maxItems,
                      onTap: () {
                        if (isSelected) {
                          _removeProduct(product);
                        } else {
                          _addProduct(product);
                        }
                      },
                      provider: provider,
                    );
                  },
                ),
        ),

        // Navigation
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _prevStep,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: gold,
                    side: const BorderSide(color: gold, width: 1),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    'Back',
                    style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _selectedProducts.isNotEmpty ? _nextStep : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: gold,
                    foregroundColor: const Color(AppConfig.darkBg),
                    disabledBackgroundColor: gold.withOpacity(0.3),
                    disabledForegroundColor: const Color(AppConfig.darkBg).withOpacity(0.5),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: Text(
                    'Continue',
                    style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Step 3: Message Card
  // ════════════════════════════════════════════════════════════════
  Widget _buildMessageStep() {
    const gold = Color(AppConfig.primaryGold);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Add a Message',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Personalize your gift with a heartfelt note (optional)',
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.4),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 24),
          // Animated gift card preview
          Center(
            child: AnimatedBuilder(
              animation: _boxAnimController,
              builder: (context, child) {
                return Transform.scale(
                  scale: 1.0 + 0.01 * _boxAnimController.value,
                  child: child,
                );
              },
              child: Container(
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 320),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      const Color(AppConfig.surfaceBg),
                      const Color(AppConfig.cardBg),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: gold.withOpacity(0.2), width: 0.5),
                ),
                child: Column(
                  children: [
                    Icon(Icons.mail_outline, color: gold.withOpacity(0.5), size: 32),
                    const SizedBox(height: 12),
                    Text(
                      _messageController.text.isEmpty
                          ? 'Your message will appear here...'
                          : _messageController.text,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        color: _messageController.text.isEmpty
                            ? Colors.white.withOpacity(0.25)
                            : Colors.white.withOpacity(0.8),
                        fontSize: 14,
                        fontStyle: _messageController.text.isEmpty
                            ? FontStyle.italic
                            : FontStyle.normal,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.diamond, color: gold.withOpacity(0.3), size: 12),
                        const SizedBox(width: 6),
                        Text(
                          AppConfig.appName,
                          style: GoogleFonts.poppins(
                            color: gold.withOpacity(0.3),
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 2,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Icon(Icons.diamond, color: gold.withOpacity(0.3), size: 12),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Message input
          Container(
            decoration: BoxDecoration(
              color: const Color(AppConfig.cardBg),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: gold.withOpacity(0.1), width: 0.5),
            ),
            child: TextField(
              controller: _messageController,
              maxLines: 5,
              maxLength: 200,
              onChanged: (_) => setState(() {}),
              style: GoogleFonts.poppins(color: Colors.white, fontSize: 14, height: 1.5),
              decoration: InputDecoration(
                hintText: 'Write your personal message here...',
                hintStyle: GoogleFonts.poppins(color: Colors.white38, fontSize: 14),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.all(16),
                counterStyle: GoogleFonts.poppins(color: Colors.white38, fontSize: 11),
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Quick messages
          Text(
            'Quick Messages',
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.5),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              'Happy Birthday! 🎂',
              'With Love ❤️',
              'Congratulations! 🎉',
              'Thank You 💐',
              'Best Wishes ✨',
            ].map((msg) {
              return GestureDetector(
                onTap: () {
                  _messageController.text = msg;
                  setState(() {});
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(AppConfig.surfaceBg),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: gold.withOpacity(0.15), width: 0.5),
                  ),
                  child: Text(
                    msg,
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 11,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 32),
          // Navigation
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _prevStep,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: gold,
                    side: const BorderSide(color: gold, width: 1),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    'Back',
                    style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _nextStep,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: gold,
                    foregroundColor: const Color(AppConfig.darkBg),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: Text(
                    'Preview',
                    style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Step 4: Preview & Checkout
  // ════════════════════════════════════════════════════════════════
  Widget _buildPreviewStep() {
    const gold = Color(AppConfig.primaryGold);
    final provider = context.read<AppProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Preview Your Gift Box',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 20),

          // Gift box visual
          Center(
            child: AnimatedBuilder(
              animation: _boxAnimController,
              builder: (context, child) {
                final scale = 1.0 + 0.02 * _boxAnimController.value;
                return Transform.scale(scale: scale, child: child);
              },
              child: Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      gold.withOpacity(0.25),
                      gold.withOpacity(0.05),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: gold, width: 1.2),
                  boxShadow: [
                    BoxShadow(
                      color: gold.withOpacity(0.15),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.card_giftcard, color: gold, size: 44),
                    const SizedBox(height: 8),
                    Text(
                      '${_selectedBox?.label ?? ""} Box',
                      style: GoogleFonts.poppins(
                        color: gold,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Box details card
          _PreviewSection(
            title: 'Box Details',
            icon: Icons.inventory_2_outlined,
            children: [
              _PreviewRow(label: 'Box Size', value: _selectedBox?.label ?? '-'),
              _PreviewRow(label: 'Max Items', value: '${_selectedBox?.maxItems ?? 0}'),
              _PreviewRow(
                label: 'Box Price',
                value: provider.formatPrice(_boxPrice),
                valueColor: gold,
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Products
          _PreviewSection(
            title: 'Items (${_selectedProducts.length})',
            icon: Icons.shopping_bag_outlined,
            children: [
              ..._selectedProducts.map((product) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            width: 44,
                            height: 44,
                            child: Image.network(
                              product.images.isNotEmpty
                                  ? AppConfig.getImageUrl(product.images[0])
                                  : '',
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: const Color(AppConfig.surfaceBg),
                                child: Center(
                                  child: Icon(Icons.diamond, color: gold.withOpacity(0.4), size: 18),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            product.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        Text(
                          provider.formatPrice(product.price),
                          style: GoogleFonts.poppins(
                            color: Colors.white.withOpacity(0.7),
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  )),
              if (_selectedProducts.isNotEmpty)
                Container(
                  height: 0.5,
                  color: const Color(0xFF44403C),
                  margin: const EdgeInsets.only(bottom: 8),
                ),
              _PreviewRow(
                label: 'Products Total',
                value: provider.formatPrice(_productsTotal),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Message
          if (_messageController.text.isNotEmpty)
            _PreviewSection(
              title: 'Personal Message',
              icon: Icons.mail_outline,
              children: [
                Text(
                  _messageController.text,
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 13,
                    height: 1.5,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),

          if (_messageController.text.isNotEmpty) const SizedBox(height: 16),

          // Grand total
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: gold.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: gold.withOpacity(0.2), width: 0.5),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Grand Total',
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  provider.formatPrice(_grandTotal),
                  style: GoogleFonts.poppins(
                    color: gold,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _prevStep,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: gold,
                    side: const BorderSide(color: gold, width: 1),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    'Edit',
                    style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: _addToCart,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: gold,
                    foregroundColor: const Color(AppConfig.darkBg),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shopping_bag_outlined, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Add to Cart',
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
            ],
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Running Total Bar
  // ════════════════════════════════════════════════════════════════
  Widget _buildRunningTotal() {
    const gold = Color(AppConfig.primaryGold);
    final provider = context.read<AppProvider>();

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      decoration: BoxDecoration(
        color: const Color(AppConfig.cardBg),
        border: Border(
          top: BorderSide(color: gold.withOpacity(0.1), width: 0.5),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Running Total',
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 11,
                  ),
                ),
                Text(
                  provider.formatPrice(_grandTotal),
                  style: GoogleFonts.poppins(
                    color: gold,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            if (_currentStep == 0)
              ElevatedButton(
                onPressed: _selectedBoxIndex >= 0 ? _nextStep : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: gold,
                  foregroundColor: const Color(AppConfig.darkBg),
                  disabledBackgroundColor: gold.withOpacity(0.3),
                  disabledForegroundColor: const Color(AppConfig.darkBg).withOpacity(0.5),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
                child: Text(
                  'Next',
                  style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Builder Product Card
// ════════════════════════════════════════════════════════════════
class _BuilderProductCard extends StatelessWidget {
  final Product product;
  final bool isSelected;
  final bool canAdd;
  final VoidCallback onTap;
  final AppProvider provider;

  const _BuilderProductCard({
    required this.product,
    required this.isSelected,
    required this.canAdd,
    required this.onTap,
    required this.provider,
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
            color: isSelected ? gold : gold.withOpacity(0.08),
            width: isSelected ? 1.2 : 0.5,
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
                      product.images.isNotEmpty
                          ? AppConfig.getImageUrl(product.images[0])
                          : '',
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: const Color(AppConfig.surfaceBg),
                        child: Center(
                          child: Icon(Icons.diamond, color: gold.withOpacity(0.4), size: 28),
                        ),
                      ),
                    ),
                  ),
                  // Selected indicator
                  if (isSelected)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: gold,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.check,
                          color: Color(AppConfig.darkBg),
                          size: 14,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Details
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(10),
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
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          provider.formatPrice(product.price),
                          style: GoogleFonts.poppins(
                            color: gold,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Icon(
                          isSelected ? Icons.remove_circle_outline : Icons.add_circle_outline,
                          color: isSelected
                              ? Colors.redAccent
                              : canAdd
                                  ? gold
                                  : gold.withOpacity(0.3),
                          size: 20,
                        ),
                      ],
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

// ════════════════════════════════════════════════════════════════
// Preview Section
// ════════════════════════════════════════════════════════════════
class _PreviewSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _PreviewSection({
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(AppConfig.cardBg),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: gold.withOpacity(0.08), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: gold, size: 18),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Preview Row
// ════════════════════════════════════════════════════════════════
class _PreviewRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _PreviewRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.5),
              fontSize: 13,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.poppins(
              color: valueColor ?? Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
