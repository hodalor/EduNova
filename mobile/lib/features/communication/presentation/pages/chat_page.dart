import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/socket_service.dart';
import '../providers/communication_provider.dart';

class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({super.key});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  static const _threadId = 'thread-1';
  final _controller = TextEditingController();
  StreamSubscription<Map<String, dynamic>>? _subscription;
  final List<Map<String, dynamic>> _realtimeMessages = [];

  @override
  void initState() {
    super.initState();
    Future<void>(() async {
      final socketService = ref.read(socketServiceProvider);
      await socketService.connect();
      _subscription = socketService.chatMessagesStream.listen((payload) {
        if (!mounted) {
          return;
        }
        setState(() {
          _realtimeMessages.add(payload);
        });
      });
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final body = _controller.text.trim();
    if (body.isEmpty) {
      return;
    }
    await ref.read(communicationRepositoryProvider).sendMessage(
          recipientId: 'teacher-001',
          body: body,
        );
    _controller.clear();
    ref.invalidate(threadMessagesProvider(_threadId));
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(threadMessagesProvider(_threadId));

    return messagesAsync.when(
      data: (payload) {
        final messages = [...payload.data, ..._realtimeMessages];

        return Column(
          children: [
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: messages.length,
                itemBuilder: (context, index) {
                  final message = messages[index];
                  final isMine = message['sender_id'] == 'self' || message['sender_id'] == null;
                  return Align(
                    alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      constraints: const BoxConstraints(maxWidth: 280),
                      decoration: BoxDecoration(
                        color: isMine ? Theme.of(context).colorScheme.primary : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            message['sender_name']?.toString() ?? (isMine ? 'You' : 'Teacher'),
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: isMine ? Colors.white70 : Colors.black54,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            message['body']?.toString() ?? '',
                            style: TextStyle(
                              color: isMine ? Colors.white : Colors.black87,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: InputDecoration(
                          hintText: payload.isStale ? 'Offline message draft' : 'Type a message',
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    FilledButton(
                      onPressed: _sendMessage,
                      child: const Icon(Icons.send),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load chat: $error')),
    );
  }
}
