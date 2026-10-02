import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/routing/route_names.dart';
import '../../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final name = user?.name.trim() ?? '';
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDark,
        body: SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
            children: [
              const Text('الملف الشخصي', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900, color: Colors.white)),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(gradient: AppColors.heroGradient, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFF10B981).withOpacity(0.15))),
                child: Row(children: [
                  CircleAvatar(radius: 30, backgroundColor: const Color(0xFF0D9488), foregroundColor: Colors.white, child: Text(name.isEmpty ? '؟' : name.substring(0, 1), style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800))),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(name.isEmpty ? '—' : name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                    const SizedBox(height: 4),
                    Text(user?.email ?? '—', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.65))),
                    const SizedBox(height: 7),
                    const Text('طالب', style: TextStyle(color: Color(0xFF6EE7B7), fontSize: 12, fontWeight: FontWeight.w700)),
                  ])),
                ]),
              ),
              const SizedBox(height: 22),
              const Text('سجلاتك', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              _ProfileMenuItem(icon: Icons.workspace_premium_outlined, title: 'الإنجازات', subtitle: 'عرض الإنجازات المسجلة', onTap: () => context.push(RouteNames.studentAchievements)),
              _ProfileMenuItem(icon: Icons.assignment_outlined, title: 'الواجبات', subtitle: 'متابعة الواجبات المسجلة', onTap: () => context.go(RouteNames.studentAssignments)),
              _ProfileMenuItem(icon: Icons.bar_chart_outlined, title: 'الدرجات', subtitle: 'عرض سجلات الدرجات', onTap: () => context.push(RouteNames.studentGrades)),
              _ProfileMenuItem(icon: Icons.calendar_today_outlined, title: 'الجدول', subtitle: 'عرض الجدول المرتبط بحسابك', onTap: () => context.push(RouteNames.studentSchedule)),
              _ProfileMenuItem(icon: Icons.settings_outlined, title: 'الحساب', subtitle: 'بيانات الجلسة وتسجيل الخروج', onTap: () => context.go(RouteNames.studentSettings)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileMenuItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _ProfileMenuItem({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.borderDark)),
        child: ListTile(
          onTap: onTap,
          leading: Icon(icon, color: const Color(0xFF34D399)),
          title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          subtitle: Text(subtitle, style: const TextStyle(color: Colors.white54, fontSize: 12)),
          trailing: const Icon(Icons.chevron_left, color: Colors.white54),
        ),
      );
}
