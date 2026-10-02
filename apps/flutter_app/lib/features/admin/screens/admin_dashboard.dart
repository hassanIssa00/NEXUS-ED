import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/api_service.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});
  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
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
      final response = await ApiService.instance.get('/dashboard/admin');
      if (mounted) setState(() => _data = Map<String, dynamic>.from(response.data as Map));
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل بيانات المدرسة. تحقق من صلاحية الحساب وحاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = _data?['admin'] as Map<String, dynamic>? ?? {};
    final kpis = _data?['kpis'] as Map<String, dynamic>? ?? {};
    final activity = (_data?['recentActivity'] as List<dynamic>? ?? const []);
    final metrics = [
      _MetricValue('الطلاب', '${kpis['totalStudents'] ?? '—'}', Icons.school_outlined),
      _MetricValue('المعلمون', '${kpis['totalTeachers'] ?? '—'}', Icons.person_outline),
      _MetricValue('الفصول', '${kpis['totalClasses'] ?? '—'}', Icons.groups_outlined),
      _MetricValue('المستخدمون النشطون', '${kpis['activeUsers'] ?? '—'}', Icons.verified_user_outlined),
      _MetricValue('المواد', '${kpis['totalSubjects'] ?? '—'}', Icons.menu_book_outlined),
      _MetricValue('الحضور المسجل', kpis['attendanceRate'] is num ? '${(kpis['attendanceRate'] as num).toStringAsFixed(1)}%' : '—', Icons.event_available_outlined),
    ];

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
                    ? ListView(padding: const EdgeInsets.all(24), children: [const SizedBox(height: 170), const Icon(Icons.cloud_off_outlined, color: Colors.white54, size: 40), const SizedBox(height: 12), Center(child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70))), Center(child: TextButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة')))])
                    : ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(18, 18, 18, 30),
                        children: [
                          Row(children: [
                            ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.asset('assets/images/logo.jpeg', width: 42, height: 42, fit: BoxFit.cover)),
                            const SizedBox(width: 10),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('إدارة المدرسة', style: TextStyle(color: Colors.white60, fontSize: 12)), Text(admin['name']?.toString() ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800))])),
                            IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh, color: Colors.white70)),
                          ]),
                          const SizedBox(height: 20),
                          _MetricGrid(items: metrics),
                          const SizedBox(height: 20),
                          const Text('آخر إجراءات مسجلة', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
                          const SizedBox(height: 8),
                          if (activity.isEmpty)
                            const Text('لا توجد إجراءات مسجلة بعد.', style: TextStyle(color: Colors.white54, fontSize: 13))
                          else
                            ...activity.map((item) {
                              final record = Map<String, dynamic>.from(item as Map);
                              final action = record['action']?.toString() ?? '';
                              final actor = record['actor']?.toString() ?? '';
                              final date = DateTime.tryParse(record['createdAt']?.toString() ?? '');
                              final dateText = date == null ? '' : '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
                              return _ActivityRow(action: action, actor: actor, date: dateText);
                            }),
                        ],
                      ),
          ),
        ),
      ),
    );
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
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 9, crossAxisSpacing: 9, childAspectRatio: 1.55),
        itemBuilder: (context, index) {
          final item = items[index];
          return Container(padding: const EdgeInsets.all(13), decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(13), border: Border.all(color: AppColors.borderDark)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Icon(item.icon, color: const Color(0xFF60A5FA), size: 19), Text(item.value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)), Text(item.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white60, fontSize: 11))]));
        },
      );
}

class _ActivityRow extends StatelessWidget {
  final String action;
  final String actor;
  final String date;
  const _ActivityRow({required this.action, required this.actor, required this.date});
  @override
  Widget build(BuildContext context) => Container(margin: const EdgeInsets.only(bottom: 7), padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(11), border: Border.all(color: AppColors.borderDark)), child: Row(children: [const Icon(Icons.history, color: Color(0xFF60A5FA), size: 18), const SizedBox(width: 9), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(action, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)), Text(actor, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white54, fontSize: 11))])), Text(date, style: const TextStyle(color: Colors.white54, fontSize: 10))]));
}
