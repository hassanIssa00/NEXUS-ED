import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routing/route_names.dart';
import '../../../services/api_service.dart';

class ParentDashboard extends StatefulWidget {
  const ParentDashboard({super.key});

  @override
  State<ParentDashboard> createState() => _ParentDashboardState();
}

class _ParentDashboardState extends State<ParentDashboard> {
  List<Map<String, dynamic>> _children = [];
  String? _selectedId;
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
      final response = await ApiService.instance.get('/dashboard/parent');
      final payload = Map<String, dynamic>.from(response.data as Map);
      final values = (payload['children'] as List<dynamic>? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      if (!mounted) return;
      setState(() {
        _children = values;
        if (!values.any((child) => child['id'] == _selectedId)) {
          _selectedId = values.isEmpty ? null : values.first['id']?.toString();
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'تعذر تحميل بيانات الأبناء المرتبطين بالحساب.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _linkStudent() async {
    final controller = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('ربط طالب'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 16,
          textCapitalization: TextCapitalization.characters,
          textAlign: TextAlign.center,
          decoration: const InputDecoration(labelText: 'رمز الربط', hintText: 'أدخل الرمز المكوّن من 16 حرفًا'),
          onChanged: (value) {
            final normalized = value.toUpperCase().replaceAll(RegExp(r'[^A-F0-9]'), '');
            if (normalized != value) {
              controller.value = TextEditingValue(text: normalized, selection: TextSelection.collapsed(offset: normalized.length));
            }
          },
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('إلغاء')),
          FilledButton(onPressed: () => Navigator.pop(dialogContext, controller.text.trim()), child: const Text('ربط')),
        ],
      ),
    );
    controller.dispose();
    if (code == null || code.length != 16) return;

    try {
      final response = await ApiService.instance.post('/users/link-student', data: {'code': code});
      final linked = Map<String, dynamic>.from(response.data as Map);
      final studentId = (linked['student'] as Map?)?['id']?.toString();
      await _load();
      if (mounted && studentId != null && studentId.isNotEmpty) {
        context.go(RouteNames.parentSurvey.replaceFirst(':studentId', Uri.encodeComponent(studentId)));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر استخدام الرمز. تحقق من صلاحيته ومدرسته.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    Map<String, dynamic>? child;
    for (final item in _children) {
      if (item['id'] == _selectedId) {
        child = item;
        break;
      }
    }
    final attendance = child?['attendance'] as Map<String, dynamic>?;
    final selectedStudentId = child?['id']?.toString();
    final grades = (child?['recentGrades'] as List<dynamic>? ?? const []);
    final assignments = (child?['upcomingAssignments'] as List<dynamic>? ?? const []);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDark,
        body: SafeArea(
          child: RefreshIndicator(
            onRefresh: _load,
            child: _loading && _children.isEmpty
                ? ListView(children: [const SizedBox(height: 300), Center(child: CircularProgressIndicator())])
                : _error != null && _children.isEmpty
                    ? ListView(padding: const EdgeInsets.all(24), children: [
                        const SizedBox(height: 170),
                        const Icon(Icons.cloud_off_outlined, color: Colors.white54, size: 40),
                        const SizedBox(height: 12),
                        Center(child: Text(_error!, style: const TextStyle(color: Colors.white70))),
                        Center(child: TextButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))),
                      ])
                    : ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(18, 18, 18, 30),
                        children: [
                          Row(children: [
                            ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.asset('assets/images/logo.jpeg', width: 42, height: 42, fit: BoxFit.cover)),
                            const SizedBox(width: 10),
                            const Expanded(child: Text('بوابة ولي الأمر', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800))),
                            IconButton(onPressed: _linkStudent, tooltip: 'ربط طالب', icon: const Icon(Icons.link, color: Colors.white70)),
                            IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh, color: Colors.white70)),
                          ]),
                          const SizedBox(height: 22),
                          if (_children.isEmpty)
                            Column(children: [
                              _EmptyState(message: _error ?? 'لا توجد ملفات طلاب مرتبطة بهذا الحساب بعد.'),
                              const SizedBox(height: 12),
                              FilledButton.icon(onPressed: _linkStudent, icon: const Icon(Icons.link), label: const Text('إدخال رمز الطالب')),
                            ])
                          else ...[
                            DropdownButtonFormField<String>(
                              value: _selectedId,
                              dropdownColor: AppColors.cardDark,
                              decoration: InputDecoration(labelText: 'ملف الطالب', labelStyle: const TextStyle(color: Colors.white60), filled: true, fillColor: AppColors.cardDark, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.borderDark))),
                              style: const TextStyle(color: Colors.white),
                              items: _children.map((item) => DropdownMenuItem<String>(value: item['id'].toString(), child: Text(item['name']?.toString() ?? item['email']?.toString() ?? '', overflow: TextOverflow.ellipsis))).toList(),
                              onChanged: (value) => setState(() => _selectedId = value),
                            ),
                            const SizedBox(height: 8),
                            OutlinedButton.icon(
                              onPressed: selectedStudentId == null
                                  ? null
                                  : () => context.go(RouteNames.parentSurvey.replaceFirst(':studentId', Uri.encodeComponent(selectedStudentId))),
                              icon: const Icon(Icons.assignment_outlined),
                              label: const Text('استبيان ولي الأمر'),
                            ),
                            const SizedBox(height: 14),
                            Text(child?['className']?.toString() ?? 'لا يوجد فصل مسجل', style: const TextStyle(color: Colors.white54, fontSize: 12)),
                            const SizedBox(height: 12),
                            GridView.count(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              crossAxisCount: 2,
                              mainAxisSpacing: 9,
                              crossAxisSpacing: 9,
                              childAspectRatio: 1.6,
                              children: [
                                _Metric(label: 'متوسط الدرجات', value: _percent(child?['averageGrade']), icon: Icons.grade_outlined),
                                _Metric(label: 'الحضور المسجل', value: _percent(child?['attendanceRate']), icon: Icons.event_available_outlined),
                                _Metric(label: 'سجلات الدرجات', value: '${child?['gradeRecordCount'] ?? '—'}', icon: Icons.assignment_turned_in_outlined),
                                _Metric(label: 'واجبات قادمة', value: '${assignments.length}', icon: Icons.assignment_outlined),
                              ],
                            ),
                            const SizedBox(height: 20),
                            const _SectionTitle('الحضور المسجل'),
                            if (attendance == null)
                              const _EmptyLine('لا توجد سجلات حضور حتى الآن.')
                            else
                              _DataLine(title: 'حاضر', value: '${attendance['present'] ?? '—'}', icon: Icons.check_circle_outline),
                            if (attendance != null) ...[
                              _DataLine(title: 'غائب', value: '${attendance['absent'] ?? '—'}', icon: Icons.cancel_outlined),
                              _DataLine(title: 'متأخر', value: '${attendance['late'] ?? '—'}', icon: Icons.schedule_outlined),
                              _DataLine(title: 'بعذر', value: '${attendance['excused'] ?? '—'}', icon: Icons.event_busy_outlined),
                            ],
                            const SizedBox(height: 20),
                            const _SectionTitle('آخر الدرجات المسجلة'),
                            if (grades.isEmpty)
                              const _EmptyLine('لا توجد درجات مسجلة بعد.')
                            else
                              ...grades.map((item) {
                                final grade = Map<String, dynamic>.from(item as Map);
                                return _DataLine(
                                  title: grade['subject']?.toString() ?? '',
                                  value: '${grade['recordedScore'] ?? '—'} / ${grade['recordedMaximum'] ?? '—'}',
                                  icon: Icons.menu_book_outlined,
                                );
                              }),
                            const SizedBox(height: 20),
                            const _SectionTitle('الواجبات القادمة'),
                            if (assignments.isEmpty)
                              const _EmptyLine('لا توجد واجبات قادمة مسجلة.')
                            else
                              ...assignments.map((item) {
                                final assignment = Map<String, dynamic>.from(item as Map);
                                return _DataLine(
                                  title: assignment['title']?.toString() ?? '',
                                  value: assignment['submitted'] == true ? 'تم التسليم' : 'لم يتم التسليم',
                                  icon: Icons.assignment_outlined,
                                );
                              }),
                          ],
                        ],
                      ),
          ),
        ),
      ),
    );
  }

  static String _percent(dynamic value) => value is num ? '${value.toStringAsFixed(1)}%' : '—';
}

class _Metric extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _Metric({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(13), border: Border.all(color: AppColors.borderDark)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Icon(icon, color: const Color(0xFF34D399), size: 19),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white60, fontSize: 11)),
        ]),
      );
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 7), child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)));
}

class _DataLine extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  const _DataLine({required this.title, required this.value, required this.icon});
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 7),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(11), border: Border.all(color: AppColors.borderDark)),
        child: Row(children: [Icon(icon, size: 18, color: const Color(0xFF34D399)), const SizedBox(width: 9), Expanded(child: Text(title, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600))), Text(value, style: const TextStyle(color: Colors.white70, fontSize: 11))]),
      );
}

class _EmptyLine extends StatelessWidget {
  final String text;
  const _EmptyLine(this.text);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text(text, style: const TextStyle(color: Colors.white54, fontSize: 13)));
}

class _EmptyState extends StatelessWidget {
  final String message;
  const _EmptyState({required this.message});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(top: 130), child: Center(child: Column(children: [const Icon(Icons.people_outline, size: 40, color: Colors.white38), const SizedBox(height: 14), Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70, height: 1.6))])));
}
