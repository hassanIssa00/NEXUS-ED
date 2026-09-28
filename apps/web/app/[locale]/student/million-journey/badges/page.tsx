'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Award, Sparkles, CheckCircle2 } from 'lucide-react';

interface Badge {
    id: string;
    badgeCode: string;
    badgeNameAr: string;
    descriptionAr: string;
    category: string;
    colorHex: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    pointsReward: number;
    earned?: boolean;
    earnedAt?: string;
    progress?: number;
}

export default function BadgesPage() {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBadges();
    }, []);

    const fetchBadges = async () => {
        try {
            const mockBadges: Badge[] = [
                {
                    id: '1',
                    badgeCode: 'ATTENDANCE_STREAK',
                    badgeNameAr: 'بطل الانضباط والمواظبة',
                    descriptionAr: 'حضور الطابور الصباحي وجميع الحصص بدون أي غياب أو تأخير لمدة شهر كامل',
                    category: 'الانضباط المدرسي',
                    colorHex: '#3B82F6',
                    rarity: 'rare',
                    pointsReward: 250,
                    earned: true,
                    earnedAt: '2026-09-20',
                },
                {
                    id: '2',
                    badgeCode: 'QURAN_HAFIDZ',
                    badgeNameAr: 'حافظ القرآن الصغير',
                    descriptionAr: 'إتقان تلاوة وحفظ السور المقررة في منهج القرآن الكريم مع الشيخ عبد الرحمن السعيد',
                    category: 'التربية الإسلامية',
                    colorHex: '#10B981',
                    rarity: 'epic',
                    pointsReward: 400,
                    earned: true,
                    earnedAt: '2026-09-24',
                },
                {
                    id: '3',
                    badgeCode: 'ARABIC_STAR',
                    badgeNameAr: 'فارس لغتي الجميلة',
                    descriptionAr: 'إتقان نطق الحروف بالحركات وكتابة الكلمات بإشراف د. إسماعيل عيسى',
                    category: 'اللغة العربية',
                    colorHex: '#8B5CF6',
                    rarity: 'epic',
                    pointsReward: 350,
                    earned: true,
                    earnedAt: '2026-09-26',
                },
                {
                    id: '4',
                    badgeCode: 'MATH_WIZARD',
                    badgeNameAr: 'عبقري الحساب والرياضيات',
                    descriptionAr: 'إكمال 10 اختبارات قصيرة في العمليات الحسابية بدرجة كاملة مع أ. محمد الغامدي',
                    category: 'الرياضيات',
                    colorHex: '#F59E0B',
                    rarity: 'rare',
                    pointsReward: 300,
                    earned: false,
                    progress: 80,
                },
                {
                    id: '5',
                    badgeCode: 'SCIENCE_EXPLORER',
                    badgeNameAr: 'المستكشف الصغير',
                    descriptionAr: 'تنفيذ التجارب العلمية والمشاركة الفعالة في حصص العلوم مع أ. فهد الزهراني',
                    category: 'العلوم',
                    colorHex: '#06B6D4',
                    rarity: 'rare',
                    pointsReward: 300,
                    earned: false,
                    progress: 65,
                },
                {
                    id: '6',
                    badgeCode: 'SMART_LEADER',
                    badgeNameAr: 'وسام التميز العام',
                    descriptionAr: 'تحقيق معدل تراكمي 98% فما فوق وتصدر قائمة شرف الصف الأول الابتدائي',
                    category: 'التفوق الأكاديمي',
                    colorHex: '#E11D48',
                    rarity: 'legendary',
                    pointsReward: 500,
                    earned: false,
                    progress: 90,
                },
            ];

            setBadges(mockBadges);
        } catch (error) {
            console.error('Error fetching badges:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRarityBadge = (rarity: string) => {
        switch (rarity) {
            case 'legendary':
                return { text: 'أسطوري', class: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' };
            case 'epic':
                return { text: 'فائق', class: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300' };
            case 'rare':
                return { text: 'مميز', class: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300' };
            default:
                return { text: 'عادي', class: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
        }
    };

    const earnedBadges = badges.filter(b => b.earned);
    const lockedBadges = badges.filter(b => !b.earned);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" dir="rtl">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 space-y-8" dir="rtl">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    لوحة الإنجازات والأوسمة
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                    أوسمة التميز المدرسي
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    أوسمة شرف تُمنح لطلاب مدارس الإخلاص الأهلية للبنين تقديراً لاجتهادهم وتفوقهم الأكاديمي والسلوكي.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="bg-card border rounded-2xl p-5 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-2 font-black">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground">{earnedBadges.length}</h3>
                    <p className="text-xs font-bold text-muted-foreground">أوسمة محققة</p>
                </div>

                <div className="bg-card border rounded-2xl p-5 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center mx-auto mb-2 font-black">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground">{lockedBadges.length}</h3>
                    <p className="text-xs font-bold text-muted-foreground">أوسمة قيد الإنجاز</p>
                </div>

                <div className="bg-card border rounded-2xl p-5 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2 font-black">
                        <Award className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground">
                        {earnedBadges.reduce((sum, b) => sum + b.pointsReward, 0)}
                    </h3>
                    <p className="text-xs font-bold text-muted-foreground">نقاط إضافية مكتسبة</p>
                </div>
            </div>

            {/* Earned Badges */}
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-xl font-bold text-foreground">الأوسمة التي حصلت عليها ({earnedBadges.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {earnedBadges.map((badge, index) => {
                        const rarityInfo = getRarityBadge(badge.rarity);
                        return (
                            <motion.div
                                key={badge.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.08 }}
                                className="bg-card border-2 border-emerald-500/30 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: badge.colorHex }}>
                                            <Trophy className="w-6 h-6" />
                                        </div>
                                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${rarityInfo.class}`}>
                                            {rarityInfo.text}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-base text-foreground mb-1">{badge.badgeNameAr}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{badge.descriptionAr}</p>
                                </div>
                                <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                                    <span className="font-bold text-primary">+{badge.pointsReward} نقطة</span>
                                    <span className="text-muted-foreground">تاريخ المنح: {badge.earnedAt}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Locked Badges */}
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-xl font-bold text-foreground">أوسمة قيد التقدم ({lockedBadges.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {lockedBadges.map((badge, index) => {
                        const rarityInfo = getRarityBadge(badge.rarity);
                        return (
                            <motion.div
                                key={badge.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.08 }}
                                className="bg-card/70 border border-border/70 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground shadow-inner">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${rarityInfo.class}`}>
                                            {rarityInfo.text}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-base text-foreground/80 mb-1">{badge.badgeNameAr}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{badge.descriptionAr}</p>
                                </div>
                                <div>
                                    {badge.progress !== undefined && (
                                        <div className="space-y-1.5 mb-3">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-muted-foreground">التقدم نحو الوسام</span>
                                                <span className="text-primary">{badge.progress}%</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-primary h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${badge.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                                        <span className="font-bold text-muted-foreground">مكافأة: +{badge.pointsReward} نقطة</span>
                                        <span className="text-muted-foreground">{badge.category}</span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
