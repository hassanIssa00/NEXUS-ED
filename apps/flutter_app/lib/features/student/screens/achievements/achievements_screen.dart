import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/routing/route_names.dart';
import '../../../../services/api_service.dart';

class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) setState(() { _loading = true; _error = null; });
    try {
      final response = await ApiService.instance.get('/dashboard/student');
      if (mounted) setState(() => _data = Map<String, dynamic>.from(response.data as Map));
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل إنجازات حسابك.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final achievements = _data?['achievements'] as List<dynamic>? ?? const [];
    final gamification = _data?['gamification'] as Map<String, dynamic>? ?? {};
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDark,
        appBar: AppBar(title: const Text('الإنجازات المسجلة'), backgroundColor: AppColors.backgroundDark, foregroundColor: Colors.white, actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh))]),
        body: _loading && _data == null
            ? const Center(child: CircularProgressIndicator())
            : _error != null && _data == null
                ? _LoadError(message: _error!, onRetry: _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(18),
                      children: [
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(14)),
                          child: Row(children: [
                            const Icon(Icons.bolt_outlined, color: Colors.white, size: 28),
                            const SizedBox(width: 12),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text('${gamification['totalXP'] ?? '—'} XP', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
                              Text('المستوى ${gamification['level'] ?? '—'}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                            ])),
                            Text('${achievements.length} إنجاز', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                          ]),
                        ),
                        const SizedBox(height: 16),
                        if (achievements.isEmpty)
                          const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Text('لا توجد إنجازات مسجلة في ملفك بعد.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white70)))
                        else
                          ...achievements.map((value) {
                            final item = Map<String, dynamic>.from(value as Map);
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(11), border: Border.all(color: AppColors.borderDark)),
                              child: Row(children: [
                                const Icon(Icons.workspace_premium_outlined, color: Color(0xFFFBBF24), size: 24),
                                const SizedBox(width: 11),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(item['name']?.toString() ?? 'إنجاز', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                                  if (item['description'] != null) Text(item['description'].toString(), style: const TextStyle(color: Colors.white60, fontSize: 12)),
                                ])),
                                Text(_date(item['unlockedAt']), style: const TextStyle(color: Colors.white38, fontSize: 10)),
                              ]),
                            );
                          }),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(onPressed: () => context.go(RouteNames.studentMillionJourney), icon: const Icon(Icons.flag_outlined), label: const Text('عرض مراحل الإنجاز')),
                      ],
                    ),
                  ),
      ),
    );
  }

  static String _date(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '');
    if (date == null) return '';
    return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
  }
}

class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _LoadError({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)), TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))])));
}
