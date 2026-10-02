import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routing/route_names.dart';
import '../../../services/api_service.dart';

class StudentProfileSetupScreen extends StatefulWidget {
  const StudentProfileSetupScreen({super.key});

  @override
  State<StudentProfileSetupScreen> createState() => _StudentProfileSetupScreenState();
}

class _StudentProfileSetupScreenState extends State<StudentProfileSetupScreen> {
  int? _gradeLevel;
  DateTime? _dateOfBirth;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  static const _grades = <(int, String)>[
    (0, 'رياض الأطفال / التمهيدي'),
    (1, 'الصف الأول الابتدائي'),
    (2, 'الصف الثاني الابتدائي'),
    (3, 'الصف الثالث الابتدائي'),
    (4, 'الصف الرابع الابتدائي'),
    (5, 'الصف الخامس الابتدائي'),
    (6, 'الصف السادس الابتدائي'),
    (7, 'الصف الأول المتوسط'),
    (8, 'الصف الثاني المتوسط'),
    (9, 'الصف الثالث المتوسط'),
    (10, 'الصف الأول الثانوي'),
    (11, 'الصف الثاني الثانوي'),
    (12, 'الصف الثالث الثانوي'),
  ];

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final response = await ApiService.instance.get('/users/me/student-profile');
      final profile = response.data;
      if (profile is Map && mounted) {
        setState(() {
          _gradeLevel = (profile['gradeLevel'] as num?)?.toInt();
          _dateOfBirth = DateTime.tryParse(profile['dateOfBirth']?.toString() ?? '');
        });
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل ملف الطالب الحالي. يمكنك المحاولة أو المتابعة بإدخال البيانات.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _chooseDate() async {
    final today = DateTime.now();
    final selected = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(today.year - 10),
      firstDate: DateTime(today.year - 25),
      lastDate: today,
      helpText: 'اختر تاريخ الميلاد',
    );
    if (selected != null && mounted) setState(() => _dateOfBirth = selected);
  }

  Future<void> _save() async {
    final gradeLevel = _gradeLevel;
    if (gradeLevel == null) {
      setState(() => _error = 'اختر الصف الدراسي للمتابعة.');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await ApiService.instance.put('/users/me/student-profile', data: {
        'gradeLevel': gradeLevel,
        if (_dateOfBirth != null) 'dateOfBirth': _dateOfBirth!.toUtc().toIso8601String(),
      });
      String? code;
      DateTime? expiresAt;
      try {
        final response = await ApiService.instance.post('/users/student-link-code');
        final payload = Map<String, dynamic>.from(response.data as Map);
        code = payload['code']?.toString();
        expiresAt = DateTime.tryParse(payload['expiresAt']?.toString() ?? '');
      } catch (_) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم حفظ الملف، لكن تعذر إصدار الرمز الآن. يمكنك إصداره من لوحة الطالب.')));
      }
      if (!mounted) return;
      if (code != null && code.isNotEmpty) await _showCode(code, expiresAt);
      if (mounted) context.go(RouteNames.studentAssessment);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر حفظ الملف الدراسي. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showCode(String code, DateTime? expiresAt) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('رمز ربط ولي الأمر'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('شارك الرمز مع ولي أمرك فقط. يستخدم مرة واحدة وينتهي بعد 7 أيام.'),
          const SizedBox(height: 16),
          SelectableText(code, textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 2)),
          if (expiresAt != null) Text('ينتهي في ${_formatDate(expiresAt)}', textAlign: TextAlign.center),
        ]),
        actions: [
          TextButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: code));
              if (dialogContext.mounted) Navigator.pop(dialogContext);
            },
            icon: const Icon(Icons.copy),
            label: const Text('نسخ الرمز'),
          ),
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('متابعة')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('الملف الدراسي')),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(padding: const EdgeInsets.all(20), children: [
                const Icon(Icons.school_outlined, size: 42, color: AppColors.primary),
                const SizedBox(height: 10),
                const Text('بيانات الطالب', textAlign: TextAlign.center, style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Text('تُحفظ بيانات الصف في ملفك المدرسي، ويستخدمها النظام لعرض المعلومات التعليمية المناسبة.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
                const SizedBox(height: 24),
                DropdownButtonFormField<int>(
                  value: _gradeLevel,
                  decoration: const InputDecoration(labelText: 'الصف الدراسي', border: OutlineInputBorder()),
                  items: _grades.map((grade) => DropdownMenuItem(value: grade.$1, child: Text(grade.$2))).toList(),
                  onChanged: (value) => setState(() => _gradeLevel = value),
                ),
                const SizedBox(height: 14),
                OutlinedButton.icon(
                  onPressed: _chooseDate,
                  icon: const Icon(Icons.calendar_month_outlined),
                  label: Text(_dateOfBirth == null ? 'تاريخ الميلاد (اختياري)' : _formatDate(_dateOfBirth!)),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 14),
                  Text(_error!, style: const TextStyle(color: AppColors.error)),
                ],
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  icon: _saving ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save_outlined),
                  label: Text(_saving ? 'جارٍ الحفظ...' : 'حفظ وإصدار رمز ولي الأمر'),
                ),
              ]),
      ),
    );
  }

  static String _formatDate(DateTime value) => '${value.year}/${value.month.toString().padLeft(2, '0')}/${value.day.toString().padLeft(2, '0')}';
}
