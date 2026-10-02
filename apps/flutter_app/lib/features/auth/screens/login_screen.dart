import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routing/route_names.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with TickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;

  late AnimationController _bgController;
  late AnimationController _formController;
  late Animation<double> _formFade;
  late Animation<Offset> _formSlide;
  late AnimationController _logoController;
  late Animation<double> _logoScale;


  @override
  void initState() {
    super.initState();
    
    _bgController = AnimationController(vsync: this, duration: const Duration(seconds: 8))..repeat();
    
    _logoController = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _logoScale = CurvedAnimation(parent: _logoController, curve: Curves.elasticOut);

    _formController = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    _formFade = CurvedAnimation(parent: _formController, curve: Curves.easeIn);
    _formSlide = Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero).animate(
      CurvedAnimation(parent: _formController, curve: Curves.easeOutCubic),
    );

    _logoController.forward();
    Future.delayed(const Duration(milliseconds: 300), () => _formController.forward());
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _bgController.dispose();
    _formController.dispose();
    _logoController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final role = await ref.read(authProvider.notifier).login(
          _emailController.text.trim(),
          _passwordController.text,
        );

    if (role != null && mounted) {
      switch (role) {
        case 'admin':
        case 'administrator':
        case 'principal':
        case 'vice_principal':
          context.go(RouteNames.adminDashboard);
          break;
        case 'teacher':
          context.go(RouteNames.teacherDashboard);
          break;
        case 'parent':
          context.go(RouteNames.parentDashboard);
          break;
        case 'student':
          context.go(RouteNames.studentDashboard);
          break;
        default:
          await ref.read(authProvider.notifier).logout();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('هذا الدور لا يملك واجهة موبايل مهيأة بعد. تواصل مع إدارة المدرسة.')),
            );
          }
      }
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.error_outline, color: Colors.white, size: 20),
              SizedBox(width: 10),
              Text(ref.read(authProvider).errorMessage ?? 'فشل تسجيل الدخول — تحقق من البيانات'),
            ],
          ),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
          margin: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.status == AuthStatus.loading;
    final sz = MediaQuery.of(context).size;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
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
            children: [
              // Animated mesh gradient background
              AnimatedBuilder(
                animation: _bgController,
                builder: (context, _) => CustomPaint(
                  size: sz,
                  painter: _MeshGradientPainter(_bgController.value),
                ),
              ),

              // Main scrollable content
              SafeArea(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: [
                      SizedBox(height: sz.height * 0.05),

                      // Logo + Title
                      ScaleTransition(
                        scale: _logoScale,
                        child: Column(
                          children: [
                            // Logo with glassmorphism ring
                            Container(
                              width: 100,
                              height: 100,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(28),
                                boxShadow: [
                                  BoxShadow(color: const Color(0xFF10B981).withOpacity(0.35), blurRadius: 30, spreadRadius: 5),
                                ],
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(28),
                                child: Image.asset('assets/images/logo.jpeg', fit: BoxFit.cover),
                              ),
                            ),
                            const SizedBox(height: 18),
                            ShaderMask(
                              shaderCallback: (bounds) => const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF06B6D4)]).createShader(bounds),
                              child: const Text('NEXUS EDU', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 5)),
                            ),
                            const SizedBox(height: 6),
                            Text('تسجيل الدخول', style: TextStyle(fontSize: 15, color: Colors.white.withOpacity(0.4))),
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Form card with glassmorphism
                      SlideTransition(
                        position: _formSlide,
                        child: FadeTransition(
                          opacity: _formFade,
                          child: Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.04),
                              borderRadius: BorderRadius.circular(28),
                              border: Border.all(color: Colors.white.withOpacity(0.06)),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 40, offset: const Offset(0, 10)),
                              ],
                            ),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Email field
                                  _buildFieldLabel('البريد الإلكتروني', Icons.mail_outline_rounded),
                                  const SizedBox(height: 8),
                                  _buildTextField(
                                    controller: _emailController,
                                    hint: 'example@school.com',
                                    icon: Icons.mail_outline_rounded,
                                    isLTR: true,
                                    keyboardType: TextInputType.emailAddress,
                                    validator: (v) {
                                      if (v == null || v.isEmpty) return 'الرجاء إدخال البريد الإلكتروني';
                                      if (!v.contains('@')) return 'بريد إلكتروني غير صالح';
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 18),

                                  // Password field
                                  _buildFieldLabel('كلمة المرور', Icons.lock_outline_rounded),
                                  const SizedBox(height: 8),
                                  _buildTextField(
                                    controller: _passwordController,
                                    hint: '••••••••',
                                    icon: Icons.lock_outline_rounded,
                                    isLTR: true,
                                    obscure: _obscurePassword,
                                    suffix: IconButton(
                                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                      icon: Icon(
                                        _obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                                        color: Colors.white.withOpacity(0.3),
                                        size: 20,
                                      ),
                                    ),
                                    validator: (v) {
                                      if (v == null || v.isEmpty) return 'الرجاء إدخال كلمة المرور';
                                      if (v.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),

                                  // Login Button
                                  SizedBox(
                                    width: double.infinity,
                                    height: 56,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(18),
                                        gradient: const LinearGradient(
                                          colors: [Color(0xFF0D9488), Color(0xFF10B981), Color(0xFF059669)],
                                        ),
                                        boxShadow: [
                                          BoxShadow(color: const Color(0xFF10B981).withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8)),
                                        ],
                                      ),
                                      child: ElevatedButton(
                                        onPressed: isLoading ? null : _handleLogin,
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.transparent,
                                          shadowColor: Colors.transparent,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                                        ),
                                        child: isLoading
                                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                                            : const Row(
                                                mainAxisAlignment: MainAxisAlignment.center,
                                                children: [
                                                  Text('تسجيل الدخول', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 0.5)),
                                                  SizedBox(width: 10),
                                                  Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
                                                ],
                                              ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Register link
                      FadeTransition(
                        opacity: _formFade,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('ليس لديك حساب؟', style: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 14)),
                            TextButton(
                              onPressed: () => context.go(RouteNames.register),
                              child: const Text('إنشاء حساب', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF10B981))),
                            ),
                          ],
                        ),
                      ),

                      // Footer
                      const SizedBox(height: 8),
                      Text('Nexus EDU v1.0.0 — Hassan Issa', style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.15))),
                      const SizedBox(height: 24),
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

  Widget _buildFieldLabel(String label, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.white.withOpacity(0.3)),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.5))),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool isLTR = false,
    bool obscure = false,
    Widget? suffix,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      textDirection: isLTR ? TextDirection.ltr : null,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white, fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        hintTextDirection: isLTR ? TextDirection.ltr : null,
        hintStyle: TextStyle(color: Colors.white.withOpacity(0.2)),
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.06)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.error.withOpacity(0.5)),
        ),
        errorStyle: const TextStyle(fontSize: 11),
      ),
      validator: validator,
    );
  }
}

// ═════════════════════════════════════════════
// MESH GRADIENT PAINTER
// ═════════════════════════════════════════════
class _MeshGradientPainter extends CustomPainter {
  final double progress;
  _MeshGradientPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final t = progress * 2 * pi;

    // Emerald orb
    final p1 = Paint()
      ..shader = RadialGradient(
        colors: [const Color(0xFF10B981).withOpacity(0.06), Colors.transparent],
        radius: 0.5,
      ).createShader(Rect.fromCircle(
        center: Offset(size.width * (0.3 + 0.2 * sin(t)), size.height * (0.25 + 0.1 * cos(t))),
        radius: 200,
      ));
    canvas.drawCircle(
      Offset(size.width * (0.3 + 0.2 * sin(t)), size.height * (0.25 + 0.1 * cos(t))),
      200, p1,
    );

    // Teal orb
    final p2 = Paint()
      ..shader = RadialGradient(
        colors: [const Color(0xFF06B6D4).withOpacity(0.04), Colors.transparent],
        radius: 0.5,
      ).createShader(Rect.fromCircle(
        center: Offset(size.width * (0.7 + 0.15 * cos(t * 0.7)), size.height * (0.7 + 0.1 * sin(t * 0.7))),
        radius: 180,
      ));
    canvas.drawCircle(
      Offset(size.width * (0.7 + 0.15 * cos(t * 0.7)), size.height * (0.7 + 0.1 * sin(t * 0.7))),
      180, p2,
    );

    // Gold accent
    final p3 = Paint()
      ..shader = RadialGradient(
        colors: [const Color(0xFFF59E0B).withOpacity(0.025), Colors.transparent],
        radius: 0.4,
      ).createShader(Rect.fromCircle(
        center: Offset(size.width * (0.8 + 0.1 * sin(t * 1.3)), size.height * (0.3 + 0.1 * cos(t * 1.3))),
        radius: 120,
      ));
    canvas.drawCircle(
      Offset(size.width * (0.8 + 0.1 * sin(t * 1.3)), size.height * (0.3 + 0.1 * cos(t * 1.3))),
      120, p3,
    );
  }

  @override
  bool shouldRepaint(covariant _MeshGradientPainter oldDelegate) => true;
}
