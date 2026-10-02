import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/api_service.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
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
      final response = await ApiService.instance.get('/attendance');
      if (mounted) setState(() => _data = Map<String, dynamic>.from(response.data as Map));
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل سجل الحضور من النظام.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = _data?['summary'] as Map<String, dynamic>? ?? {};
    final records = _data?['history'] as List<dynamic>? ?? const [];
    final total = summary['totalDays'] as num?;
    return Scaffold(
      appBar: AppBar(title: const Text('سجل الحضور'), actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh))]),
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
                      Wrap(spacing: 8, runSpacing: 8, children: [
                        _Stat(label: 'حاضر', count: summary['present'], total: total, color: AppColors.success, icon: Icons.check_circle_outline),
                        _Stat(label: 'غائب', count: summary['absent'], total: total, color: AppColors.error, icon: Icons.cancel_outlined),
                        _Stat(label: 'متأخر', count: summary['late'], total: total, color: AppColors.warning, icon: Icons.schedule),
                      ]),
                      const SizedBox(height: 22),
                      Text('نسبة الحضور المسجلة: ${_percentage(summary['attendanceRate'])}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      const SizedBox(height: 18),
                      const Text('السجل', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 10),
                      if (records.isEmpty)
                        const Padding(padding: EdgeInsets.symmetric(vertical: 22), child: Text('لا توجد سجلات حضور مرتبطة بحسابك.'))
                      else
                        ...records.map((value) {
                          final record = Map<String, dynamic>.from(value as Map);
                          final status = record['status']?.toString() ?? '';
                          final color = _statusColor(status);
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                            decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border.withOpacity(0.5))),
                            child: Row(children: [
                              Icon(Icons.circle, size: 10, color: color),
                              const SizedBox(width: 10),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(record['subject']?.toString() ?? 'الفصل', style: const TextStyle(fontWeight: FontWeight.w700)),
                                Text(_date(record['date']?.toString()), style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              ])),
                              Text(_statusLabel(status), style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
                            ]),
                          );
                        }),
                    ],
                  ),
                ),
    );
  }

  static Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'present': return AppColors.success;
      case 'absent': return AppColors.error;
      case 'late': return AppColors.warning;
      default: return AppColors.textHint;
    }
  }

  static String _statusLabel(String status) {
    switch (status.toLowerCase()) {
      case 'present': return 'حاضر';
      case 'absent': return 'غائب';
      case 'late': return 'متأخر';
      default: return status.isEmpty ? 'غير محدد' : status;
    }
  }

  static String _percentage(dynamic value) => value is num ? '${value.toStringAsFixed(1)}%' : '—';

  static String _date(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '');
    if (date == null) return 'تاريخ غير محدد';
    return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final dynamic count;
  final num? total;
  final Color color;
  final IconData icon;
  const _Stat({required this.label, required this.count, required this.total, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    final value = count is num ? count.toString() : '—';
    final share = total != null && total! > 0 && count is num ? ' (${(count / total! * 100).toStringAsFixed(0)}%)' : '';
    return Container(
      width: (MediaQuery.sizeOf(context).width - 40) / 3,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withOpacity(0.15))),
      child: Column(children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(height: 7),
        Text('$value$share', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color)),
        Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
      ]),
    );
  }
}

class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _LoadError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center), TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))])));
}
