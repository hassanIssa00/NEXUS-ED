'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, Paperclip, MoreVertical, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { messagingService, Conversation, Message } from '@/lib/services/messaging.service';
import { toast } from '@/components/ui/use-toast';
import { io, Socket } from 'socket.io-client';

export default function MessagesPage() {
  const t = useTranslations('Teacher');
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Load conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await messagingService.getConversations();
        setConversations(data);
        if (data.length > 0) {
          setActiveChat(data[0].id);
        }
      } catch (error) {
        toast({ title: 'خطأ', description: 'تعذر تحميل المحادثات', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001', {
      path: '/socket.io',
      namespace: '/events',
      auth: { token },
      transports: ['websocket'],
    } as any);

    socketRef.current.on('connect', () => {
      console.log('Connected to real-time messaging');
    });

    socketRef.current.on('new_message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      
      // Update conversations list preview
      setConversations((prev) => 
        prev.map((conv) => {
          if (conv.id === message.conversationId) {
            return { ...conv, messages: [message], updatedAt: new Date().toISOString() };
          }
          return conv;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat) return;

    const fetchMessages = async () => {
      try {
        const data = await messagingService.getMessages(activeChat);
        setMessages(data);
        scrollToBottom();
      } catch (error) {
        toast({ title: 'خطأ', description: 'تعذر تحميل الرسائل', variant: 'destructive' });
      }
    };
    fetchMessages();
  }, [activeChat]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    
    const tempMessage = newMessage;
    setNewMessage('');
    
    try {
      const sent = await messagingService.sendMessage(activeChat, tempMessage);
      setMessages((prev) => [...prev, sent]);
      
      // Update conversations list
      setConversations((prev) => 
        prev.map((conv) => {
          if (conv.id === activeChat) {
            return { ...conv, messages: [sent], updatedAt: new Date().toISOString() };
          }
          return conv;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
      
      scrollToBottom();
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل إرسال الرسالة', variant: 'destructive' });
      setNewMessage(tempMessage); // restore input
    }
  };

  // Helper to get chat display name and avatar
  const getChatDetails = (conv: Conversation) => {
    if (conv.type === 'direct') {
      const other = conv.participants.find(p => p.userId !== user?.id)?.user;
      return {
        name: other?.name || 'مستخدم غير معروف',
        avatar: other?.avatar,
        role: other?.role === 'PARENT' ? 'ولي أمر' : other?.role === 'STUDENT' ? 'طالب' : 'معلم',
      };
    }
    return { name: conv.title || 'مجموعة', avatar: conv.avatarUrl, role: 'فصل دراسي' };
  };

  const filteredConversations = conversations.filter(conv => {
    const details = getChatDetails(conv);
    return details.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeConversation = conversations.find(c => c.id === activeChat);
  const activeChatDetails = activeConversation ? getChatDetails(activeConversation) : null;

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4 p-4 lg:p-6 overflow-hidden">
      {/* Conversations Sidebar */}
      <Card className="w-full lg:w-1/3 xl:w-1/4 flex flex-col overflow-hidden rounded-xl border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">الرسائل</h2>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="ابحث عن محادثة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-3 pr-10 bg-gray-50 dark:bg-gray-900 border-none focus-visible:ring-1"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1 bg-white dark:bg-gray-950">
          {loading ? (
            <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
              <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
              <p>لا توجد محادثات</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-900/50">
              {filteredConversations.map((conv) => {
                const details = getChatDetails(conv);
                const lastMessage = conv.messages?.[0];
                const isSelected = activeChat === conv.id;
                
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveChat(conv.id)}
                    className={`w-full flex items-start gap-3 p-4 text-right transition-colors ${
                      isSelected 
                        ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900/50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <Avatar className="h-12 w-12 border border-gray-100 shadow-sm">
                      <AvatarImage src={details.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {details.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {details.name}
                        </h3>
                        {lastMessage && (
                          <span className="text-xs text-gray-400 whitespace-nowrap mr-2">
                            {new Date(lastMessage.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={`text-sm truncate ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
                          {lastMessage ? (
                            <span>{lastMessage.senderId === user?.id ? 'أنت: ' : ''}{lastMessage.content}</span>
                          ) : (
                            <span className="italic text-gray-400">ابدأ المحادثة</span>
                          )}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {details.role}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <Card className="hidden lg:flex flex-1 flex-col overflow-hidden rounded-xl border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-950">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shadow-sm">
                  <AvatarImage src={activeChatDetails?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {activeChatDetails?.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">{activeChatDetails?.name}</h3>
                  <p className="text-xs text-primary">{activeChatDetails?.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4 bg-gray-50/50 dark:bg-gray-900/20">
              <div className="flex flex-col gap-4 pb-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center pt-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-primary/60" />
                    </div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">مرحباً بك في المحادثة</h4>
                    <p className="text-sm text-gray-500 mt-1 max-w-sm">
                      يمكنك هنا التواصل المباشر وإرسال الرسائل والملفات بشكل فوري وآمن.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.id;
                    const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                    
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 max-w-[80%] ${isMe ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}>
                        {!isMe && (
                          <div className="w-8 shrink-0">
                            {showAvatar && (
                              <Avatar className="h-8 w-8 shadow-sm">
                                <AvatarImage src={msg.sender?.avatar} />
                                <AvatarFallback className="text-xs bg-secondary/20 text-secondary-foreground">
                                  {msg.sender?.name?.substring(0, 2) || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}
                        
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {showAvatar && (
                            <span className="text-xs text-gray-500 mb-1 pr-1">{msg.sender?.name}</span>
                          )}
                          <div 
                            className={`px-4 py-3 rounded-2xl shadow-sm ${
                              isMe 
                                ? 'bg-primary text-primary-foreground rounded-br-none' 
                                : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
                            }`}
                          >
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <span className="text-[11px] text-gray-400 mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-center gap-2"
              >
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="shrink-0 rounded-full text-gray-500 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-colors"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="اكتب رسالتك هنا..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 rounded-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-1 focus-visible:ring-primary/50 text-[15px] px-5 py-6"
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim()} 
                  className="shrink-0 rounded-full h-12 w-12 p-0 shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="h-5 w-5 mr-1" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-50/30 dark:bg-gray-900/10">
            <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-6">
              <MessageSquare className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-lg">اختر محادثة للبدء في التواصل</p>
          </div>
        )}
      </Card>
    </div>
  );
}
