import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../providers/app_providers.dart';
import '../../services/api_service.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  final _formKey = GlobalKey<FormState>();

  // Shipping address controllers
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _address1Controller = TextEditingController();
  final _address2Controller = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _pincodeController = TextEditingController();

  // Promo code
  final _promoController = TextEditingController();
  String? _promoStatus;
  bool _promoApplied = false;
  double _promoDiscount = 0;

  // Payment method
  String _paymentMethod = 'cod';
  bool _isPlacing = false;

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
    _nameController.dispose();
    _phoneController.dispose();
    _address1Controller.dispose();
    _address2Controller.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    _promoController.dispose();
    super.dispose();
  }

  void _applyPromo() {
    final code = _promoController.text.trim().toUpperCase();
    if (code.isEmpty) return;

    // Simulated promo codes
    if (code == 'LUXURY10') {
      setState(() {
        _promoApplied = true;
        _promoDiscount = 0.10;
        _promoStatus = '10% discount applied!';
      });
    } else if (code == 'FIRST500') {
      setState(() {
        _promoApplied = true;
        _promoDiscount = 500;
        _promoStatus = '${provider.formatPrice(500)} off applied!';
      });
    } else {
      setState(() {
        _promoApplied = false;
        _promoDiscount = 0;
        _promoStatus = 'Invalid promo code';
      });
    }
  }

  AppProvider get provider => context.read<AppProvider>();

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);
    const cardBg = Color(AppConfig.cardBg);

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        backgroundColor: darkBg,
        elevation: 0,
        leading: Container(
          margin: const EdgeInsets.only(left: 8, top: 4, bottom: 4),
          decoration: BoxDecoration(
            color: cardBg.withOpacity(0.8),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: gold, size: 20),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        title: Text(
          'Checkout',
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: Consumer<AppProvider>(
        builder: (context, provider, _) {
          final subtotal = provider.cartTotal;
          final shipping = subtotal >= 5000 ? 0.0 : 149.0;
          double discount = 0;
          if (_promoApplied) {
            if (_promoDiscount < 1) {
              discount = subtotal * _promoDiscount;
            } else {
              discount = _promoDiscount;
            }
          }
          final total = subtotal + shipping - discount;

          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
            child: FadeTransition(
              opacity: _animController,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Section: Shipping Address ──
                  _sectionTitle('Shipping Address', Icons.local_shipping_outlined),
                  const SizedBox(height: 12),
                  _buildShippingForm(),
                  const SizedBox(height: 24),

                  // ── Section: Order Summary ──
                  _sectionTitle('Order Summary', Icons.receipt_long_outlined),
                  const SizedBox(height: 12),
                  _buildOrderSummary(provider),
                  const SizedBox(height: 24),

                  // ── Section: Promo Code ──
                  _sectionTitle('Promo Code', Icons.discount_outlined),
                  const SizedBox(height: 12),
                  _buildPromoCode(),
                  const SizedBox(height: 24),

                  // ── Section: Payment Method ──
                  _sectionTitle('Payment Method', Icons.payment_outlined),
                  const SizedBox(height: 12),
                  _buildPaymentMethod(),
                  const SizedBox(height: 24),

                  // ── Shipping Estimate ──
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(AppConfig.surfaceBg),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: gold.withOpacity(0.1),
                        width: 0.5,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.local_shipping, color: gold, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Estimated Delivery',
                                style: GoogleFonts.poppins(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                shipping == 0
                                    ? '3-5 business days (Free Shipping)'
                                    : '5-7 business days (Standard Shipping)',
                                style: GoogleFonts.poppins(
                                  color: Colors.white.withOpacity(0.5),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── Total Summary ──
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: gold.withOpacity(0.15),
                        width: 0.5,
                      ),
                    ),
                    child: Column(
                      children: [
                        _summaryRow('Subtotal', provider.formatPrice(subtotal)),
                        const SizedBox(height: 8),
                        _summaryRow(
                          'Shipping',
                          shipping == 0 ? 'FREE' : provider.formatPrice(shipping),
                          valueColor: shipping == 0 ? Colors.green.shade400 : null,
                        ),
                        if (_promoApplied && discount > 0) ...[
                          const SizedBox(height: 8),
                          _summaryRow(
                            'Discount',
                            '-${provider.formatPrice(discount)}',
                            valueColor: Colors.green.shade400,
                          ),
                        ],
                        const SizedBox(height: 12),
                        Container(height: 0.5, color: const Color(0xFF44403C)),
                        const SizedBox(height: 12),
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
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
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
        },
      ),

      // ── Place Order Button ──
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        decoration: BoxDecoration(
          color: cardBg,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Consumer<AppProvider>(
            builder: (context, provider, _) {
              return ElevatedButton(
                onPressed: provider.cartItems.isEmpty || _isPlacing
                    ? null
                    : () => _placeOrder(provider),
                style: ElevatedButton.styleFrom(
                  backgroundColor: gold,
                  disabledBackgroundColor: gold.withOpacity(0.3),
                  foregroundColor: darkBg,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: _isPlacing
                    ? SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: darkBg,
                          strokeWidth: 2,
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.lock_outline, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'Place Order',
                            style: GoogleFonts.poppins(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                      ),
              );
            },
          ),
        ),
      ),
    );
  }

  // ── Section Title ──
  Widget _sectionTitle(String title, IconData icon) {
    const gold = Color(AppConfig.primaryGold);
    return Row(
      children: [
        Icon(icon, color: gold, size: 18),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  // ── Shipping Form ──
  Widget _buildShippingForm() {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: gold.withOpacity(0.08),
          width: 0.5,
        ),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            _buildTextField(_nameController, 'Full Name', Icons.person_outline),
            const SizedBox(height: 12),
            _buildTextField(
              _phoneController,
              'Phone Number',
              Icons.phone_outlined,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            _buildTextField(_address1Controller, 'Address Line 1', Icons.home_outlined),
            const SizedBox(height: 12),
            _buildTextField(_address2Controller, 'Address Line 2', Icons.home_work_outlined, required: false),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildTextField(_cityController, 'City', Icons.location_city_outlined)),
                const SizedBox(width: 12),
                Expanded(child: _buildTextField(_stateController, 'State', Icons.map_outlined)),
              ],
            ),
            const SizedBox(height: 12),
            _buildTextField(
              _pincodeController,
              'Pincode',
              Icons.markunread_mailbox_outlined,
              keyboardType: TextInputType.number,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label,
    IconData icon, {
    TextInputType? keyboardType,
    bool required = true,
  }) {
    const gold = Color(AppConfig.primaryGold);

    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      style: GoogleFonts.poppins(
        color: Colors.white,
        fontSize: 14,
      ),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.poppins(
          color: Colors.white.withOpacity(0.4),
          fontSize: 13,
        ),
        prefixIcon: Icon(icon, color: gold.withOpacity(0.5), size: 20),
        filled: true,
        fillColor: const Color(AppConfig.surfaceBg),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: gold.withOpacity(0.5), width: 1),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
      validator: required
          ? (value) {
              if (value == null || value.trim().isEmpty) {
                return '$label is required';
              }
              return null;
            }
          : null,
    );
  }

  // ── Order Summary ──
  Widget _buildOrderSummary(AppProvider provider) {
    const gold = Color(AppConfig.primaryGold);
    const cardBg = Color(AppConfig.cardBg);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: gold.withOpacity(0.08),
          width: 0.5,
        ),
      ),
      child: Column(
        children: provider.cartItems.map((item) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              children: [
                // Item image
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: SizedBox(
                    width: 50,
                    height: 50,
                    child: Image.network(
                      item.image,
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
                const SizedBox(width: 12),
                // Item name and quantity
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
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
                // Price
                Text(
                  provider.formatPrice(item.price * item.quantity),
                  style: GoogleFonts.poppins(
                    color: gold,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Promo Code ──
  Widget _buildPromoCode() {
    const gold = Color(AppConfig.primaryGold);

    return Container(
      padding: const EdgeInsets.all(16),
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
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _promoController,
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 14,
                    letterSpacing: 1,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Enter promo code',
                    hintStyle: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.3),
                      fontSize: 13,
                    ),
                    filled: true,
                    fillColor: const Color(AppConfig.surfaceBg),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  onChanged: (_) {
                    if (_promoStatus != null) {
                      setState(() {
                        _promoStatus = null;
                        _promoApplied = false;
                        _promoDiscount = 0;
                      });
                    }
                  },
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton(
                onPressed: _applyPromo,
                style: ElevatedButton.styleFrom(
                  backgroundColor: gold,
                  foregroundColor: const Color(AppConfig.darkBg),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 0,
                ),
                child: Text(
                  'Apply',
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          if (_promoStatus != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  _promoApplied ? Icons.check_circle : Icons.error_outline,
                  color: _promoApplied ? Colors.green.shade400 : Colors.redAccent,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Text(
                  _promoStatus!,
                  style: GoogleFonts.poppins(
                    color: _promoApplied ? Colors.green.shade400 : Colors.redAccent,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ── Payment Method ──
  Widget _buildPaymentMethod() {
    const gold = Color(AppConfig.primaryGold);

    return Container(
      padding: const EdgeInsets.all(4),
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
          _paymentOption(
            value: 'cod',
            label: 'Cash on Delivery',
            subtitle: 'Pay when you receive your order',
            icon: Icons.money_outlined,
          ),
          Container(height: 0.5, color: const Color(0xFF44403C)),
          _paymentOption(
            value: 'card',
            label: 'Credit / Debit Card',
            subtitle: 'Visa, Mastercard, Rupay',
            icon: Icons.credit_card_outlined,
          ),
          Container(height: 0.5, color: const Color(0xFF44403C)),
          _paymentOption(
            value: 'upi',
            label: 'UPI',
            subtitle: 'Google Pay, PhonePe, Paytm',
            icon: Icons.account_balance_wallet_outlined,
          ),
        ],
      ),
    );
  }

  Widget _paymentOption({
    required String value,
    required String label,
    required String subtitle,
    required IconData icon,
  }) {
    const gold = Color(AppConfig.primaryGold);
    final isSelected = _paymentMethod == value;

    return InkWell(
      onTap: () => setState(() => _paymentMethod = value),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? gold.withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? gold : Colors.white.withOpacity(0.4),
              size: 22,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.poppins(
                      color: isSelected ? Colors.white : Colors.white.withOpacity(0.7),
                      fontSize: 14,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.35),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            Radio<String>(
              value: value,
              groupValue: _paymentMethod,
              onChanged: (val) => setState(() => _paymentMethod = val!),
              activeColor: gold,
              fillColor: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) return gold;
                return Colors.white.withOpacity(0.3);
              }),
            ),
          ],
        ),
      ),
    );
  }

  // ── Summary Row ──
  Widget _summaryRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            color: Colors.white.withOpacity(0.6),
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
    );
  }

  // ── Place Order ──
  Future<void> _placeOrder(AppProvider provider) async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(AppConfig.cardBg),
          content: const Text(
            'Please fill in all required fields',
            style: TextStyle(color: Colors.redAccent),
          ),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }

    setState(() => _isPlacing = true);

    try {
      final api = ApiService();
      await api.checkout({
        'name': _nameController.text,
        'phone': _phoneController.text,
        'address': _address1Controller.text,
        'address2': _address2Controller.text,
        'city': _cityController.text,
        'state': _stateController.text,
        'zipCode': _pincodeController.text,
        'items': provider.cartItems.map((item) => {
          'productId': item.productId,
          'quantity': item.quantity,
        }).toList(),
        'paymentMethod': _paymentMethod,
        'couponCode': _promoApplied ? _promoController.text : null,
      });

      provider.clearCart();

      if (!mounted) return;
      setState(() => _isPlacing = false);

      // Show success dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => _OrderSuccessDialog(),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isPlacing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(AppConfig.cardBg),
            content: Text(
              'Failed to place order: $e',
              style: const TextStyle(color: Colors.redAccent),
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════
// Order Success Dialog
// ════════════════════════════════════════════════════════════════
class _OrderSuccessDialog extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);

    return Dialog(
      backgroundColor: const Color(AppConfig.cardBg),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: Colors.green.shade700.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.check_circle,
                color: Colors.green.shade400,
                size: 48,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Order Placed!',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your luxury gift is on its way.\nYou will receive a confirmation shortly.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                color: Colors.white.withOpacity(0.5),
                fontSize: 13,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop(); // close dialog
                  Navigator.of(context).pop(); // go back to cart
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: gold,
                  foregroundColor: const Color(AppConfig.darkBg),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: Text(
                  'Continue Shopping',
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
    );
  }
}
