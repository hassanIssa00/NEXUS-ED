import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routing/route_names.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  String _selectedRole = 'student';
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _acceptTerms = false;
  late AnimationController _animController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _fadeAnimation = CurvedAnimation(parent: _animController, curve: Curves.easeInOut);
    _animController.forward();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_acceptTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('يجب الموافقة على شروط الخدمة'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    final success = await ref.read(authProvider.notifier).register(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
          password: _passwordController.text,
          role: _selectedRole,
        );

    if (success && mounted) {
      final role = ref.read(authProvider).user?.role;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('تم إنشاء الحساب وتسجيل الدخول بنجاح'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      context.go(role == 'parent'
          ? RouteNames.parentDashboard
          : RouteNames.studentProfileSetup);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ref.read(authProvider).errorMessage ?? 'فشل إنشاء الحساب'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  InputDecoration _inputDecoration({
    required String hint,
    required IconData icon,
    Widget? suffix,
    TextDirection? hintDir,
  }) {
    return InputDecoration(
      hintText: hint,
      hintTextDirection: hintDir,
      hintStyle: TextStyle(color: Colors.white.withOpacity(0.25)),
      prefixIcon: Icon(icon, color: Colors.white.withOpacity(0.4)),
      suffixIcon: suffix,
      filled: true,
      fillColor: Colors.white.withOpacity(0.06),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.white.withOpacity(0.08))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.primary, width: 2)),
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.error)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.status == AuthStatus.loading;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF0A1628), Color(0xFF0D2137), Color(0xFF1B2838)],
            ),
          ),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 16),
                      
                      // Back button
                      Align(
                        alignment: Alignment.centerRight,
                        child: IconButton(
                          onPressed: () => context.go(RouteNames.login),
                          icon: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.06),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.white.withOpacity(0.08)),
                            ),
                            child: const Icon(Icons.arrow_forward_rounded, color: Colors.white70, size: 20),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Logo + Header
                      Center(
                        child: Column(
                          children: [
                            Container(
                              width: 72,
                              height: 72,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(20),
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF0D9488), Color(0xFF10B981)],
                                ),
                                boxShadow: [
                                  BoxShadow(color: AppColors.primary.withOpacity(0.35), blurRadius: 24, spreadRadius: 2),
                                ],
                              ),
                              child: const Center(
                                child: Text('N', style: TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: Colors.white)),
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Text('إنشاء حساب جديد', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.white)),
                            const SizedBox(height: 6),
                            Text(
                              'انضم لمنصة نِكْسُس التعليمية',
                              style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.5)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),

                      // Role Selection
                      Text('نوع الحساب', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.6))),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          _RoleChip(emoji: '📚', label: 'طالب', value: 'student', selected: _selectedRole == 'student', onTap: () => setState(() => _selectedRole = 'student')),
                          const SizedBox(width: 12),
                          _RoleChip(emoji: '👨‍👩‍👧', label: 'ولي أمر', value: 'parent', selected: _selectedRole == 'parent', onTap: () => setState(() => _selectedRole = 'parent')),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Name
                      Text('الاسم الكامل', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.6))),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _nameController,
                        style: const TextStyle(color: Colors.white),
                        decoration: _inputDecoration(hint: 'أحمد علي', icon: Icons.person_outline_rounded),
                        validator: (v) => v == null || v.isEmpty ? 'الرجاء إدخال الاسم' : null,
                      ),
                      const SizedBox(height: 18),

                      // Email
                      Text('البريد الإلكتروني', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.6))),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        textDirection: TextDirection.ltr,
                        style: const TextStyle(color: Colors.white),
                        decoration: _inputDecoration(hint: 'ahmed@example.com', icon: Icons.mail_outline_rounded, hintDir: TextDirection.ltr),
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'الرجاء إدخال البريد';
                          if (!v.contains('@')) return 'بريد غير صالح';
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),

                      // Password
                      Text('كلمة المرور', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.6))),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        textDirection: TextDirection.ltr,
                        style: const TextStyle(color: Colors.white),
                        decoration: _inputDecoration(
                          hint: '••••••••', icon: Icons.lock_outline_rounded, hintDir: TextDirection.ltr,
                          suffix: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.white.withOpacity(0.4)),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'الرجاء إدخال كلمة المرور';
                          if (v.length < 6) return '6 أحرف على الأقل';
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),

                      // Confirm Password
                      Text('تأكيد كلمة المرور', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.6))),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _confirmPasswordController,
                        obscureText: _obscureConfirmPassword,
                        textDirection: TextDirection.ltr,
                        style: const TextStyle(color: Colors.white),
                        decoration: _inputDecoration(
                          hint: '••••••••', icon: Icons.lock_outline_rounded, hintDir: TextDirection.ltr,
                          suffix: IconButton(
                            icon: Icon(_obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.white.withOpacity(0.4)),
                            onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                          ),
                        ),
                        validator: (v) {
                          if (v != _passwordController.text) return 'كلمات المرور غير متطابقة';
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),

                      // Terms
                      Row(
                        children: [
                          SizedBox(
                            width: 22, height: 22,
                            child: Checkbox(
                              value: _acceptTerms,
                              onChanged: (v) => setState(() => _acceptTerms = v ?? false),
                              activeColor: AppColors.primary,
                              checkColor: Colors.white,
                              side: BorderSide(color: Colors.white.withOpacity(0.25)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'أوافق على شروط الخدمة وسياسة الخصوصية',
                              style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.4)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Register Button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            gradient: const LinearGradient(colors: [Color(0xFF0D9488), Color(0xFF10B981)]),
                            boxShadow: [
                              BoxShadow(color: AppColors.primary.withOpacity(0.35), blurRadius: 20, offset: const Offset(0, 8)),
                            ],
                          ),
                          child: ElevatedButton(
                            onPressed: isLoading ? null : _handleRegister,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            child: isLoading
                                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                                : const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text('إنشاء حساب', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white)),
                                      SizedBox(width: 8),
                                      Icon(Icons.arrow_forward_rounded, color: Colors.white),
                                    ],
                                  ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Login link
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('لديك حساب بالفعل؟', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 14)),
                          TextButton(
                            onPressed: () => context.go(RouteNames.login),
                            child: const Text('تسجيل الدخول', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.primary)),
                          ),
                        ],
                      ),

                      // Footer
                      const SizedBox(height: 8),
                      Center(
                        child: Text(
                          'Nexus EDU — Developed by Hassan Issa',
                          style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.2)),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RoleChip extends StatelessWidget {
  final String emoji, label, value;
  final bool selected;
  final VoidCallback onTap;

  const _RoleChip({required this.emoji, required this.label, required this.value, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary.withOpacity(0.15) : Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? AppColors.primary : Colors.white.withOpacity(0.08),
              width: selected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Text(emoji, style: const TextStyle(fontSize: 22)),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: selected ? AppColors.primary : Colors.white.withOpacity(0.6),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
