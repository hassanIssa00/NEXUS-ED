import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/api_service.dart';

const _days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  Map<int, List<Map<String, dynamic>>> _schedule = {};
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
      final response = await ApiService.instance.get('/schedule/my');
      final payload = Map<String, dynamic>.from(response.data as Map);
      final raw = Map<String, dynamic>.from(payload['data'] as Map? ?? {});
      final parsed = <int, List<Map<String, dynamic>>>{};
      for (final entry in raw.entries) {
        final day = int.tryParse(entry.key);
        if (day == null || entry.value is! List) continue;
        parsed[day] = (entry.value as List<dynamic>).map((item) => Map<String, dynamic>.from(item as Map)).toList();
      }
      if (mounted) setState(() => _schedule = parsed);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل الجدول الدراسي المرتبط بحسابك.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayIndex = DateTime.now().weekday % 7;
    return Scaffold(
      appBar: AppBar(title: const Text('الجدول الدراسي'), actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh))]),
      body: _loading && _schedule.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _schedule.isEmpty
              ? _LoadError(message: _error!, onRetry: _load)
              : DefaultTabController(
                  length: _days.length,
                  initialIndex: todayIndex,
                  child: Column(children: [
                    TabBar(isScrollable: true, tabs: [for (var index = 0; index < _days.length; index++) Tab(text: _days[index])]),
                    Expanded(child: TabBarView(children: List.generate(_days.length, _dayView))),
                  ]),
                ),
    );
  }

  Widget _dayView(int dayIndex) {
    final records = _schedule[dayIndex] ?? const <Map<String, dynamic>>[];
    if (records.isEmpty) return Center(child: Text('لا توجد حصص مسجلة يوم ${_days[dayIndex]}.', style: TextStyle(color: AppColors.textSecondary)));
    final now = DateTime.now();
    final currentDay = now.weekday % 7;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: records.length,
        separatorBuilder: (_, __) => const SizedBox(height: 9),
        itemBuilder: (context, index) {
          final item = records[index];
          final subject = item['subject'] as Map<String, dynamic>? ?? {};
          final startTime = item['startTime']?.toString() ?? '';
          final endTime = item['endTime']?.toString() ?? '';
          final nowValue = now.hour * 60 + now.minute;
          final current = currentDay == dayIndex && _minutes(startTime) <= nowValue && nowValue < _minutes(endTime);
          return Container(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(color: current ? AppColors.primary.withOpacity(0.08) : Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: current ? AppColors.primary : AppColors.border.withOpacity(0.5))),
            child: Row(children: [
              Column(children: [Text(startTime, style: const TextStyle(fontWeight: FontWeight.w800)), Text(endTime, style: TextStyle(fontSize: 12, color: AppColors.textSecondary))]),
              const SizedBox(width: 14),
              const Icon(Icons.menu_book_outlined, color: AppColors.primary),
              const SizedBox(width: 11),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(subject['name']?.toString() ?? 'حصة', style: const TextStyle(fontWeight: FontWeight.w800)),
                Text([item['room'], (item['class'] as Map?)?['name']].where((value) => value != null && value.toString().isNotEmpty).join(' · '), style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              ])),
              if (current) const Text('الآن', style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w800)),
            ]),
          );
        },
      ),
    );
  }

  static int _minutes(String value) {
    final parts = value.split(':');
    if (parts.length != 2) return -1;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return -1;
    return hour * 60 + minute;
  }
}

class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _LoadError({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center), TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))])));
}
