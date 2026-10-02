import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/api_service.dart';

class GamesScreen extends StatefulWidget {
  const GamesScreen({super.key});

  @override
  State<GamesScreen> createState() => _GamesScreenState();
}

class _GamesScreenState extends State<GamesScreen> {
  List<Map<String, dynamic>> _games = [];
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
      final response = await ApiService.instance.get('/games');
      final payload = Map<String, dynamic>.from(response.data as Map);
      final records = (payload['data'] as List<dynamic>? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      if (mounted) setState(() => _games = records);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل الألعاب المنشورة.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(Map<String, dynamic> game) async {
    final rawUrl = game['url']?.toString();
    final uri = rawUrl == null ? null : Uri.tryParse(rawUrl);
    if (uri == null || !{'http', 'https'}.contains(uri.scheme) || uri.host.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('اللعبة غير متاحة للرابط الخارجي حاليًا.')));
      return;
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر فتح رابط اللعبة.')));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('الألعاب المنشورة'), actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh))]),
        body: _loading && _games.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : _error != null && _games.isEmpty
                ? _LoadError(message: _error!, onRetry: _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: _games.isEmpty
                        ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: const [SizedBox(height: 220), Center(child: Text('لم تنشر المدرسة ألعابًا تعليمية بعد.'))])
                        : ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(16),
                            itemCount: _games.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 9),
                            itemBuilder: (context, index) {
                              final game = _games[index];
                              final subject = game['subject'] as Map<String, dynamic>?;
                              final available = game['url']?.toString().isNotEmpty == true;
                              return Container(
                                padding: const EdgeInsets.all(15),
                                decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border.withOpacity(0.5))),
                                child: Row(children: [
                                  const Icon(Icons.sports_esports_outlined, color: AppColors.primary, size: 25),
                                  const SizedBox(width: 12),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(game['title']?.toString() ?? 'لعبة تعليمية', style: const TextStyle(fontWeight: FontWeight.w800)),
                                    if (game['description'] != null) Text(game['description'].toString(), maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                    if (subject?['name'] != null) Text(subject!['name'].toString(), style: TextStyle(fontSize: 11, color: AppColors.textHint)),
                                  ])),
                                  const SizedBox(width: 8),
                                  IconButton(onPressed: available ? () => _open(game) : null, tooltip: available ? 'فتح اللعبة' : 'غير متاحة', icon: const Icon(Icons.open_in_new)),
                                ]),
                              );
                            },
                          ),
                  ),
      );
}

class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _LoadError({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center), TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))])));
}
