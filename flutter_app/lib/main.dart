import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:badges/badges.dart' as badges;

import 'config/app_config.dart';
import 'providers/app_providers.dart';
import 'screens/home/home_screen.dart';
import 'screens/home/category_screen.dart';
import 'screens/cart/cart_screen.dart';
import 'screens/wishlist/wishlist_screen.dart';
import 'screens/dashboard/user_dashboard.dart';
import 'screens/auth/auth_screen.dart';
import 'screens/product/product_detail_screen.dart';
import 'screens/checkout/checkout_screen.dart';
import 'screens/orders/orders_screen.dart';
import 'screens/gift/gift_assistant_screen.dart';
import 'screens/gift/gift_builder_screen.dart';
import 'screens/admin/admin_dashboard_screen.dart';
import 'screens/dashboard/corporate_dashboard_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Color(AppConfig.darkBg),
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(AppConfig.darkBg),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const ThreeBoxesLuxuryApp());
}

class ThreeBoxesLuxuryApp extends StatelessWidget {
  const ThreeBoxesLuxuryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppProvider()..initialize(),
      child: MaterialApp(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: _buildDarkTheme(),
        home: const MainNavigation(),
        routes: {
          '/auth': (context) => const AuthScreen(),
          '/product-detail': (context) => const ProductDetailScreen(),
          '/checkout': (context) => const CheckoutScreen(),
          '/orders': (context) => const OrdersScreen(),
          '/gift-assistant': (context) => const GiftAssistantScreen(),
          '/gift-builder': (context) => const GiftBuilderScreen(),
          '/admin': (context) => const AdminDashboardScreen(),
          '/corporate': (context) => const CorporateDashboardScreen(),
        },
      ),
    );
  }

  ThemeData _buildDarkTheme() {
    const gold = Color(AppConfig.primaryGold);
    const darkBg = Color(AppConfig.darkBg);
    const cardBg = Color(AppConfig.cardBg);

    final textTheme = GoogleFonts.poppinsTextTheme().apply(
      bodyColor: Colors.white,
      displayColor: Colors.white,
    );

    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: gold,
      scaffoldBackgroundColor: darkBg,
      colorScheme: const ColorScheme.dark(
        primary: gold,
        secondary: gold,
        surface: cardBg,
        error: Colors.redAccent,
        onPrimary: darkBg,
        onSecondary: darkBg,
        onSurface: Colors.white,
      ),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: darkBg,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: gold),
        titleTextStyle: GoogleFonts.poppins(
          color: gold,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: cardBg,
        selectedItemColor: gold,
        unselectedItemColor: Color(0xFF78716C),
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 10),
      ),
      cardTheme: CardThemeData(
        color: cardBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: gold,
          foregroundColor: darkBg,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      iconTheme: const IconThemeData(color: gold),
      dividerTheme: const DividerThemeData(
        color: Color(0xFF44403C),
        thickness: 0.5,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }
}

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();

    // Sync tab index with provider (e.g., when child screens call setTab)
    if (provider.currentTab != _currentIndex) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _currentIndex = provider.currentTab);
      });
    }

    final List<Widget> screens = [
      const HomeScreen(),
      const CategoryScreen(),
      const CartScreen(),
      const WishlistScreen(),
      provider.isLoggedIn ? const UserDashboard() : const AuthScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(AppConfig.cardBg),
          border: Border(
            top: BorderSide(
              color: const Color(AppConfig.primaryGold).withOpacity(0.15),
              width: 0.5,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 12,
              offset: const Offset(0, -2),
            ),
            BoxShadow(
              color: const Color(AppConfig.primaryGold).withOpacity(0.08),
              blurRadius: 8,
              offset: const Offset(0, -1),
            ),
          ],
        ),
        child: SafeArea(
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) {
              setState(() => _currentIndex = index);
              provider.setTab(index);
            },
            items: [
              const BottomNavigationBarItem(
                icon: Icon(Icons.home_outlined),
                activeIcon: Icon(Icons.home),
                label: 'Home',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.category_outlined),
                activeIcon: Icon(Icons.category),
                label: 'Categories',
              ),
              BottomNavigationBarItem(
                icon: badges.Badge(
                  showBadge: provider.cartCount > 0,
                  badgeContent: Text(
                    '${provider.cartCount}',
                    style: const TextStyle(color: Colors.white, fontSize: 10),
                  ),
                  badgeStyle: const badges.BadgeStyle(
                    badgeColor: Color(AppConfig.primaryGold),
                    padding: EdgeInsets.all(4),
                  ),
                  child: const Icon(Icons.shopping_cart_outlined),
                ),
                activeIcon: badges.Badge(
                  showBadge: provider.cartCount > 0,
                  badgeContent: Text(
                    '${provider.cartCount}',
                    style: const TextStyle(
                      color: Color(AppConfig.darkBg),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  badgeStyle: const badges.BadgeStyle(
                    badgeColor: Color(AppConfig.primaryGold),
                    padding: EdgeInsets.all(4),
                  ),
                  child: const Icon(Icons.shopping_cart),
                ),
                label: 'Cart',
              ),
              BottomNavigationBarItem(
                icon: badges.Badge(
                  showBadge: provider.wishlistIds.isNotEmpty,
                  badgeContent: Text(
                    '${provider.wishlistIds.length}',
                    style: const TextStyle(color: Colors.white, fontSize: 10),
                  ),
                  badgeStyle: const badges.BadgeStyle(
                    badgeColor: Colors.redAccent,
                    padding: EdgeInsets.all(4),
                  ),
                  child: const Icon(Icons.favorite_outline),
                ),
                activeIcon: badges.Badge(
                  showBadge: provider.wishlistIds.isNotEmpty,
                  badgeContent: Text(
                    '${provider.wishlistIds.length}',
                    style: const TextStyle(color: Colors.white, fontSize: 10),
                  ),
                  badgeStyle: const badges.BadgeStyle(
                    badgeColor: Colors.redAccent,
                    padding: EdgeInsets.all(4),
                  ),
                  child: const Icon(Icons.favorite),
                ),
                label: 'Wishlist',
              ),
              BottomNavigationBarItem(
                icon: Icon(provider.isLoggedIn ? Icons.person_outline : Icons.login_outlined),
                activeIcon: Icon(provider.isLoggedIn ? Icons.person : Icons.login),
                label: provider.isLoggedIn ? 'Profile' : 'Sign In',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
