import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../features/auth/providers/auth_provider.dart';
import '../../../../services/api_service.dart';

class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  List<Map<String, dynamic>> _entries = [];
  Map<String, dynamic>? _rank;
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
      final responses = await Future.wait([
        ApiService.instance.get('/gamification/leaderboard', queryParameters: {'limit': 100}),
        ApiService.instance.get('/gamification/rank'),
      ]);
      final entries = (responses[0].data as List<dynamic>)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      final rank = Map<String, dynamic>.from(responses[1].data as Map);
      if (mounted) setState(() { _entries = entries; _rank = rank; });
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل ترتيب المدرسة.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(authProvider).user?.id;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDark,
        appBar: AppBar(title: const Text('ترتيب المدرسة'), backgroundColor: AppColors.backgroundDark, foregroundColor: Colors.white, actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh))]),
        body: _loading && _entries.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : _error != null && _entries.isEmpty
                ? _LoadError(message: _error!, onRetry: _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (_rank != null)
                          Container(
                            padding: const EdgeInsets.all(17),
                            decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(14)),
                            child: Row(children: [
                              const Icon(Icons.emoji_events_outlined, color: Colors.white, size: 30),
                              const SizedBox(width: 12),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                const Text('ترتيبك في المدرسة', style: TextStyle(color: Colors.white70, fontSize: 12)),
                                Text((_rank?['rank'] ?? '—').toString() == '0' ? 'لا يوجد ترتيب مسجل بعد' : '#${_rank?['rank'] ?? '—'}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22)),
                              ])),
                              Text('${_rank?['points'] ?? '—'} XP', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                            ]),
                          ),
                        const SizedBox(height: 16),
                        const Text('الطلاب الأعلى نقاطًا', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 9),
                        if (_entries.isEmpty)
                          const Padding(padding: EdgeInsets.symmetric(vertical: 22), child: Text('لا توجد نقاط مسجلة في المدرسة بعد.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white70)))
                        else
                          ..._entries.map((entry) {
                            final isMe = entry['userId'] == userId;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 7),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(color: isMe ? const Color(0xFF0D5D4B) : AppColors.cardDark, borderRadius: BorderRadius.circular(11), border: Border.all(color: isMe ? const Color(0xFF34D399) : AppColors.borderDark)),
                              child: Row(children: [
                                SizedBox(width: 34, child: Text('#${entry['rank'] ?? '—'}', style: const TextStyle(color: Color(0xFF6EE7B7), fontWeight: FontWeight.w900))),
                                Expanded(child: Text(entry['name']?.toString() ?? 'طالب', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
                                Text('المستوى ${entry['level'] ?? '—'}', style: const TextStyle(color: Colors.white54, fontSize: 11)),
                                const SizedBox(width: 10),
                                Text('${entry['points'] ?? '—'} XP', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                              ]),
                            );
                          }),
                      ],
                    ),
                  ),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _LoadError({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)), TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))])));
}
