import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/routing/route_names.dart';
import '../providers/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> with TickerProviderStateMixin {
  late AnimationController _particleController;
  late AnimationController _logoController;
  late AnimationController _textController;
  late AnimationController _pulseController;
  late AnimationController _ringController;

  late Animation<double> _logoScale;
  late Animation<double> _logoRotate;
  late Animation<double> _textFade;
  late Animation<Offset> _textSlide;
  late Animation<double> _pulseAnim;
  late Animation<double> _ringExpand;

  final List<_Particle> _particles = [];
  final _random = Random();
  bool _didNavigate = false;

  @override
  void initState() {
    super.initState();

    // Generate particles
    for (int i = 0; i < 50; i++) {
      _particles.add(_Particle(
        x: _random.nextDouble(),
        y: _random.nextDouble(),
        size: _random.nextDouble() * 3 + 1,
        speed: _random.nextDouble() * 0.3 + 0.1,
        opacity: _random.nextDouble() * 0.4 + 0.1,
      ));
    }

    // Particle animation
    _particleController = AnimationController(vsync: this, duration: const Duration(seconds: 10))
      ..repeat();

    // Logo entrance
    _logoController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
    _logoScale = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _logoController, curve: const Interval(0.0, 0.6, curve: Curves.elasticOut)),
    );
    _logoRotate = Tween<double>(begin: -0.1, end: 0.0).animate(
      CurvedAnimation(parent: _logoController, curve: const Interval(0.0, 0.5, curve: Curves.easeOut)),
    );

    // Ring expansion
    _ringController = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000));
    _ringExpand = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _ringController, curve: Curves.easeOut),
    );

    // Pulse glow
    _pulseController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))
      ..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Text entrance
    _textController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _textFade = CurvedAnimation(parent: _textController, curve: Curves.easeIn);
    _textSlide = Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero).animate(
      CurvedAnimation(parent: _textController, curve: Curves.easeOutCubic),
    );

    // Sequence animations
    _logoController.forward();
    Future.delayed(const Duration(milliseconds: 400), () => _ringController.forward());
    Future.delayed(const Duration(milliseconds: 700), () => _textController.forward());

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _routeFor(ref.read(authProvider));
    });
  }

  void _routeFor(AuthState state) {
    if (_didNavigate || !mounted) return;
    if (state.status == AuthStatus.initial || state.status == AuthStatus.loading) return;

    final destination = switch (state.status) {
      AuthStatus.authenticated => switch (state.user?.role) {
          'student' => RouteNames.studentDashboard,
          'parent' => RouteNames.parentDashboard,
          'teacher' => RouteNames.teacherDashboard,
          'admin' || 'administrator' || 'principal' || 'vice_principal' => RouteNames.adminDashboard,
          _ => RouteNames.login,
        },
      AuthStatus.unauthenticated => RouteNames.onboarding,
      AuthStatus.error => RouteNames.login,
      AuthStatus.initial || AuthStatus.loading => null,
    };
    if (destination == null) return;
    _didNavigate = true;
    context.go(destination);
  }

  @override
  void dispose() {
    _particleController.dispose();
    _logoController.dispose();
    _textController.dispose();
    _pulseController.dispose();
    _ringController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authProvider, (previous, next) => _routeFor(next));
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF020A1B), Color(0xFF071428), Color(0xFF0A1F1A), Color(0xFF020D08)],
            stops: [0.0, 0.35, 0.65, 1.0],
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Floating particles
            AnimatedBuilder(
              animation: _particleController,
              builder: (context, _) => CustomPaint(
                size: size,
                painter: _ParticlePainter(_particles, _particleController.value),
              ),
            ),

            // Central glow
            AnimatedBuilder(
              animation: _pulseAnim,
              builder: (context, _) => Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF10B981).withOpacity(0.08 * _pulseAnim.value),
                      const Color(0xFF0D9488).withOpacity(0.03 * _pulseAnim.value),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.5, 1.0],
                  ),
                ),
              ),
            ),

            // Expanding ring
            AnimatedBuilder(
              animation: _ringExpand,
              builder: (context, _) => Container(
                width: 200 + (_ringExpand.value * 200),
                height: 200 + (_ringExpand.value * 200),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: const Color(0xFF10B981).withOpacity(0.15 * (1 - _ringExpand.value)),
                    width: 1.5,
                  ),
                ),
              ),
            ),

            // Main content
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(flex: 3),

                // Logo
                AnimatedBuilder(
                  animation: _logoController,
                  builder: (context, child) => Transform.rotate(
                    angle: _logoRotate.value,
                    child: Transform.scale(
                      scale: _logoScale.value,
                      child: child,
                    ),
                  ),
                  child: AnimatedBuilder(
                    animation: _pulseAnim,
                    builder: (context, child) => Container(
                      width: 130,
                      height: 130,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(34),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(34),
                        child: Container(
                          color: Colors.white,
                          child: Image.asset('assets/images/logo.jpeg', fit: BoxFit.cover),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 40),

                // Text content with slide animation
                SlideTransition(
                  position: _textSlide,
                  child: FadeTransition(
                    opacity: _textFade,
                    child: Column(
                      children: [
                        // Arabic name
                        const Text(
                          'نكسس',
                          style: TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: 2,
                            height: 1,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // English name with gradient
                        ShaderMask(
                          shaderCallback: (bounds) => const LinearGradient(
                            colors: [Color(0xFF10B981), Color(0xFF06B6D4), Color(0xFF10B981)],
                          ).createShader(bounds),
                          child: const Text(
                            'NEXUS EDU',
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 10),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Divider
                        Container(
                          width: 40,
                          height: 2,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(1),
                            gradient: const LinearGradient(
                              colors: [Colors.transparent, Color(0xFF10B981), Colors.transparent],
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        Text(
                          'منصة تعليمية سعودية متكاملة',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: Colors.white.withOpacity(0.4)),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withOpacity(0.12),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text('🤖', style: TextStyle(fontSize: 12)),
                                  SizedBox(width: 4),
                                  Text('AI Powered', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF10B981), letterSpacing: 1)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 56),

                // Custom loading indicator
                FadeTransition(
                  opacity: _textFade,
                  child: _LoadingDots(),
                ),

                const Spacer(flex: 2),

                // Credits
                FadeTransition(
                  opacity: _textFade,
                  child: Column(
                    children: [
                      Container(
                        width: 50, height: 1,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [Colors.transparent, Colors.white.withOpacity(0.15), Colors.transparent]),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text('Developed by', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Colors.white.withOpacity(0.2), letterSpacing: 3)),
                      const SizedBox(height: 4),
                      const Text('Hassan Issa', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white70, letterSpacing: 1)),
                      const SizedBox(height: 12),
                      Text('شكر خاص', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Colors.white.withOpacity(0.2))),
                      const SizedBox(height: 4),
                      ShaderMask(
                        shaderCallback: (bounds) => const LinearGradient(
                          colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
                        ).createShader(bounds),
                        child: const Text('د. إسماعيل عيسى', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                      ),
                      const SizedBox(height: 28),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ═════════════════════════════════════════════
// PARTICLE SYSTEM
// ═════════════════════════════════════════════
class _Particle {
  double x, y, size, speed, opacity;
  _Particle({required this.x, required this.y, required this.size, required this.speed, required this.opacity});
}

class _ParticlePainter extends CustomPainter {
  final List<_Particle> particles;
  final double progress;

  _ParticlePainter(this.particles, this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in particles) {
      final y = ((p.y + progress * p.speed) % 1.0) * size.height;
      final x = p.x * size.width + sin(progress * 2 * pi * p.speed) * 20;
      final paint = Paint()
        ..color = const Color(0xFF10B981).withOpacity(p.opacity * 0.6)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);
      canvas.drawCircle(Offset(x, y), p.size, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ParticlePainter oldDelegate) => true;
}

// ═════════════════════════════════════════════
// ANIMATED LOADING DOTS
// ═════════════════════════════════════════════
class _LoadingDots extends StatefulWidget {
  @override
  State<_LoadingDots> createState() => _LoadingDotsState();
}

class _LoadingDotsState extends State<_LoadingDots> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (i) {
          final delay = i * 0.2;
          final progress = ((_controller.value - delay) % 1.0).clamp(0.0, 1.0);
          final scale = sin(progress * pi);
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF10B981).withOpacity(0.3 + scale * 0.7),
            ),
          );
        }),
      ),
    );
  }
}
