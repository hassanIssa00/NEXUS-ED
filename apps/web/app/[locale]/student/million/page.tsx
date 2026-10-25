'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Clock, Trophy, Loader2, RefreshCw, Zap } from 'lucide-react';
import { useMillionSocket } from '@/hooks/useMillionSocket';
import { apiClient } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';

interface Room {
    id: string;
    title: string;
    playerCount: number;
    maxPlayers: number;
    status: 'waiting' | 'playing' | 'finished';
    createdAt: string;
}

export default function MillionLobbyPage() {
    const isEnglish = useLocale() === 'en';
    const t = (ar: string, en: string) => isEnglish ? en : ar;
    const router = useRouter();
    const { createRoom, connected } = useMillionSocket();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [roomTitle, setRoomTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);

    const fetchRooms = () => {
        setLoadingRooms(true);
        apiClient.get('/million/rooms')
            .then(res => setRooms(res.data?.data || res.data || []))
            .catch(() => setRooms([]))
            .finally(() => setLoadingRooms(false));
    };

    useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateRoom = async () => {
        if (!roomTitle.trim()) return;
        setLoading(true);
        try {
            const room = await createRoom({
                title: roomTitle,
                type: 'public',
                settings: { questionCount: 10, timeLimit: 15, maxPlayers: 10 },
            });
            router.push(`/student/million/room/${room.id}`);
        } catch (error: any) {
            alert(t('فشل إنشاء الغرفة', 'Could not create the room.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6" dir={isEnglish ? 'ltr' : 'rtl'}>
            <div className="max-w-6xl mx-auto">
                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <div className="inline-block mb-4 p-4 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full shadow-xl">
                        <Trophy className="w-16 h-16 text-white" />
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
                        {t('مسابقة حوار المليون', 'Who Wants to Be a Millionaire?')}
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">{t('تحدى أصدقاءك في مسابقة معرفية مثيرة!', 'Challenge your friends in an exciting quiz!')}</p>
                </motion.div>

                {/* Connection Status */}
                {!connected && (
                    <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-xl text-center">
                        <p className="text-yellow-800 dark:text-yellow-200 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('جارٍ الاتصال بالخادم...', 'Connecting to the server...')}
                        </p>
                    </div>
                )}

                {/* Create Button */}
                <div className="mb-8">
                    <Button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        size="lg"
                        className="w-full md:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-lg px-8 py-6 gap-2"
                        disabled={!connected}
                    >
                        <Plus className="w-6 h-6" />
                        {t('إنشاء غرفة جديدة', 'Create a room')}
                    </Button>
                </div>

                {/* Create Form */}
                <AnimatePresence>
                    {showCreateForm && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8">
                            <Card>
                                <CardHeader><CardTitle>{t('غرفة جديدة', 'New room')}</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">{t('عنوان الغرفة', 'Room name')}</label>
                                        <Input
                                            value={roomTitle}
                                            onChange={e => setRoomTitle(e.target.value)}
                                            placeholder={t('مثال: غرفة العلوم - المستوى المتوسط', 'e.g. Science quiz room')}
                                            dir={isEnglish ? 'ltr' : 'rtl'}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button onClick={handleCreateRoom} disabled={!roomTitle.trim() || loading} className="flex-1 gap-2">
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                            {loading ? t('جارٍ الإنشاء...', 'Creating...') : t('إنشاء', 'Create')}
                                        </Button>
                                        <Button onClick={() => setShowCreateForm(false)} variant="outline">{t('إلغاء', 'Cancel')}</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        { icon: Users, color: 'text-purple-600', title: t('لعب جماعي', 'Multiplayer'), desc: t('تحدى حتى 10 لاعبين في وقت واحد', 'Compete with up to 10 players at once.'), delay: 0.1 },
                        { icon: Clock, color: 'text-blue-600', title: t('سرعة الإجابة', 'Answer quickly'), desc: t('كن الأسرع لتحصل على نقاط إضافية', 'Answer quickly to earn bonus points.'), delay: 0.2 },
                        { icon: Trophy, color: 'text-yellow-600', title: t('نظام النقاط', 'Scoring system'), desc: t('احصل على XP حسب الصعوبة والسرعة', 'Earn XP based on difficulty and speed.'), delay: 0.3 },
                    ].map((item, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: item.delay }}>
                            <Card className="text-center">
                                <CardHeader>
                                    <item.icon className={`w-12 h-12 ${item.color} mx-auto mb-2`} />
                                    <CardTitle>{item.title}</CardTitle>
                                </CardHeader>
                                <CardContent><p className="text-gray-600 dark:text-gray-400 text-sm">{item.desc}</p></CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Live Room List */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            {t('الغرف المتاحة', 'Available rooms')}
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={fetchRooms} disabled={loadingRooms} className="gap-1">
                            <RefreshCw className={`w-4 h-4 ${loadingRooms ? 'animate-spin' : ''}`} />
                            {t('تحديث', 'Refresh')}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loadingRooms ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : rooms.length === 0 ? (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                                {t('لا توجد غرف نشطة حاليًا. ابدأ بإنشاء غرفة جديدة! 🎮', 'No active rooms yet. Create a new room to get started! 🎮')}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {rooms.map((room, i) => (
                                    <motion.div
                                        key={room.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                                                <Trophy className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold">{room.title}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {room.playerCount}/{room.maxPlayers || 10} {t('لاعب', 'players')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={room.status === 'waiting' ? 'default' : 'secondary'}>
                                                {room.status === 'waiting' ? t('⏳ ينتظر', '⏳ Waiting') : room.status === 'playing' ? t('🔥 جارٍ', '🔥 In progress') : t('✅ انتهى', '✅ Finished')}
                                            </Badge>
                                            {room.status === 'waiting' && (
                                                <Button size="sm" onClick={() => router.push(`/student/million/room/${room.id}`)}>
                                                    {t('انضم', 'Join')}
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
