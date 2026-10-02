import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/api_service.dart';

class SubjectsScreen extends StatefulWidget {
  const SubjectsScreen({super.key});

  @override
  State<SubjectsScreen> createState() => _SubjectsScreenState();
}

class _SubjectsScreenState extends State<SubjectsScreen> {
  List<Map<String, dynamic>> _subjects = [];
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
      final response = await ApiService.instance.get('/subjects/my');
      final records = (response.data as List<dynamic>)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      if (mounted) setState(() => _subjects = records);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل المواد المرتبطة بتسجيلك.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('المواد الدراسية'), actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh))]),
      body: _loading && _subjects.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _subjects.isEmpty
              ? _EmptyState(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _subjects.isEmpty
                      ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: const [SizedBox(height: 240), Center(child: Text('لا توجد مواد مرتبطة بفصلك حتى الآن.'))])
                      : ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(16),
                          itemCount: _subjects.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 9),
                          itemBuilder: (context, index) {
                            final subject = _subjects[index];
                            final counts = subject['_count'] as Map<String, dynamic>? ?? {};
                            final teacher = subject['teacher'] as Map<String, dynamic>?;
                            return Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border.withOpacity(0.5))),
                              child: Row(children: [
                                const Icon(Icons.menu_book_outlined, color: AppColors.primary, size: 24),
                                const SizedBox(width: 13),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(subject['name']?.toString() ?? 'مادة غير محددة', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                                  const SizedBox(height: 5),
                                  Text(teacher?['name']?.toString() ?? 'لا يوجد معلم مرتبط', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                  if (subject['className'] != null) Text(subject['className'].toString(), style: TextStyle(fontSize: 11, color: AppColors.textHint)),
                                ])),
                                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                  Text('${counts['lessons'] ?? '—'}', style: const TextStyle(fontWeight: FontWeight.w800)),
                                  Text('دروس مسجلة', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                                  const SizedBox(height: 4),
                                  Text('${counts['assignments'] ?? '—'} واجب', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                                ]),
                              ]),
                            );
                          },
                        ),
                ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _EmptyState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center), TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))])));
}
