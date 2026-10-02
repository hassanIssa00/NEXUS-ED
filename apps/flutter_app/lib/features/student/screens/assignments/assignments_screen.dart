import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/api_service.dart';

class AssignmentsScreen extends StatefulWidget {
  const AssignmentsScreen({super.key});

  @override
  State<AssignmentsScreen> createState() => _AssignmentsScreenState();
}

class _AssignmentsScreenState extends State<AssignmentsScreen> {
  List<Map<String, dynamic>> _assignments = [];
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
      final response = await ApiService.instance.get('/assignments/student');
      final data = (response.data as List<dynamic>)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      if (mounted) setState(() => _assignments = data);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل الواجبات المسجلة لحسابك.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _submitted(Map<String, dynamic> item) =>
      item['submission'] != null || const {'submitted', 'graded'}.contains(item['status']);

  bool _late(Map<String, dynamic> item) {
    if (_submitted(item)) return false;
    final dueDate = DateTime.tryParse(item['dueDate']?.toString() ?? '');
    return dueDate != null && dueDate.isBefore(DateTime.now());
  }

  List<Map<String, dynamic>> _forTab(int index) => _assignments.where((item) {
        if (index == 0) return !_submitted(item) && !_late(item);
        if (index == 1) return _submitted(item);
        return _late(item);
      }).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الواجبات'),
        actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh))],
      ),
      body: DefaultTabController(
        length: 3,
        child: Column(
          children: [
            const TabBar(tabs: [Tab(text: 'الحالية'), Tab(text: 'المسلمة'), Tab(text: 'المتأخرة')]),
            Expanded(
              child: _loading && _assignments.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null && _assignments.isEmpty
                      ? _StateMessage(message: _error!, onRetry: _load)
                      : TabBarView(children: List.generate(3, _assignmentList)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _assignmentList(int tabIndex) {
    final records = _forTab(tabIndex);
    if (records.isEmpty) {
      return Center(child: Text('لا توجد واجبات مسجلة في هذا التصنيف.', style: TextStyle(color: AppColors.textSecondary)));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: records.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = records[index];
          final submitted = _submitted(item);
          final late = _late(item);
          final status = submitted ? (item['status'] == 'graded' ? 'تم التصحيح' : 'تم التسليم') : (late ? 'متأخر' : 'مفتوح');
          final color = submitted ? AppColors.success : (late ? AppColors.error : AppColors.info);
          final due = DateTime.tryParse(item['dueDate']?.toString() ?? '');
          final submission = item['submission'] as Map<String, dynamic>?;
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border.withOpacity(0.5)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(item['title']?.toString() ?? 'واجب', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
                Text(status, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
              ]),
              const SizedBox(height: 7),
              Text((item['subject'] as Map?)?['name']?.toString() ?? 'مادة غير محددة', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
              const SizedBox(height: 7),
              Text(due == null ? 'موعد التسليم غير محدد' : 'موعد التسليم: ${_formatDate(due)}', style: TextStyle(fontSize: 12, color: AppColors.textHint)),
              if (submission?['grade'] != null || submission?['score'] != null) ...[
                const SizedBox(height: 6),
                Text('الدرجة المسجلة: ${submission?['grade'] ?? submission?['score']}', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w700)),
              ],
            ]),
          );
        },
      ),
    );
  }

  String _formatDate(DateTime value) => '${value.year}/${value.month.toString().padLeft(2, '0')}/${value.day.toString().padLeft(2, '0')}';
}

class _StateMessage extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _StateMessage({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة')),
          ]),
        ),
      );
}
