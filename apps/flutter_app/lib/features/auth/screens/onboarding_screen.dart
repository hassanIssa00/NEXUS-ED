import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/routing/route_names.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> with SingleTickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  late AnimationController _floatController;
  late Animation<double> _floatAnim;

  final List<_OnboardingPage> _pages = const [
    _OnboardingPage(
      icon: '🎓',
      title: 'مرحباً بك في نِكْسُس',
      subtitle: 'منصة تعليمية سعودية متكاملة مدعومة بالذكاء الاصطناعي لصناعة أبطال المستقبل',
      gradient: [Color(0xFF020D08), Color(0xFF0A2A1F), Color(0xFF0D4A38)],
      accentColor: Color(0xFF10B981),
    ),
    _OnboardingPage(
      icon: '🤖',
      title: 'تعلم ذكي مع Nexus AI',
      subtitle: 'تحليلات أكاديمية متقدمة وتوصيات مخصصة بالذكاء الاصطناعي لتحسين أدائك',
      gradient: [Color(0xFF020818), Color(0xFF1E1B4B), Color(0xFF312E81)],
      accentColor: Color(0xFF818CF8),
    ),
    _OnboardingPage(
      icon: '🏆',
      title: 'تحفيز ومكافآت',
      subtitle: 'اكسب نقاط، تسلق المراتب، واحصل على شارات التميز في رحلتك التعليمية',
      gradient: [Color(0xFF0A0800), Color(0xFF422006), Color(0xFF78350F)],
      accentColor: Color(0xFFFBBF24),
    ),
    _OnboardingPage(
      icon: '🚀',
      title: 'ابدأ رحلتك الآن',
      subtitle: 'معاً نصنع المستقبل — رؤية السعودية 2030',
      gradient: [Color(0xFF020A1B), Color(0xFF052E16), Color(0xFF166534)],
      accentColor: Color(0xFF34D399),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(vsync: this, duration: const Duration(seconds: 3))..repeat(reverse: true);
    _floatAnim = Tween<double>(begin: -8, end: 8).animate(CurvedAnimation(parent: _floatController, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _pageController.dispose();
    _floatController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(duration: const Duration(milliseconds: 500), curve: Curves.easeOutCubic);
    } else {
      context.go(RouteNames.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    final page = _pages[_currentPage];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AnimatedContainer(
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeInOut,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: page.gradient,
            ),
          ),
          child: Stack(
            children: [
              // Page View
              PageView.builder(
                controller: _pageController,
                onPageChanged: (i) => setState(() => _currentPage = i),
                itemCount: _pages.length,
                itemBuilder: (context, index) => _buildPage(_pages[index]),
              ),

              // Top bar
              Positioned(
                top: MediaQuery.of(context).padding.top + 12,
                left: 20,
                right: 20,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Logo
                    Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            gradient: const LinearGradient(colors: [Color(0xFF0D9488), Color(0xFF10B981)]),
                          ),
                          child: const Center(child: Text('N', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white))),
                        ),
                        const SizedBox(width: 8),
                        Text('نِكْسُس', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white.withOpacity(0.9))),
                      ],
                    ),
                    // Skip
                    GestureDetector(
                      onTap: () => context.go(RouteNames.login),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text('تخطي', style: TextStyle(color: Colors.white54, fontSize: 13, fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ],
                ),
              ),

              // Bottom controls
              Positioned(
                bottom: 50,
                left: 0,
                right: 0,
                child: Column(
                  children: [
                    // Page indicators
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_pages.length, (i) {
                        final isActive = _currentPage == i;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 400),
                          curve: Curves.easeOutCubic,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          height: 5,
                          width: isActive ? 32 : 5,
                          decoration: BoxDecoration(
                            color: isActive ? page.accentColor : Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(3),
                            boxShadow: isActive ? [BoxShadow(color: page.accentColor.withOpacity(0.4), blurRadius: 8)] : null,
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 32),

                    // Button
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 28),
                      child: SizedBox(
                        width: double.infinity,
                        height: 58,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 400),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(18),
                            gradient: LinearGradient(colors: [page.accentColor, page.accentColor.withOpacity(0.8)]),
                            boxShadow: [BoxShadow(color: page.accentColor.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
                          ),
                          child: ElevatedButton(
                            onPressed: _nextPage,
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.transparent, shadowColor: Colors.transparent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(_currentPage == _pages.length - 1 ? 'ابدأ الآن' : 'التالي', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Colors.white)),
                                const SizedBox(width: 8),
                                Icon(_currentPage == _pages.length - 1 ? Icons.rocket_launch_rounded : Icons.arrow_back_rounded, color: Colors.white, size: 18),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPage(_OnboardingPage page) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 80),

            // Floating animated icon
            AnimatedBuilder(
              animation: _floatAnim,
              builder: (context, child) => Transform.translate(
                offset: Offset(0, _floatAnim.value),
                child: child,
              ),
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: page.accentColor.withOpacity(0.08),
                  border: Border.all(color: page.accentColor.withOpacity(0.15), width: 2),
                  boxShadow: [
                    BoxShadow(color: page.accentColor.withOpacity(0.15), blurRadius: 40, spreadRadius: 10),
                  ],
                ),
                child: Center(child: Text(page.icon, style: const TextStyle(fontSize: 68))),
              ),
            ),
            const SizedBox(height: 48),

            Text(
              page.title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: Colors.white, height: 1.25, letterSpacing: -0.5),
            ),
            const SizedBox(height: 18),

            Text(
              page.subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, color: Colors.white.withOpacity(0.45), height: 1.7),
            ),

            const SizedBox(height: 120),
          ],
        ),
      ),
    );
  }
}

class _OnboardingPage {
  final String icon, title, subtitle;
  final List<Color> gradient;
  final Color accentColor;

  const _OnboardingPage({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.gradient,
    required this.accentColor,
  });
}
