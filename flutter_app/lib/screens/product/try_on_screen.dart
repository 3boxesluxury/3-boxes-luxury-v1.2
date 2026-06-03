import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../services/api_service.dart';

enum TryOnStep { upload, preview, generating, result }

class TryOnScreen extends StatefulWidget {
  final Product product;

  const TryOnScreen({super.key, required this.product});

  @override
  State<TryOnScreen> createState() => _TryOnScreenState();
}

class _TryOnScreenState extends State<TryOnScreen> {
  TryOnStep _step = TryOnStep.upload;
  String? _selfieBase64;
  Uint8List? _selfieBytes;
  String? _resultImageUrl;
  String? _error;
  String _progress = '';
  String? _jobId;
  bool _isPolling = false;
  String? _productImageBase64; // Cached product image base64

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    // Pre-fetch product image as base64 (avoids server-side fetch failures)
    _preloadProductImageBase64();
  }

  @override
  void dispose() {
    _isPolling = false;
    super.dispose();
  }

  /// Pre-fetch the product image and convert to base64 so we can send it
  /// with the try-on request. This avoids server-side fetch failures
  /// (e.g., CORS, timeout, or image URL issues on Vercel).
  Future<void> _preloadProductImageBase64() async {
    if (widget.product.images.isEmpty) return;
    try {
      final imageUrl = AppConfig.getImageUrl(widget.product.images[0]);
      final uri = Uri.parse(imageUrl);
      final response = await http.get(uri).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200 && response.bodyBytes.isNotEmpty) {
        final contentType = response.headers['content-type'] ?? 'image/jpeg';
        final mimeType = contentType.split(';').first.trim();
        final base64Str = base64Encode(response.bodyBytes);
        if (mounted) {
          setState(() {
            _productImageBase64 = 'data:$mimeType;base64,$base64Str';
          });
        }
        debugPrint('[try-on] Product image base64 cached, length: ${base64Str.length}');
      } else {
        debugPrint('[try-on] Failed to preload product image: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[try-on] Product image preload failed: $e');
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );

      if (image == null) return;

      final bytes = await image.readAsBytes();
      final base64Str = base64Encode(bytes);
      final mimeType = image.mimeType ?? 'image/jpeg';
      final dataUrl = 'data:$mimeType;base64,$base64Str';

      // Estimate size — reject if too large (>4MB base64)
      if (base64Str.length > 4 * 1024 * 1024) {
        setState(() => _error = 'Image is too large. Please try a smaller photo.');
        return;
      }

      setState(() {
        _selfieBytes = bytes;
        _selfieBase64 = dataUrl;
        _step = TryOnStep.preview;
        _error = null;
      });
    } catch (e) {
      setState(() => _error = 'Failed to pick image. Please try again.');
    }
  }

  Future<void> _generateTryOn() async {
    if (_selfieBase64 == null) return;

    setState(() {
      _step = TryOnStep.generating;
      _error = null;
      _progress = 'Uploading your photo...';
    });

    try {
      final product = widget.product;
      final productImageUrl = product.images.isNotEmpty
          ? AppConfig.getImageUrl(product.images[0])
          : '';

      // ── Strategy 1: Try the Vercel API endpoint ──
      final result = await ApiService().startTryOn(
        productId: product.id,
        selfieData: _selfieBase64!,
        productImageUrl: productImageUrl,
        productName: product.name,
        categorySlug: product.categorySlug,
        productImageBase64: _productImageBase64,
      );

      // Check for canvas mode (AI unavailable on server)
      if (result['mode'] == 'canvas' || result['code'] == 'AI_CANVAS_MODE') {
        debugPrint('[try-on] Server returned canvas mode, trying direct proxy...');

        // ── Strategy 2: Try direct client-side proxy to sandbox AI service ──
        final proxyResult = await _tryDirectProxy(productImageUrl);
        if (proxyResult != null) {
          return; // Proxy handled it
        }

        // ── Strategy 3: All strategies failed ──
        setState(() {
          _error = 'AI service is currently unavailable. Please try again later or use the web version at 3boxesluxury.com';
          _step = TryOnStep.preview;
        });
        return;
      }

      final jobId = result['jobId'];
      if (jobId == null) {
        // Direct imageUrl returned
        if (result['imageUrl'] != null) {
          setState(() {
            _resultImageUrl = result['imageUrl'];
            _step = TryOnStep.result;
          });
        } else {
          setState(() {
            _error = result['error'] ?? 'Unexpected response from server.';
            _step = TryOnStep.preview;
          });
        }
        return;
      }

      // Poll for job completion
      _jobId = jobId;
      _isPolling = true;
      _pollJob(jobId, null);
    } catch (e) {
      debugPrint('[try-on] Generation failed: $e');

      // Try direct proxy as fallback
      final productImageUrl = widget.product.images.isNotEmpty
          ? AppConfig.getImageUrl(widget.product.images[0])
          : '';
      final proxyResult = await _tryDirectProxy(productImageUrl);
      if (proxyResult != null) {
        return;
      }

      setState(() {
        _error = e is ApiException
            ? 'Server error (${e.statusCode}). Please try again.'
            : 'Failed to connect to server. Please check your internet connection.';
        _step = TryOnStep.preview;
      });
    }
  }

  /// Try direct client-side proxy to the sandbox AI service.
  /// This mirrors the web version's client-side proxy fallback.
  Future<bool?> _tryDirectProxy(String productImageUrl) async {
    String? proxyUrl;

    // Get proxy URL from config API
    try {
      final configUri = Uri.parse('${AppConfig.effectiveBaseUrl}/api/config');
      final configRes = await http.get(configUri).timeout(const Duration(seconds: 5));
      if (configRes.statusCode == 200) {
        final configData = json.decode(configRes.body);
        proxyUrl = configData['aiProxyUrl'] ?? '';
      }
    } catch (e) {
      debugPrint('[try-on] Config API failed: $e');
    }

    // Also try NEXT_PUBLIC_AI_PROXY_URL equivalent (hardcoded fallback)
    if (proxyUrl == null || proxyUrl.isEmpty) {
      proxyUrl = AppConfig.aiProxyUrl;
    }

    if (proxyUrl.isEmpty) {
      debugPrint('[try-on] No proxy URL available for direct proxy fallback');
      return null;
    }

    try {
      setState(() => _progress = 'Connecting to AI service directly...');

      final proxyUri = Uri.parse('$proxyUrl/api/try-on');
      final proxyBody = {
        'productId': widget.product.id,
        'selfieData': _selfieBase64,
        'productImageUrl': productImageUrl,
        'productName': widget.product.name,
        'categorySlug': widget.product.categorySlug,
        if (_productImageBase64 != null) 'productImageBase64': _productImageBase64,
      };

      // Add Abc header if the proxy is on space-z.ai
      final headers = <String, String>{'Content-Type': 'application/json'};
      try {
        final hostname = Uri.parse(proxyUrl).host;
        if (hostname.contains('.space-z.ai')) {
          headers['Abc'] = hostname.split('.').first;
        }
      } catch {}

      final proxyResponse = await http.post(
        proxyUri,
        headers: headers,
        body: json.encode(proxyBody),
      ).timeout(const Duration(seconds: 90));

      if (proxyResponse.statusCode == 200) {
        final proxyData = json.decode(proxyResponse.body);
        final proxyJobId = proxyData['jobId'] as String?;
        if (proxyJobId != null) {
          // Poll the proxy for results
          _isPolling = true;
          _pollJob(proxyJobId, proxyUrl);
          return true;
        }
        final imageUrl = proxyData['imageUrl'] as String?;
        if (imageUrl != null) {
          setState(() {
            _resultImageUrl = imageUrl;
            _step = TryOnStep.result;
          });
          return true;
        }
      }

      debugPrint('[try-on] Direct proxy returned: ${proxyResponse.statusCode}');
    } catch (e) {
      debugPrint('[try-on] Direct proxy failed: $e');
    }

    return null;
  }

  Future<void> _pollJob(String jobId, String? proxyBaseUrl) async {
    int attempts = 0;
    const maxAttempts = 40; // 2 minutes at 3s intervals

    while (_isPolling && attempts < maxAttempts) {
      await Future.delayed(const Duration(seconds: 3));
      if (!_isPolling) return;

      attempts++;
      try {
        final status = await ApiService().pollTryOnJob(jobId, proxyBaseUrl: proxyBaseUrl);

        if (status['progress'] != null) {
          setState(() => _progress = status['progress']);
        }

        if (status['status'] == 'completed') {
          _isPolling = false;
          final imageUrl = status['imageUrl'] as String?;
          if (imageUrl != null && imageUrl.isNotEmpty) {
            setState(() {
              _resultImageUrl = imageUrl;
              _step = TryOnStep.result;
            });
          } else {
            setState(() {
              _error = 'AI generation was not successful. Please try again.';
              _step = TryOnStep.preview;
            });
          }
          return;
        }

        if (status['status'] == 'failed') {
          _isPolling = false;
          setState(() {
            _error = status['error'] ?? 'Generation failed. Please try again.';
            _step = TryOnStep.preview;
          });
          return;
        }
      } catch (e) {
        // Continue polling on transient errors
        debugPrint('Poll error: $e');
      }
    }

    if (_isPolling) {
      _isPolling = false;
      setState(() {
        _error = 'Request timed out. The AI service may be busy — please try again.';
        _step = TryOnStep.preview;
      });
    }
  }

  void _reset() {
    _isPolling = false;
    setState(() {
      _step = TryOnStep.upload;
      _selfieBase64 = null;
      _selfieBytes = null;
      _resultImageUrl = null;
      _error = null;
      _progress = '';
      _jobId = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);
    const cardBg = Color(AppConfig.cardBg);

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Container(
          margin: const EdgeInsets.only(left: 8, top: 4, bottom: 4),
          decoration: BoxDecoration(
            color: cardBg.withOpacity(0.8),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: gold, size: 20),
            onPressed: () {
              _isPolling = false;
              Navigator.of(context).pop();
            },
          ),
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.auto_awesome, color: gold, size: 20),
            const SizedBox(width: 8),
            Text(
              'AI Virtual Try-On',
              style: GoogleFonts.poppins(
                color: gold,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Product preview card
            _buildProductPreview(gold, cardBg),
            const SizedBox(height: 24),

            // Step content
            switch (_step) {
              TryOnStep.upload => _buildUploadStep(gold, cardBg),
              TryOnStep.preview => _buildPreviewStep(gold, cardBg),
              TryOnStep.generating => _buildGeneratingStep(gold),
              TryOnStep.result => _buildResultStep(gold, cardBg),
            },
          ],
        ),
      ),
    );
  }

  Widget _buildProductPreview(Color gold, Color cardBg) {
    final product = widget.product;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardBg.withOpacity(0.6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: gold.withOpacity(0.2), width: 0.5),
      ),
      child: Row(
        children: [
          // Product thumbnail
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              color: const Color(AppConfig.surfaceBg),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: product.images.isNotEmpty
                  ? Image.network(
                      AppConfig.getImageUrl(product.images[0]),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Icon(Icons.diamond, color: gold.withOpacity(0.4), size: 28),
                    )
                  : Icon(Icons.diamond, color: gold.withOpacity(0.4), size: 28),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'Selected for try-on',
                  style: GoogleFonts.poppins(
                    color: gold.withOpacity(0.4),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: gold.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              product.category.toUpperCase(),
              style: GoogleFonts.poppins(
                color: gold,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadStep(Color gold, Color cardBg) {
    return Column(
      children: [
        // Upload area
        GestureDetector(
          onTap: () => _showImageSourceDialog(gold),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
            decoration: BoxDecoration(
              color: cardBg.withOpacity(0.3),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: gold.withOpacity(0.2), width: 1.5, strokeAlign: BorderSide.strokeAlignOutside),
            ),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: gold.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.camera_alt, color: gold.withOpacity(0.6), size: 40),
                ),
                const SizedBox(height: 16),
                Text(
                  'Upload Your Selfie',
                  style: GoogleFonts.poppins(
                    color: gold.withOpacity(0.7),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Tap to take a photo or choose from gallery',
                  style: GoogleFonts.poppins(
                    color: gold.withOpacity(0.3),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'JPG, PNG, or WebP · Max 4MB',
                  style: GoogleFonts.poppins(
                    color: gold.withOpacity(0.2),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ),

        if (_error != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade900.withOpacity(0.2),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.red.shade900.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.red.shade300, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _error!,
                    style: GoogleFonts.poppins(color: Colors.red.shade300, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 16),
        Text(
          'Your photo is processed securely and not stored permanently',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(color: gold.withOpacity(0.2), fontSize: 11),
        ),
      ],
    );
  }

  void _showImageSourceDialog(Color gold) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(AppConfig.cardBg),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Choose Photo Source',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _pickImage(ImageSource.camera);
                      },
                      icon: const Icon(Icons.camera_alt, size: 20),
                      label: const Text('Camera'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: gold,
                        foregroundColor: const Color(AppConfig.darkBg),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _pickImage(ImageSource.gallery);
                      },
                      icon: const Icon(Icons.photo_library, size: 20),
                      label: const Text('Gallery'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(AppConfig.surfaceBg),
                        foregroundColor: gold,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: gold.withOpacity(0.3)),
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
    );
  }

  Widget _buildPreviewStep(Color gold, Color cardBg) {
    return Column(
      children: [
        // Selfie preview + product
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Selfie
            Expanded(
              child: Stack(
                children: [
                  Container(
                    height: 280,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: gold.withOpacity(0.2)),
                      color: const Color(AppConfig.surfaceBg),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: _selfieBytes != null
                          ? Image.memory(_selfieBytes!, fit: BoxFit.cover, width: double.infinity, height: 280)
                          : const SizedBox.shrink(),
                    ),
                  ),
                  // Remove button
                  Positioned(
                    right: 8,
                    top: 8,
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selfieBytes = null;
                          _selfieBase64 = null;
                          _step = TryOnStep.upload;
                          _error = null;
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.close, color: Colors.red.shade300, size: 18),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            // Arrow + product
            Column(
              children: [
                const SizedBox(height: 40),
                Icon(Icons.auto_awesome, color: gold.withOpacity(0.4), size: 24),
                const SizedBox(height: 8),
                Text('+', style: TextStyle(color: gold.withOpacity(0.3), fontSize: 16)),
                const SizedBox(height: 8),
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: gold.withOpacity(0.2)),
                    color: const Color(AppConfig.surfaceBg),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: widget.product.images.isNotEmpty
                        ? Image.network(
                            AppConfig.getImageUrl(widget.product.images[0]),
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Icon(Icons.diamond, color: gold.withOpacity(0.4)),
                          )
                        : Icon(Icons.diamond, color: gold.withOpacity(0.4)),
                  ),
                ),
                const SizedBox(height: 8),
                Text('=', style: TextStyle(color: gold.withOpacity(0.3), fontSize: 16)),
                const SizedBox(height: 8),
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: gold.withOpacity(0.2)),
                    color: const Color(AppConfig.surfaceBg),
                  ),
                  child: Icon(Icons.auto_awesome, color: gold.withOpacity(0.3), size: 28),
                ),
              ],
            ),
          ],
        ),

        if (_error != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade900.withOpacity(0.2),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.red.shade900.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.red.shade300, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _error!,
                    style: GoogleFonts.poppins(color: Colors.red.shade300, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 24),

        // Action buttons
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _selfieBase64 = null;
                    _selfieBytes = null;
                    _step = TryOnStep.upload;
                    _error = null;
                  });
                },
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retake'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: gold.withOpacity(0.6),
                  side: BorderSide(color: gold.withOpacity(0.3)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: _generateTryOn,
                icon: const Icon(Icons.auto_awesome, size: 18),
                label: const Text('Generate Try-On'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: gold,
                  foregroundColor: const Color(AppConfig.darkBg),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildGeneratingStep(Color gold) {
    return Column(
      children: [
        const SizedBox(height: 40),
        // Animated sparkle
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: gold.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.auto_awesome, color: gold, size: 48),
        ),
        const SizedBox(height: 24),
        Text(
          'Creating Your Look',
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _progress.isNotEmpty ? _progress : 'Our AI is analyzing your photo and generating a virtual try-on.',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: gold.withOpacity(0.4),
            fontSize: 14,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'This may take 30–60 seconds...',
          style: GoogleFonts.poppins(
            color: gold.withOpacity(0.25),
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 24),
        // Loading indicator
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: gold.withOpacity(0.6),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              _progress.isNotEmpty ? _progress : 'Processing with AI...',
              style: GoogleFonts.poppins(
                color: gold.withOpacity(0.3),
                fontSize: 12,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildResultStep(Color gold, Color cardBg) {
    final isBase64 = _resultImageUrl?.startsWith('data:image/') ?? false;

    return Column(
      children: [
        // Result image
        Container(
          constraints: const BoxConstraints(maxHeight: 400),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: gold.withOpacity(0.3), width: 1.5),
            color: const Color(AppConfig.surfaceBg),
          ),
          child: Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: isBase64
                    ? _buildBase64Image(_resultImageUrl!)
                    : (_resultImageUrl != null
                        ? Image.network(
                            _resultImageUrl!,
                            fit: BoxFit.contain,
                            loadingBuilder: (context, child, progress) {
                              if (progress == null) return child;
                              return Container(
                                height: 300,
                                child: Center(
                                  child: CircularProgressIndicator(color: gold, strokeWidth: 2),
                                ),
                              );
                            },
                            errorBuilder: (_, __, ___) => _buildErrorPlaceholder(gold),
                          )
                        : _buildErrorPlaceholder(gold)),
              ),
              // Style Preview badge
              Positioned(
                left: 12,
                top: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.green.shade700.withOpacity(0.9),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(color: Colors.black26, blurRadius: 8),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle, color: Colors.white, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        'Style Preview',
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontSize: 11,
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

        const SizedBox(height: 12),
        Text(
          'This is an AI-generated visualization. Actual appearance may vary.',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(color: gold.withOpacity(0.3), fontSize: 11),
        ),

        const SizedBox(height: 20),

        // Action buttons
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _reset,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Try Again'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: gold.withOpacity(0.6),
                  side: BorderSide(color: gold.withOpacity(0.3)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: () {
                  // Navigate back to product
                  Navigator.of(context).pop();
                },
                icon: const Icon(Icons.check, size: 18),
                label: const Text('Done'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: gold,
                  foregroundColor: const Color(AppConfig.darkBg),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildBase64Image(String dataUrl) {
    try {
      // Extract base64 data from data URL
      final base64Str = dataUrl.split(',').last;
      final bytes = base64Decode(base64Str);
      return Image.memory(
        bytes,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => _buildErrorPlaceholder(const Color(AppConfig.primaryGold)),
      );
    } catch (e) {
      return _buildErrorPlaceholder(const Color(AppConfig.primaryGold));
    }
  }

  Widget _buildErrorPlaceholder(Color gold) {
    return Container(
      height: 300,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.image_not_supported, color: gold.withOpacity(0.3), size: 48),
            const SizedBox(height: 12),
            Text(
              'Could not load image',
              style: GoogleFonts.poppins(color: gold.withOpacity(0.3), fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}
