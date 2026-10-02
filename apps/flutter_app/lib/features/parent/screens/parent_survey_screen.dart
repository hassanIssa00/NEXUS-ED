import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/routing/route_names.dart';
import '../../../../services/api_service.dart';

const _surveySections = <_SurveySection>[
  _SurveySection('صحة الطالب وعاداته', [
    _SurveyQuestion('q1', 'ما عمر الطالب الحالي؟', ['أقل من 6 سنوات', '6 إلى 10 سنوات', '11 إلى 15 سنة', 'أكثر من 15 سنة']),
    _SurveyQuestion('q2', 'هل توجد حالة صحية أو حساسية تحتاج المدرسة إلى معرفتها؟', ['لا توجد', 'حساسية طعام', 'حالة صحية تحتاج متابعة']),
    _SurveyQuestion('q3', 'كم ساعة ينام الطالب في المتوسط؟', ['9 إلى 10 ساعات', '7 إلى 8 ساعات', 'أقل من 7 ساعات']),
    _SurveyQuestion('q4', 'ما متوسط الوقت اليومي أمام الشاشات؟', ['أقل من ساعة', 'ساعة إلى ساعتين', 'أكثر من ساعتين']),
  ]),
  _SurveySection('التواصل والقراءة', [
    _SurveyQuestion('q5', 'كيف يعبّر الطالب عن نفسه؟', ['بطلاقة', 'يحتاج إلى تشجيع', 'يواجه صعوبة أحياناً']),
    _SurveyQuestion('q6', 'ما مدى اهتمامه بالقصص والكتب؟', ['اهتمام كبير', 'اهتمام متوسط', 'يفضل أنشطة أخرى']),
    _SurveyQuestion('q7', 'هل توجد صعوبات في نطق بعض الحروف؟', ['لا توجد', 'أحياناً', 'توجد صعوبة ملحوظة']),
  ]),
  _SurveySection('التفاعل والتعلّم', [
    _SurveyQuestion('q8', 'كيف يتعامل الطالب مع زملائه الجدد؟', ['يندمج بسهولة', 'يحتاج وقتاً للاندماج', 'يفضل الأنشطة الفردية']),
    _SurveyQuestion('q9', 'كيف يستجيب للتوجيهات؟', ['بمرونة غالباً', 'يحتاج إلى تذكير', 'يحتاج إلى متابعة إضافية']),
    _SurveyQuestion('q10', 'كيف ينتظر دوره في الأنشطة الجماعية؟', ['بهدوء', 'يحتاج تذكيراً بسيطاً', 'يجد صعوبة في الانتظار']),
    _SurveyQuestion('q11', 'كيف يركز في نشاط تعليمي قصير؟', ['يركز باستمرار', 'يتشتت أحياناً', 'يحتاج فواصل حركة']),
    _SurveyQuestion('q12', 'كيف يتعامل مع مسألة أو نشاط صعب؟', ['يحاول مرة أخرى', 'يطلب المساعدة', 'ينزعج ويحتاج تشجيعاً']),
    _SurveyQuestion('q13', 'كيف يلتزم بالروتين المنزلي؟', ['ملتزم غالباً', 'يحتاج تذكيراً', 'يحتاج متابعة مستمرة']),
  ]),
  _SurveySection('الشراكة الأسرية', [
    _SurveyQuestion('q14', 'من يتابع واجبات الطالب في المنزل غالباً؟', ['الأب والأم معاً', 'الأم غالباً', 'الأب غالباً', 'شخص آخر']),
    _SurveyQuestion('q15', 'ما الهدف الأهم للأسرة هذا الفصل؟', ['التحصيل الدراسي', 'بناء الشخصية والثقة', 'تنمية المهارات الأساسية', 'جميع ما سبق']),
  ]),
];

class ParentSurveyScreen extends StatefulWidget {
  final String studentId;
  const ParentSurveyScreen({super.key, required this.studentId});

  @override
  State<ParentSurveyScreen> createState() => _ParentSurveyScreenState();
}

class _ParentSurveyScreenState extends State<ParentSurveyScreen> {
  final Map<String, String> _answers = {};
  int _sectionIndex = 0;
  bool _consent = false;
  bool _saving = false;
  bool _submitted = false;
  String? _error;

  bool get _sectionComplete => _surveySections[_sectionIndex].questions.every((question) => _answers.containsKey(question.id));

  Future<void> _next() async {
    setState(() => _error = null);
    if (!_sectionComplete) {
      setState(() => _error = 'أجب عن أسئلة هذا المحور للمتابعة.');
      return;
    }
    if (_sectionIndex < _surveySections.length - 1) {
      setState(() => _sectionIndex++);
      return;
    }
    if (!_consent) {
      setState(() => _error = 'يلزم تأكيد الموافقة قبل حفظ الإجابات.');
      return;
    }

    if (widget.studentId.isEmpty) {
      setState(() => _error = 'معرّف ملف الطالب غير متاح. ارجع إلى بوابة ولي الأمر وأعد فتح الاستبيان.');
      return;
    }

    setState(() => _saving = true);
    try {
      await ApiService.instance.post('/users/parent-survey', data: {
        'studentId': widget.studentId,
        'answers': _answers,
        'consent': true,
      });
      if (mounted) setState(() => _submitted = true);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر حفظ الاستبيان. لم يتم اعتماد الإجابات. حاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) {
      return Scaffold(
        appBar: AppBar(title: const Text('استبيان ولي الأمر')),
        body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.check_circle_outline, size: 52, color: AppColors.success),
          const SizedBox(height: 14),
          const Text('تم حفظ الاستبيان', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text('أُرسلت الإجابات إلى ملف الطالب المرتبط، ويمكن للمختصين المخولين مراجعتها.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 18),
          FilledButton(onPressed: () => context.go(RouteNames.parentDashboard), child: const Text('العودة إلى بوابة ولي الأمر')),
        ]))),
      );
    }

    final section = _surveySections[_sectionIndex];
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('استبيان ولي الأمر')),
        body: Column(children: [
          Padding(padding: const EdgeInsets.fromLTRB(20, 8, 20, 14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('معلومات تساعد المدرسة على متابعة الطالب، ولا تمثل تشخيصاً طبياً أو نفسياً.'),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: (_sectionIndex + 1) / _surveySections.length, color: AppColors.primary),
            const SizedBox(height: 7),
            Text('المحور ${_sectionIndex + 1} من ${_surveySections.length}: ${section.title}', style: const TextStyle(fontWeight: FontWeight.w700)),
          ])),
          Expanded(child: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 12), children: [
            for (final question in section.questions) ...[
              Padding(padding: const EdgeInsets.only(top: 10, bottom: 4), child: Text(question.text, style: const TextStyle(fontWeight: FontWeight.w800))),
              for (final option in question.options)
                RadioListTile<String>(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(option, style: const TextStyle(fontSize: 13)),
                  value: option,
                  groupValue: _answers[question.id],
                  onChanged: (value) { if (value != null) setState(() => _answers[question.id] = value); },
                ),
            ],
            if (_sectionIndex == _surveySections.length - 1)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                value: _consent,
                onChanged: (value) => setState(() => _consent = value ?? false),
                title: const Text('أوافق على مشاركة هذه الإجابات مع المختصين المخولين بالمدرسة لأغراض دعم الطالب ومتابعته.', style: TextStyle(fontSize: 13)),
              ),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: AppColors.error))),
          ])),
          SafeArea(top: false, child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
            OutlinedButton(onPressed: _saving || _sectionIndex == 0 ? null : () => setState(() { _sectionIndex--; _error = null; }), child: const Text('السابق')),
            const SizedBox(width: 10),
            Expanded(child: FilledButton.icon(
              onPressed: _saving ? null : _next,
              icon: _saving ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.arrow_forward),
              label: Text(_saving ? 'جارٍ الحفظ...' : _sectionIndex == _surveySections.length - 1 ? 'حفظ الاستبيان' : 'المحور التالي'),
            )),
          ]))),
        ]),
      ),
    );
  }
}

class _SurveySection {
  final String title;
  final List<_SurveyQuestion> questions;
  const _SurveySection(this.title, this.questions);
}

class _SurveyQuestion {
  final String id;
  final String text;
  final List<String> options;
  const _SurveyQuestion(this.id, this.text, this.options);
}
