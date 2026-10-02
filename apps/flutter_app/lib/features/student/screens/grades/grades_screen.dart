import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/api_service.dart';

class GradesScreen extends StatefulWidget {
  const GradesScreen({super.key});

  @override
  State<GradesScreen> createState() => _GradesScreenState();
}

class _GradesScreenState extends State<GradesScreen> {
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
      final response = await ApiService.instance.get('/grades');
      if (mounted) setState(() => _data = Map<String, dynamic>.from(response.data as Map));
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل الدرجات المسجلة لحسابك.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = _data?['summary'] as Map<String, dynamic>? ?? {};
    final grades = _data?['grades'] as List<dynamic>? ?? const [];
    final average = summary['averageGrade'];
    return Scaffold(
      appBar: AppBar(title: const Text('الدرجات'), actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh))]),
      body: _loading && _data == null
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _data == null
              ? _LoadError(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(14)),
                        child: Column(children: [
                          Text('متوسط الدرجات المسجلة', style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 14)),
                          const SizedBox(height: 8),
                          Text(average is num ? '${average.toStringAsFixed(1)}%' : '—', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
                          Text('${summary['totalSubjects'] ?? grades.length} سجل درجة', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                        ]),
                      ),
                      const SizedBox(height: 22),
                      const Text('سجلات الدرجات', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 10),
                      if (grades.isEmpty)
                        const Padding(padding: EdgeInsets.symmetric(vertical: 22), child: Text('لا توجد درجات مسجلة في حسابك بعد.'))
                      else
                        ...grades.map((value) {
                          final record = Map<String, dynamic>.from(value as Map);
                          final rawPercentage = record['percentage'];
                          final score = record['grade'];
                          final maxScore = record['maxGrade'];
                          final percentage = rawPercentage is num
                              ? rawPercentage.toDouble().clamp(0.0, 100.0).toDouble()
                              : score is num && maxScore is num && maxScore > 0
                                  ? (score / maxScore * 100).clamp(0.0, 100.0).toDouble()
                                  : null;
                          final color = percentage == null
                              ? AppColors.textSecondary
                              : percentage >= 80
                                  ? AppColors.success
                                  : percentage >= 60
                                      ? AppColors.warning
                                      : AppColors.error;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 9),
                            padding: const EdgeInsets.all(15),
                            decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border.withOpacity(0.5))),
                            child: Row(children: [
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(record['subjectName']?.toString() ?? 'مادة غير محددة', style: const TextStyle(fontWeight: FontWeight.w700)),
                                const SizedBox(height: 9),
                                if (percentage != null) LinearProgressIndicator(value: percentage / 100, minHeight: 5, color: color, backgroundColor: AppColors.border),
                                const SizedBox(height: 6),
                                Text(_date(record['date']), style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                              ])),
                              const SizedBox(width: 16),
                              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                Text('${record['grade'] ?? '—'} / ${record['maxGrade'] ?? '—'}', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: color)),
                                Text('${record['letterGrade'] ?? '—'} · ${percentage?.toStringAsFixed(0) ?? '—'}%', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                              ]),
                            ]),
                          );
                        }),
                    ],
                  ),
                ),
    );
  }

  static String _date(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '');
    if (date == null) return 'تاريخ غير محدد';
    return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
  }
}

class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _LoadError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center), TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))])));
}
