import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../../services/api_service.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  List<Map<String, dynamic>> _conversations = [];
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
      final response = await ApiService.instance.get('/messages/conversations');
      final records = (response.data as List<dynamic>)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      if (mounted) setState(() => _conversations = records);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل المحادثات المرتبطة بحسابك.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(authProvider).user?.id;
    return Scaffold(
      appBar: AppBar(title: const Text('الرسائل'), actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh))]),
      body: _loading && _conversations.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _conversations.isEmpty
              ? _LoadError(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _conversations.isEmpty
                      ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: const [SizedBox(height: 220), Center(child: Text('لا توجد محادثات مسجلة لحسابك.'))])
                      : ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(14),
                          itemCount: _conversations.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final item = _conversations[index];
                            final participants = item['participants'] as List<dynamic>? ?? const [];
                            final otherParticipants = participants.map((value) => Map<String, dynamic>.from(value as Map))
                                .where((participant) => participant['userId']?.toString() != userId)
                                .map((participant) => participant['user'] as Map<String, dynamic>? ?? {})
                                .toList();
                            final latestMessages = item['messages'] as List<dynamic>? ?? const [];
                            final other = otherParticipants.isEmpty ? null : otherParticipants.first;
                            final latest = latestMessages.isEmpty ? null : Map<String, dynamic>.from(latestMessages.first as Map);
                            final title = other?['name']?.toString() ?? other?['email']?.toString() ?? 'محادثة';
                            final preview = latest?['content']?.toString() ?? 'لا توجد رسائل بعد';
                            return Card(
                              margin: EdgeInsets.zero,
                              child: ListTile(
                                leading: const CircleAvatar(child: Icon(Icons.person_outline)),
                                title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
                                subtitle: Text(preview, maxLines: 1, overflow: TextOverflow.ellipsis),
                                trailing: const Icon(Icons.chevron_left),
                                onTap: () async {
                                  await showModalBottomSheet<void>(
                                    context: context,
                                    isScrollControlled: true,
                                    useSafeArea: true,
                                    builder: (_) => _ConversationSheet(conversationId: item['id'].toString(), currentUserId: userId ?? ''),
                                  );
                                  if (mounted) _load();
                                },
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

class _ConversationSheet extends StatefulWidget {
  final String conversationId;
  final String currentUserId;
  const _ConversationSheet({required this.conversationId, required this.currentUserId});

  @override
  State<_ConversationSheet> createState() => _ConversationSheetState();
}

class _ConversationSheetState extends State<_ConversationSheet> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final response = await ApiService.instance.get('/messages/${widget.conversationId}');
      final records = (response.data as List<dynamic>)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      if (mounted) setState(() { _messages = records; _error = null; });
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تحميل الرسائل.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final content = _controller.text.trim();
    if (content.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await ApiService.instance.post('/messages/${widget.conversationId}/send', data: {'content': content});
      _controller.clear();
      await _loadMessages();
      if (_scrollController.hasClients) {
        await _scrollController.animateTo(_scrollController.position.maxScrollExtent, duration: const Duration(milliseconds: 180), curve: Curves.easeOut);
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر إرسال الرسالة.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.88,
        child: Column(children: [
          AppBar(title: const Text('المحادثة'), automaticallyImplyLeading: false, actions: [IconButton(onPressed: _loadMessages, tooltip: 'تحديث', icon: const Icon(Icons.refresh)), IconButton(onPressed: () => Navigator.pop(context), tooltip: 'إغلاق', icon: const Icon(Icons.close))]),
          if (_error != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 14), child: Text(_error!, style: const TextStyle(color: AppColors.error))),
          Expanded(child: _loading && _messages.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : _messages.isEmpty
                  ? const Center(child: Text('لا توجد رسائل في هذه المحادثة.'))
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(12),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final message = _messages[index];
                        final sender = message['sender'] as Map<String, dynamic>? ?? {};
                        final mine = sender['id']?.toString() == widget.currentUserId;
                        return Align(
                          alignment: mine ? AlignmentDirectional.centerStart : AlignmentDirectional.centerEnd,
                          child: Container(
                            constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.78),
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                            decoration: BoxDecoration(color: mine ? AppColors.primary.withOpacity(0.15) : AppColors.cardDark, borderRadius: BorderRadius.circular(12)),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(sender['name']?.toString() ?? (mine ? 'أنت' : 'مشارك'), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary)),
                              const SizedBox(height: 3),
                              Text(message['content']?.toString() ?? ''),
                              Text(_time(message['createdAt']), textAlign: TextAlign.left, style: const TextStyle(fontSize: 9, color: Colors.black45)),
                            ]),
                          ),
                        );
                      },
                    )),
          SafeArea(top: false, child: Padding(padding: const EdgeInsets.fromLTRB(12, 8, 12, 12), child: Row(children: [
            Expanded(child: TextField(controller: _controller, minLines: 1, maxLines: 4, textInputAction: TextInputAction.newline, decoration: const InputDecoration(hintText: 'اكتب رسالة', border: OutlineInputBorder()))),
            const SizedBox(width: 8),
            IconButton.filled(onPressed: _sending ? null : _send, tooltip: 'إرسال', icon: _sending ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send)),
          ]))),
        ]),
      );

  static String _time(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '');
    if (date == null) return '';
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _LoadError({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center), TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة'))])));
}
