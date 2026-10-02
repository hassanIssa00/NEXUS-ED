import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/api_service.dart';

class TeacherDashboard extends StatefulWidget {
  const TeacherDashboard({super.key});
  @override
  State<TeacherDashboard> createState() => _TeacherDashboardState();
}

class _TeacherDashboardState extends State<TeacherDashboard> {
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
      final response = await ApiService.instance.get('/dashboard/teacher');
      if (mounted) setState(() => _data = Map<String, dynamic>.from(response.data as Map));
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل لوحة المعلم من النظام.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final teacher = _data?['teacher'] as Map<String, dynamic>? ?? {};
    final summary = _data?['summary'] as Map<String, dynamic>? ?? {};
    final classes = (_data?['classPerformance'] as List<dynamic>? ?? const []);
    final assignments = (_data?['recentAssignments'] as List<dynamic>? ?? const []);
    final queue = (_data?['gradingQueue'] as List<dynamic>? ?? const []);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDark,
        body: SafeArea(
          child: RefreshIndicator(
            onRefresh: _load,
            child: _loading && _data == null
                ? ListView(children: [const SizedBox(height: 300), Center(child: CircularProgressIndicator())])
                : _error != null && _data == null
                    ? ListView(padding: const EdgeInsets.all(24), children: [const SizedBox(height: 170), const Icon(Icons.cloud_off_outlined, color: Colors.white54, size: 40), const SizedBox(height: 12), Center(child: Text(_error!, style: const TextStyle(color: Colors.white70))), Center(child: TextButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة')))])
                    : ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(18, 18, 18, 30),
                        children: [
                          Row(children: [
                            ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.asset('assets/images/logo.jpeg', width: 42, height: 42, fit: BoxFit.cover)),
                            const SizedBox(width: 10),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('لوحة المعلم', style: TextStyle(color: Colors.white60, fontSize: 12)), Text(teacher['name']?.toString() ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800))])),
                            IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh, color: Colors.white70)),
                          ]),
                          const SizedBox(height: 20),
                          _MetricGrid(items: [
                            _MetricValue('الفصول', '${summary['totalClasses'] ?? '—'}', Icons.groups_outlined),
                            _MetricValue('الطلاب', '${summary['totalStudents'] ?? '—'}', Icons.school_outlined),
                            _MetricValue('بانتظار التصحيح', '${summary['pendingSubmissions'] ?? '—'}', Icons.assignment_late_outlined),
                            _MetricValue('الحضور المسجل', _percent(summary['attendanceRate']), Icons.event_available_outlined),
                          ]),
                          const SizedBox(height: 18),
                          const _SectionTitle('الفصول والدرجات المسجلة'),
                          if (classes.isEmpty)
                            const _EmptyLine('لا توجد فصول مرتبطة بحسابك.')
                          else
                            ...classes.map((item) {
                              final record = Map<String, dynamic>.from(item as Map);
                              return _DataRow(
                                title: record['name']?.toString() ?? '',
                                subtitle: '${record['studentCount'] ?? '—'} طالب · ${record['subjectCount'] ?? '—'} مادة',
                                trailing: _percent(record['averageGrade']),
                                icon: Icons.groups_2_outlined,
                              );
                            }),
                          const SizedBox(height: 18),
                          const _SectionTitle('تسليمات بانتظار التصحيح'),
                          if (queue.isEmpty)
                            const _EmptyLine('لا توجد تسليمات مفتوحة للتصحيح.')
                          else
                            ...queue.map((item) {
                              final record = Map<String, dynamic>.from(item as Map);
                              final assignment = Map<String, dynamic>.from(record['assignment'] as Map? ?? {});
                              final student = Map<String, dynamic>.from(record['student'] as Map? ?? {});
                              return _DataRow(
                                title: assignment['title']?.toString() ?? '',
                                subtitle: student['name']?.toString() ?? student['email']?.toString() ?? '',
                                icon: Icons.assignment_outlined,
                              );
                            }),
                          const SizedBox(height: 18),
                          const _SectionTitle('آخر الواجبات المنشأة'),
                          if (assignments.isEmpty)
                            const _EmptyLine('لا توجد واجبات مرتبطة بحسابك.')
                          else
                            ...assignments.map((item) {
                              final record = Map<String, dynamic>.from(item as Map);
                              return _DataRow(
                                title: record['title']?.toString() ?? '',
                                subtitle: record['subject']?.toString() ?? '',
                                trailing: '${record['submissions'] ?? '—'} تسليم',
                                icon: Icons.assignment_turned_in_outlined,
                              );
                            }),
                        ],
                      ),
          ),
        ),
      ),
    );
  }

  static String _percent(dynamic value) => value is num ? '${value.toStringAsFixed(1)}%' : '—';
}

class _MetricValue {
  final String label;
  final String value;
  final IconData icon;
  const _MetricValue(this.label, this.value, this.icon);
}

class _MetricGrid extends StatelessWidget {
  final List<_MetricValue> items;
  const _MetricGrid({required this.items});
  @override
  Widget build(BuildContext context) => GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: items.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 9, crossAxisSpacing: 9, childAspectRatio: 1.6),
        itemBuilder: (context, index) {
          final item = items[index];
          return Container(padding: const EdgeInsets.all(13), decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(13), border: Border.all(color: AppColors.borderDark)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Icon(item.icon, color: const Color(0xFF34D399), size: 19), Text(item.value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)), Text(item.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white60, fontSize: 11))]));
        },
      );
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 7), child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)));
}

class _DataRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? trailing;
  final IconData icon;
  const _DataRow({required this.title, required this.subtitle, this.trailing, required this.icon});
  @override
  Widget build(BuildContext context) => Container(margin: const EdgeInsets.only(bottom: 7), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11), decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(11), border: Border.all(color: AppColors.borderDark)), child: Row(children: [Icon(icon, color: const Color(0xFF34D399), size: 18), const SizedBox(width: 9), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)), if (subtitle.isNotEmpty) Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white54, fontSize: 11))])), if (trailing != null) Text(trailing!, style: const TextStyle(color: Colors.white70, fontSize: 11))]));
}

class _EmptyLine extends StatelessWidget {
  final String text;
  const _EmptyLine(this.text);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text(text, style: const TextStyle(color: Colors.white54, fontSize: 13)));
}
