'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Crown, Sparkles, UserCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeaderboardEntry {
    studentId: string;
    rank: number;
    totalPoints: number;
    level: string;
    studentName: string;
    className?: string;
    avatar?: string;
    badges: number;
    consistencyIndex: number;
    isCurrentStudent?: boolean;
}

export default function LeaderboardPage() {
    const [classLeaderboard, setClassLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [gradeLeaderboard, setGradeLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [schoolLeaderboard, setSchoolLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboards();
    }, []);

    const fetchLeaderboards = async () => {
        try {
            // Real Class 1-A students
            const classData: LeaderboardEntry[] = [
                {
                    studentId: 'cls-std-1',
                    rank: 1,
                    totalPoints: 15400,
                    level: 'طالب متفوق',
                    studentName: 'ربيع أحمد الزهراني',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 8,
                    consistencyIndex: 0.99,
                },
                {
                    studentId: 'cls-std-2',
                    rank: 2,
                    totalPoints: 15100,
                    level: 'طالب متميز',
                    studentName: 'أحمد فيصل الغامدي (أنت)',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 7,
                    consistencyIndex: 0.98,
                    isCurrentStudent: true,
                },
                {
                    studentId: 'cls-std-4',
                    rank: 3,
                    totalPoints: 14600,
                    level: 'طالب مجتهد',
                    studentName: 'خالد عبد الله العمري',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 6,
                    consistencyIndex: 0.97,
                },
                {
                    studentId: 'cls-std-6',
                    rank: 4,
                    totalPoints: 13900,
                    level: 'طالب مجتهد',
                    studentName: 'محمد حسن المالكي',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 6,
                    consistencyIndex: 0.95,
                },
                {
                    studentId: 'cls-std-7',
                    rank: 5,
                    totalPoints: 13200,
                    level: 'طالب واعد',
                    studentName: 'ريان يوسف الثقفي',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 5,
                    consistencyIndex: 0.94,
                },
                {
                    studentId: 'cls-std-8',
                    rank: 6,
                    totalPoints: 12700,
                    level: 'طالب واعد',
                    studentName: 'لجين هاني السالم',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 5,
                    consistencyIndex: 0.93,
                },
            ];

            // Grade 1 Leaderboard (combining 1-A and 1-B)
            const gradeData: LeaderboardEntry[] = [
                {
                    studentId: 'cls-std-1',
                    rank: 1,
                    totalPoints: 15400,
                    level: 'طالب متفوق',
                    studentName: 'ربيع أحمد الزهراني',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 8,
                    consistencyIndex: 0.99,
                },
                {
                    studentId: 'cls-std-9',
                    rank: 2,
                    totalPoints: 15250,
                    level: 'طالب متفوق',
                    studentName: 'عبد الرحمن ناصر المطيري',
                    className: 'الصف الأول الابتدائي — فئة (ب)',
                    badges: 8,
                    consistencyIndex: 0.98,
                },
                {
                    studentId: 'cls-std-2',
                    rank: 3,
                    totalPoints: 15100,
                    level: 'طالب متميز',
                    studentName: 'أحمد فيصل الغامدي (أنت)',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 7,
                    consistencyIndex: 0.98,
                    isCurrentStudent: true,
                },
                {
                    studentId: 'cls-std-11',
                    rank: 4,
                    totalPoints: 14800,
                    level: 'طالب متميز',
                    studentName: 'فيصل عبد العزيز الدوسري',
                    className: 'الصف الأول الابتدائي — فئة (ب)',
                    badges: 7,
                    consistencyIndex: 0.96,
                },
                {
                    studentId: 'cls-std-4',
                    rank: 5,
                    totalPoints: 14600,
                    level: 'طالب مجتهد',
                    studentName: 'خالد عبد الله العمري',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 6,
                    consistencyIndex: 0.97,
                },
            ];

            // School-wide Leaderboard (Al-Ikhlas Boys School)
            const schoolData: LeaderboardEntry[] = [
                {
                    studentId: 'cls-std-15',
                    rank: 1,
                    totalPoints: 16800,
                    level: 'بطل المدرسة',
                    studentName: 'زياد متعب القحطاني',
                    className: 'الصف الثاني الابتدائي — فئة (أ)',
                    badges: 10,
                    consistencyIndex: 0.99,
                },
                {
                    studentId: 'cls-std-21',
                    rank: 2,
                    totalPoints: 16200,
                    level: 'طالب متفوق',
                    studentName: 'مشاري نايف البقمي',
                    className: 'الصف الثالث الابتدائي — فئة (أ)',
                    badges: 9,
                    consistencyIndex: 0.99,
                },
                {
                    studentId: 'cls-std-1',
                    rank: 3,
                    totalPoints: 15400,
                    level: 'طالب متفوق',
                    studentName: 'ربيع أحمد الزهراني',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 8,
                    consistencyIndex: 0.99,
                },
                {
                    studentId: 'cls-std-2',
                    rank: 4,
                    totalPoints: 15100,
                    level: 'طالب متميز',
                    studentName: 'أحمد فيصل الغامدي (أنت)',
                    className: 'الصف الأول الابتدائي — فئة (أ)',
                    badges: 7,
                    consistencyIndex: 0.98,
                    isCurrentStudent: true,
                },
            ];

            setClassLeaderboard(classData);
            setGradeLeaderboard(gradeData);
            setSchoolLeaderboard(schoolData);
        } catch (error) {
            console.error('Error fetching leaderboards:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return { icon: Crown, color: 'text-amber-500', emoji: '🥇', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-300' };
        if (rank === 2) return { icon: Medal, color: 'text-slate-400', emoji: '🥈', bg: 'bg-slate-50 dark:bg-slate-900 border-slate-300' };
        if (rank === 3) return { icon: Trophy, color: 'text-amber-700', emoji: '🥉', bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-300' };
        return { icon: Award, color: 'text-gray-500', emoji: null, bg: 'bg-card border-border' };
    };

    const LeaderboardTable = ({ data }: { data: LeaderboardEntry[] }) => (
        <div className="space-y-3">
            {data.map((entry, index) => {
                const { color, emoji, bg } = getRankIcon(entry.rank);

                return (
                    <motion.div
                        key={entry.studentId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.08 }}
                        className={`rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border transition-all ${
                            entry.isCurrentStudent
                                ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/20 shadow-md'
                                : `${bg} hover:shadow-sm`
                        }`}
                    >
                        {/* Right / Start: Rank + Student Info */}
                        <div className="flex items-center gap-4 min-w-0">
                            {/* Rank */}
                            <div className="flex-shrink-0 w-12 text-center">
                                {emoji ? (
                                    <div className="flex flex-col items-center">
                                        <span className="text-2xl leading-none">{emoji}</span>
                                        <span className={`text-xs font-black ${color}`}>#{entry.rank}</span>
                                    </div>
                                ) : (
                                    <span className="text-xl font-black text-muted-foreground">#{entry.rank}</span>
                                )}
                            </div>

                            {/* Avatar / Name */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-sm ${
                                    entry.isCurrentStudent ? 'bg-primary' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                }`}>
                                    {entry.studentName.charAt(0)}
                                </div>
                                <div className="truncate">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-base text-foreground truncate">{entry.studentName}</h3>
                                        {entry.isCurrentStudent && (
                                            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-black px-2 py-0.5 rounded-full">
                                                <UserCheck className="w-3 h-3" /> حسابك
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {entry.level} • {entry.className}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Left / End: Stats */}
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border/50">
                            <div className="text-center">
                                <div className="text-xl font-black text-primary">
                                    {entry.totalPoints.toLocaleString()}
                                </div>
                                <div className="text-[11px] font-bold text-muted-foreground">نقطة تميز</div>
                            </div>

                            <div className="text-center">
                                <div className="text-lg font-black text-foreground">{entry.badges}</div>
                                <div className="text-[11px] font-bold text-muted-foreground">أوسمة</div>
                            </div>

                            <div className="text-center">
                                <div className="text-lg font-black text-emerald-600">{(entry.consistencyIndex * 100).toFixed(0)}%</div>
                                <div className="text-[11px] font-bold text-muted-foreground">الانضباط</div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" dir="rtl">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 space-y-6" dir="rtl">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    لوحة شرف منصة نكسس التعليمية
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                    لوحة الشرف والمتصدرين
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    تنافس مع زملائك في الصف والمدرسة بمدارس الإخلاص الأهلية للبنين واجمع نقاط التميز والأوسمة.
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="class" className="w-full max-w-4xl mx-auto">
                <TabsList className="grid w-full grid-cols-3 mb-6 h-12 rounded-2xl bg-muted p-1">
                    <TabsTrigger value="class" className="rounded-xl font-bold text-sm">الفصل (فئة أ)</TabsTrigger>
                    <TabsTrigger value="grade" className="rounded-xl font-bold text-sm">الصف الأول الابتدائي</TabsTrigger>
                    <TabsTrigger value="school" className="rounded-xl font-bold text-sm">المدرسة كاملة</TabsTrigger>
                </TabsList>

                <TabsContent value="class">
                    <div className="bg-card border rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">متصدرو الفصل</h2>
                                <p className="text-xs text-muted-foreground">الصف الأول الابتدائي — الفئة (أ) • رائد الفصل: د. إسماعيل عيسى</p>
                            </div>
                            <span className="text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-3 py-1 rounded-full">
                                {classLeaderboard.length} طلاب
                            </span>
                        </div>
                        <LeaderboardTable data={classLeaderboard} />
                    </div>
                </TabsContent>

                <TabsContent value="grade">
                    <div className="bg-card border rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">متصدرو الصف الأول الابتدائي</h2>
                                <p className="text-xs text-muted-foreground">ترتيب التنافس الأكاديمي بين الفئتين (أ) و (ب)</p>
                            </div>
                            <span className="text-xs font-black bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 px-3 py-1 rounded-full">
                                الصف الأول
                            </span>
                        </div>
                        <LeaderboardTable data={gradeLeaderboard} />
                    </div>
                </TabsContent>

                <TabsContent value="school">
                    <div className="bg-card border rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">لوحة شرف مدارس الإخلاص الأهلية للبنين</h2>
                                <p className="text-xs text-muted-foreground">أعلى الطلاب نقاطاً وانضباطاً على مستوى المدرسة بجدة</p>
                            </div>
                            <span className="text-xs font-black bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-3 py-1 rounded-full">
                                الترتيب العام
                            </span>
                        </div>
                        <LeaderboardTable data={schoolLeaderboard} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
