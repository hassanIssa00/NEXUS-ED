import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routing/route_names.dart';
import '../../../services/api_service.dart';

class PlacementAssessmentScreen extends StatefulWidget {
  const PlacementAssessmentScreen({super.key});

  @override
  State<PlacementAssessmentScreen> createState() => _PlacementAssessmentScreenState();
}

class _PlacementAssessmentScreenState extends State<PlacementAssessmentScreen> {
  Map<String, dynamic>? _payload;
  Map<String, String> _answers = {};
  int _index = 0;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  List<dynamic> get _questions => (_payload?['assessment']?['questions'] as List?) ?? const [];
  Map<String, dynamic>? get _attempt => _payload?['attempt'] is Map
      ? Map<String, dynamic>.from(_payload!['attempt'] as Map)
      : null;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final response = await ApiService.instance.get('/assessments/placement/current');
      if (!mounted) return;
      setState(() => _payload = Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (error) {
      if (!mounted) return;
      final body = error.response?.data;
      final message = body is Map ? body['message'] : null;
      setState(() => _error = message is String ? message : 'تعذر تحميل الاختبار. تحقق من بيانات الطالب والاتصال.');
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل الاختبار. حاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if (_answers.length != _questions.length || _submitting) return;
    setState(() { _submitting = true; _error = null; });
    try {
      final response = await ApiService.instance.post(
        '/assessments/placement/submit',
        data: {'answers': _answers},
      );
      if (!mounted) return;
      setState(() => _payload = {...?_payload, 'attempt': Map<String, dynamic>.from(response.data as Map)});
    } on DioException catch (error) {
      if (!mounted) return;
      final body = error.response?.data;
      final message = body is Map ? body['message'] : null;
      setState(() => _error = message is String ? message : 'تعذر حفظ النتيجة. أعد المحاولة.');
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر حفظ النتيجة. أعد المحاولة.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('الاختبار التشخيصي')),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null && _payload == null
                ? _errorView()
                : _attempt != null
                    ? _resultView(_attempt!)
                    : _assessmentView(),
      ),
    );
  }

  Widget _errorView() => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 42, color: AppColors.error),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              Wrap(spacing: 8, children: [
                OutlinedButton(onPressed: _load, child: const Text('إعادة المحاولة')),
                FilledButton(onPressed: () => context.go(RouteNames.studentProfileSetup), child: const Text('ملف الطالب')),
              ]),
            ],
          ),
        ),
      );

  Widget _resultView(Map<String, dynamic> attempt) {
    final score = (attempt['score'] as num?)?.toDouble();
    final scoreText = score == null
        ? '--'
        : '${score.toStringAsFixed(score == score.roundToDouble() ? 0 : 2)}%';
    final correct = (attempt['correctCount'] as num?)?.toInt();
    final total = (attempt['questionCount'] as num?)?.toInt();
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle_outline, size: 48, color: AppColors.primary),
              const SizedBox(height: 12),
              Text('تم حفظ نتيجة ${_payload?['assessment']?['title'] ?? 'الاختبار'}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800)),
              const SizedBox(height: 18),
              Row(children: [
                Expanded(child: _resultMetric('الدرجة', scoreText)),
                const SizedBox(width: 12),
                Expanded(child: _resultMetric('الإجابات الصحيحة', correct == null || total == null ? '--' : '$correct / $total')),
              ]),
              const SizedBox(height: 16),
              const Text('هذه نتيجة تشخيصية للاسترشاد، ولا تغيّر الصف الدراسي أو تمثل قرار قبول.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, height: 1.5)),
              const SizedBox(height: 20),
              FilledButton.icon(onPressed: () => context.go(RouteNames.studentDashboard), icon: const Icon(Icons.dashboard_outlined), label: const Text('العودة للوحة الطالب')),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resultMetric(String label, String value) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(8)),
        child: Column(children: [Text(label, style: const TextStyle(color: AppColors.textSecondary)), const SizedBox(height: 6), Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800))]),
      );

  Widget _assessmentView() {
    final assessment = Map<String, dynamic>.from(_payload?['assessment'] as Map? ?? const {});
    final question = _questions.isEmpty ? null : Map<String, dynamic>.from(_questions[_index] as Map);
    final questionId = question?['id']?.toString();
    final options = (question?['options'] as List?)?.map((value) => value.toString()).toList() ?? const <String>[];
    final selected = questionId == null ? null : _answers[questionId];
    final gradeOne = _payload?['foundationalForGradeOne'] == true;

    if (question == null) {
      return const Center(child: Text('لا توجد أسئلة متاحة لهذا الصف.'));
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(assessment['title']?.toString() ?? 'اختبار تحديد المستوى', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
        const SizedBox(height: 6),
        Text(assessment['subtitle']?.toString() ?? '', style: const TextStyle(color: AppColors.textSecondary, height: 1.5)),
        if (gradeOne) ...[
          const SizedBox(height: 12),
          const Text('اختبار تأسيسي اختياري؛ الاختبار المخصص للصف الأول يتضمن مراجعة يدوية من المدرسة.', style: TextStyle(color: AppColors.textSecondary, height: 1.5)),
        ],
        const SizedBox(height: 12),
        Text('السؤال ${_index + 1} من ${_questions.length}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary)),
        const SizedBox(height: 8),
        LinearProgressIndicator(value: (_index + 1) / _questions.length, color: AppColors.primary),
        const SizedBox(height: 12),
        if (question['categoryLabel'] != null) Text(question['categoryLabel'].toString(), style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary)),
        const SizedBox(height: 8),
        Text(question['prompt']?.toString() ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, height: 1.5)),
        const SizedBox(height: 16),
        ...options.map((option) => RadioListTile<String>(
              value: option,
              groupValue: selected,
              title: Text(option, style: const TextStyle(height: 1.4)),
              activeColor: AppColors.primary,
              contentPadding: const EdgeInsets.symmetric(horizontal: 8),
              onChanged: questionId == null ? null : (value) => setState(() => _answers[questionId] = value!),
            )),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: AppColors.error)),
        ],
        const SizedBox(height: 16),
        Row(children: [
          if (_index > 0) OutlinedButton.icon(onPressed: () => setState(() => _index--), icon: const Icon(Icons.arrow_forward), label: const Text('السابق')),
          const Spacer(),
          if (_index < _questions.length - 1)
            FilledButton.icon(onPressed: selected == null ? null : () => setState(() => _index++), icon: const Icon(Icons.arrow_back), label: const Text('التالي'))
          else
            FilledButton.icon(onPressed: selected == null || _answers.length != _questions.length || _submitting ? null : _submit, icon: _submitting ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.check), label: Text(_submitting ? 'جارٍ الحفظ...' : 'إنهاء وحفظ النتيجة')),
        ]),
      ],
    );
  }
}
