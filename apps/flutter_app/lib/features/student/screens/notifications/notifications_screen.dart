import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _notifications = [];
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
      final response = await ApiService.instance.get('/notifications');
      final records = (response.data as List<dynamic>)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      if (mounted) setState(() => _notifications = records);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل الإشعارات من النظام.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ApiService.instance.post('/notifications/read-all');
      if (mounted) setState(() => _notifications = _notifications.map((item) => {...item, 'isRead': true}).toList());
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر تحديث الإشعارات.')));
    }
  }

  Future<void> _markRead(int index) async {
    final item = _notifications[index];
    if (item['isRead'] == true) return;
    final id = item['id']?.toString();
    if (id == null || id.isEmpty) return;
    try {
      await ApiService.instance.post('/notifications/$id/read');
      if (mounted) setState(() => _notifications[index] = {...item, 'isRead': true});
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر تحديث حالة الإشعار.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((item) => item['isRead'] != true).length;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDark,
        appBar: AppBar(
          title: const Text('الإشعارات'),
          backgroundColor: AppColors.backgroundDark,
          foregroundColor: Colors.white,
          actions: [
            IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh)),
            TextButton(onPressed: unreadCount == 0 ? null : _markAllRead, child: const Text('قراءة الكل')),
          ],
        ),
        body: _loading && _notifications.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : _error != null && _notifications.isEmpty
                ? _LoadError(message: _error!, onRetry: _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: _notifications.isEmpty
                        ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: const [SizedBox(height: 220), Center(child: Text('لا توجد إشعارات مسجلة.'))])
                        : ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
                            itemCount: _notifications.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final item = _notifications[index];
                              final read = item['isRead'] == true;
                              final color = _typeColor(item['type']?.toString());
                              return Material(
                                color: read ? AppColors.cardDark : color.withOpacity(0.09),
                                borderRadius: BorderRadius.circular(12),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(12),
                                  onTap: () => _markRead(index),
                                  child: Container(
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: read ? AppColors.borderDark : color.withOpacity(0.24))),
                                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                      Icon(_typeIcon(item['type']?.toString()), color: color, size: 22),
                                      const SizedBox(width: 11),
                                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                        Text(item['title']?.toString() ?? 'إشعار', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.white)),
                                        const SizedBox(height: 4),
                                        Text(item['body']?.toString() ?? '', style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.68), height: 1.45)),
                                        const SizedBox(height: 6),
                                        Text(_date(item['createdAt']), style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.42))),
                                      ])),
                                      if (!read) Container(width: 8, height: 8, margin: const EdgeInsets.only(top: 4), decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                                    ]),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
      ),
    );
  }

  static Color _typeColor(String? type) {
    switch (type?.toUpperCase()) {
      case 'WARNING': return AppColors.warning;
      case 'GRADE': return AppColors.primary;
      case 'REMINDER': return AppColors.info;
      case 'SUCCESS': return AppColors.success;
      default: return AppColors.textHint;
    }
  }

  static IconData _typeIcon(String? type) {
    switch (type?.toUpperCase()) {
      case 'WARNING': return Icons.warning_amber_outlined;
      case 'GRADE': return Icons.grade_outlined;
      case 'REMINDER': return Icons.event_outlined;
      case 'SUCCESS': return Icons.check_circle_outline;
      default: return Icons.notifications_none;
    }
  }

  static String _date(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '');
    if (date == null) return 'وقت غير محدد';
    return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}  ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _LoadError({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center), TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))])));
}
