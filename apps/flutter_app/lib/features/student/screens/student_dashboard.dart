import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routing/route_names.dart';
import '../../../services/api_service.dart';

class StudentDashboard extends StatefulWidget {
  const StudentDashboard({super.key});

  @override
  State<StudentDashboard> createState() => _StudentDashboardState();
}

class _StudentDashboardState extends State<StudentDashboard> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  Future<void> _issueParentLinkCode() async {
    try {
      final response = await ApiService.instance.post('/users/student-link-code');
      final payload = Map<String, dynamic>.from(response.data as Map);
      final code = payload['code']?.toString();
      final expiresAt = DateTime.tryParse(payload['expiresAt']?.toString() ?? '');
      if (code == null || code.isEmpty) throw const FormatException('Missing link code');
      if (!mounted) return;

      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('رمز ربط ولي الأمر'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('أرسل هذا الرمز لولي أمرك. يستخدم مرة واحدة وينتهي بعد 7 أيام.'),
              const SizedBox(height: 16),
              SelectableText(code, textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 2)),
              if (expiresAt != null) ...[
                const SizedBox(height: 8),
                Text('ينتهي في ${_date(expiresAt.toIso8601String())}', textAlign: TextAlign.center),
              ],
            ],
          ),
          actions: [
            TextButton.icon(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: code));
                if (dialogContext.mounted) Navigator.pop(dialogContext);
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم نسخ رمز الربط.')));
              },
              icon: const Icon(Icons.copy),
              label: const Text('نسخ الرمز'),
            ),
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('إغلاق')),
          ],
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر إنشاء الرمز. تأكد من تفعيل حسابك وربطه بالمدرسة.')));
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) setState(() { _loading = true; _error = null; });
    try {
      final response = await ApiService.instance.get('/dashboard/student');
      if (!mounted) return;
      setState(() => _data = Map<String, dynamic>.from(response.data as Map));
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'تعذر تحميل بيانات الطالب من النظام.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    final student = data?['student'] as Map<String, dynamic>? ?? {};
    final summary = data?['summary'] as Map<String, dynamic>? ?? {};
    final gamification = data?['gamification'] as Map<String, dynamic>? ?? {};
    final classes = (student['classes'] as List<dynamic>? ?? const []);
    final subjects = (data?['subjectPerformance'] as List<dynamic>? ?? const []);
    final assignments = (data?['upcomingAssignments'] as List<dynamic>? ?? const []);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDark,
        body: SafeArea(
          child: RefreshIndicator(
            onRefresh: _load,
            child: _loading && data == null
                ? ListView(children: [const SizedBox(height: 300), Center(child: CircularProgressIndicator())])
                : _error != null && data == null
                    ? ListView(
                        padding: const EdgeInsets.all(28),
                        children: [
                          const SizedBox(height: 180),
                          const Icon(Icons.cloud_off_outlined, color: Colors.white54, size: 42),
                          const SizedBox(height: 14),
                          Center(child: Text(_error!, style: const TextStyle(color: Colors.white70))),
                          const SizedBox(height: 12),
                          Center(child: TextButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))),
                        ],
                      )
                    : ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(18, 18, 18, 30),
                        children: [
                          Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.asset('assets/images/logo.jpeg', width: 42, height: 42, fit: BoxFit.cover),
                              ),
                              const SizedBox(width: 10),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                const Text('لوحة الطالب', style: TextStyle(color: Colors.white60, fontSize: 12)),
                                Text(student['name']?.toString() ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                              ])),
                              IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh, color: Colors.white70)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Align(
                            alignment: AlignmentDirectional.centerStart,
                            child: OutlinedButton.icon(
                              onPressed: _issueParentLinkCode,
                              icon: const Icon(Icons.family_restroom_outlined),
                              label: const Text('إنشاء رمز ربط ولي الأمر'),
                            ),
                          ),
                          const SizedBox(height: 20),
                          _MetricGrid(items: [
                            _MetricValue('المواد', '${summary['totalSubjects'] ?? '—'}', Icons.menu_book_outlined),
                            _MetricValue('واجبات مفتوحة', '${summary['pendingAssignments'] ?? '—'}', Icons.assignment_outlined),
                            _MetricValue('المعدل المسجل', _percent(summary['averageGrade']), Icons.grade_outlined),
                            _MetricValue('الحضور المسجل', _percent(summary['attendanceRate']), Icons.event_available_outlined),
                          ]),
                          const SizedBox(height: 18),
                          _SectionTitle(title: 'الفصول المسجل بها', actionLabel: null),
                          if (classes.isEmpty)
                            const _EmptyLine(text: 'لا يوجد فصل مرتبط بحسابك حاليًا.')
                          else
                            ...classes.map((item) {
                              final record = Map<String, dynamic>.from(item as Map);
                              return _DataRow(
                                icon: Icons.groups_2_outlined,
                                title: record['name']?.toString() ?? '',
                                subtitle: record['teacher']?.toString() ?? 'لا يوجد اسم معلم مسجل',
                              );
                            }),
                          const SizedBox(height: 18),
                          _SectionTitle(title: 'أداء المواد', actionLabel: null),
                          if (subjects.isEmpty)
                            const _EmptyLine(text: 'لا توجد مواد مسجلة في ملفك بعد.')
                          else
                            ...subjects.map((item) {
                              final record = Map<String, dynamic>.from(item as Map);
                              return _DataRow(
                                icon: Icons.book_outlined,
                                title: record['name']?.toString() ?? '',
                                subtitle: record['teacher']?.toString() ?? 'معلم غير مسجل',
                                trailing: _percent(record['averageGrade']),
                              );
                            }),
                          const SizedBox(height: 18),
                          _SectionTitle(
                            title: 'الواجبات القادمة',
                            actionLabel: 'عرض الكل',
                            onAction: () => context.go(RouteNames.studentAssignments),
                          ),
                          if (assignments.isEmpty)
                            const _EmptyLine(text: 'لا توجد واجبات مفتوحة مسجلة.')
                          else
                            ...assignments.map((item) {
                              final record = Map<String, dynamic>.from(item as Map);
                              return _DataRow(
                                icon: Icons.assignment_outlined,
                                title: record['title']?.toString() ?? '',
                                subtitle: (record['subject'] as Map?)?['name']?.toString() ?? '',
                                trailing: record['dueDate'] == null ? 'غير محدد' : _date(record['dueDate'].toString()),
                              );
                            }),
                          const SizedBox(height: 18),
                          _SectionTitle(title: 'إنجازاتك المسجلة', actionLabel: null),
                          _DataRow(
                            icon: Icons.bolt_outlined,
                            title: 'نقاط الخبرة',
                            subtitle: 'المستوى ${gamification['level'] ?? '—'}',
                            trailing: '${gamification['totalXP'] ?? '—'}',
                          ),
                          _DataRow(
                            icon: Icons.local_fire_department_outlined,
                            title: 'التتابع اليومي',
                            subtitle: 'من سجل النظام',
                            trailing: '${gamification['streakDays'] ?? '—'} يوم',
                          ),
                        ],
                      ),
          ),
        ),
      ),
    );
  }

  static String _percent(dynamic value) => value is num ? '${value.toStringAsFixed(1)}%' : '—';

  static String _date(String value) {
    final date = DateTime.tryParse(value);
    if (date == null) return 'موعد غير محدد';
    return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
  }
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
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.6),
        itemBuilder: (context, index) {
          final item = items[index];
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.borderDark)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Icon(item.icon, size: 19, color: const Color(0xFF34D399)),
              Text(item.value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)),
              Text(item.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white60, fontSize: 11)),
            ]),
          );
        },
      );
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  const _SectionTitle({required this.title, required this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 7),
        child: Row(children: [
          Expanded(child: Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800))),
          if (actionLabel != null) TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ]),
      );
}

class _DataRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? trailing;
  const _DataRow({required this.icon, required this.title, required this.subtitle, this.trailing});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 7),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.borderDark)),
        child: Row(children: [
          Icon(icon, color: const Color(0xFF34D399), size: 19),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
            if (subtitle.isNotEmpty) Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white54, fontSize: 11)),
          ])),
          if (trailing != null) Text(trailing!, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700)),
        ]),
      );
}

class _EmptyLine extends StatelessWidget {
  final String text;
  const _EmptyLine({required this.text});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text(text, style: const TextStyle(color: Colors.white54, fontSize: 13)));
}
