import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/api_service.dart';

class MillionJourneyScreen extends StatefulWidget {
  const MillionJourneyScreen({super.key});

  @override
  State<MillionJourneyScreen> createState() => _MillionJourneyScreenState();
}

class _MillionJourneyScreenState extends State<MillionJourneyScreen> {
  List<Map<String, dynamic>> _milestones = [];
  Map<String, dynamic> _progress = {};
  List<Map<String, dynamic>> _badges = [];
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
      await ApiService.instance.post('/student/million-journey/check-unlocks');
      final responses = await Future.wait([
        ApiService.instance.get('/student/million-journey/milestones'),
        ApiService.instance.get('/student/million-journey/progress'),
        ApiService.instance.get('/student/million-journey/badges'),
      ]);
      final milestoneData = (responses[0].data['data'] as List<dynamic>? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map)).toList();
      final progressData = Map<String, dynamic>.from(responses[1].data['data'] as Map? ?? {});
      final badgeData = (responses[2].data['data'] as List<dynamic>? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map)).toList();
      if (mounted) {
        setState(() {
          _milestones = milestoneData;
          _progress = progressData;
          _badges = badgeData;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل نقاطك ومراحل الإنجاز المسجلة.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final points = (_progress['totalXP'] as num?)?.toInt();
    final level = (_progress['level'] as num?)?.toInt();
    final unlockedIds = ((_progress['unlockedMilestones'] as List<dynamic>? ?? const [])
        .map((item) => (item as Map)['milestoneId']?.toString())).toSet();
    final nextOptions = points == null
        ? <Map<String, dynamic>>[]
        : _milestones.where((item) {
            final threshold = item['xpRequired'];
            return !unlockedIds.contains(item['id']) && threshold is num && threshold > points;
          }).toList();
    final Map<String, dynamic>? nextMilestone = nextOptions.isEmpty ? null : nextOptions.first;
    final nextRequirement = (nextMilestone?['xpRequired'] as num?)?.toInt();
    final previousRequirement = _milestones
        .where((item) => unlockedIds.contains(item['id']))
        .map((item) => item['xpRequired'])
        .whereType<num>()
        .map((value) => value.toInt())
        .fold<int>(0, (maxValue, value) => value > maxValue ? value : maxValue);
    final progress = nextMilestone == null || nextRequirement == null || nextRequirement <= previousRequirement
        ? 1.0
        : ((points! - previousRequirement) / (nextRequirement - previousRequirement)).clamp(0.0, 1.0).toDouble();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDark,
        appBar: AppBar(title: const Text('نقاط ومراحل الإنجاز'), backgroundColor: AppColors.backgroundDark, foregroundColor: Colors.white, actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh))]),
        body: _loading && _progress.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : _error != null && _progress.isEmpty
                ? _LoadError(message: _error!, onRetry: _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(18),
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(15)),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            const Text('إجمالي نقاط الخبرة', style: TextStyle(color: Colors.white70, fontSize: 13)),
                            const SizedBox(height: 4),
                            Text('${points ?? '—'} XP', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
                            const SizedBox(height: 10),
                            Row(children: [
                              Expanded(child: Text('المستوى ${level ?? '—'}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
                              Text('${_badges.length} شارة مسجلة', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                            ]),
                            if (nextMilestone != null && nextRequirement != null) ...[
                              const SizedBox(height: 16),
                              Text('المرحلة التالية: ${nextMilestone['title'] ?? 'إنجاز'}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 7),
                              LinearProgressIndicator(value: progress, color: Colors.white, backgroundColor: Colors.white24),
                              const SizedBox(height: 5),
                              Text('المتبقي ${nextRequirement - points!} نقطة', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                            ],
                          ]),
                        ),
                        const SizedBox(height: 20),
                        const Text('مراحل الإنجاز المعتمدة', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 9),
                        if (_milestones.isEmpty)
                          const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Text('لم تُعدّ المدرسة مراحل إنجاز بعد.', style: TextStyle(color: Colors.white70)))
                        else
                          ..._milestones.map((milestone) {
                            final isUnlocked = unlockedIds.contains(milestone['id']);
                            final threshold = (milestone['xpRequired'] as num?)?.toInt();
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(11), border: Border.all(color: isUnlocked ? const Color(0xFF34D399) : AppColors.borderDark)),
                              child: Row(children: [
                                Icon(isUnlocked ? Icons.check_circle_outline : Icons.lock_outline, color: isUnlocked ? const Color(0xFF34D399) : Colors.white38),
                                const SizedBox(width: 11),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(milestone['title']?.toString() ?? 'مرحلة', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                                  if (milestone['description'] != null && milestone['description'].toString().isNotEmpty) Text(milestone['description'].toString(), style: const TextStyle(color: Colors.white60, fontSize: 12)),
                                ])),
                                const SizedBox(width: 8),
                                Text('${threshold ?? '—'} XP', style: TextStyle(color: isUnlocked ? const Color(0xFF6EE7B7) : Colors.white54, fontSize: 11, fontWeight: FontWeight.w700)),
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
