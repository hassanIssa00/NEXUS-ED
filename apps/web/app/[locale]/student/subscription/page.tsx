'use client';
import { Badge } from '@/components/ui/badge'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { CheckCircle2, Loader2, Sparkles, Star, Zap, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

interface Subscription {
    plan: string;
    status: 'active' | 'expired' | 'none';
    expiresAt?: string;
}

const PLANS = [
    {
        name: 'الخطة الشهرية',
        price: 99,
        currency: 'ريال',
        period: 'شهر',
        color: 'from-blue-500 to-indigo-600',
        features: [
            'الوصول لجميع الدروس والمحتوى',
            'التصحيح التلقائي بالذكاء الاصطناعي',
            'المعلم الذكي (AI Tutor) بلا حدود',
            'تقارير تحليلية مفصلة',
        ],
        icon: Star,
    },
    {
        name: 'الخطة السنوية',
        price: 799,
        currency: 'ريال',
        period: 'سنة',
        badge: 'وفّر 16%',
        color: 'from-purple-500 to-pink-600',
        features: [
            'كل مميزات الخطة الشهرية',
            'أولوية في الدعم الفني',
            'تقارير متقدمة لأولياء الأمور',
            'الوصول المبكر للميزات الجديدة',
        ],
        icon: Crown,
        popular: true,
    },
];

export default function SubscriptionPage() {
    const { toast } = useToast();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/payment/subscription')
            .then(res => setSubscription(res.data?.data || res.data))
            .catch(() => setSubscription({ plan: 'none', status: 'none' }))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const isActive = subscription?.status === 'active';

    return (
        <div className="max-w-4xl mx-auto space-y-8" dir="rtl">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-3"
            >
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold">
                    <Sparkles className="w-4 h-4" />
                    اشتراك بريميوم
                </div>
                <h1 className="text-4xl font-bold">ارفع مستواك مع Premium ⚡</h1>
                <p className="text-muted-foreground text-lg">
                    احصل على تجربة تعلم متكاملة مدعومة بالذكاء الاصطناعي
                </p>
            </motion.div>

            {/* Current Status */}
            {isActive && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl"
                >
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div>
                        <p className="font-bold text-green-800 dark:text-green-200">
                            اشتراكك نشط — {subscription?.plan}
                        </p>
                        {subscription?.expiresAt && (
                            <p className="text-sm text-green-600 dark:text-green-400">
                                ينتهي في: {new Date(subscription.expiresAt).toLocaleDateString('ar-SA')}
                            </p>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Plans */}
            <div className="grid md:grid-cols-2 gap-6">
                {PLANS.map((plan, index) => (
                    <motion.div
                        key={plan.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className={`relative overflow-hidden h-full transition-all hover:shadow-xl hover:-translate-y-1 ${plan.popular ? 'border-primary shadow-lg ring-2 ring-primary/30' : ''}`}>
                            {plan.popular && (
                                <div className="absolute top-4 left-4">
                                    <Badge className="bg-primary text-primary-foreground font-bold">الأكثر شعبية ⭐</Badge>
                                </div>
                            )}
                            {plan.badge && (
                                <div className="absolute top-4 right-4">
                                    <Badge variant="secondary" className="font-bold">{plan.badge}</Badge>
                                </div>
                            )}

                            {/* Color stripe */}
                            <div className={`h-1.5 bg-gradient-to-r ${plan.color}`} />

                            <CardHeader className="pt-8">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3 shadow`}>
                                    <plan.icon className="w-6 h-6 text-white" />
                                </div>
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className="text-4xl font-black">{plan.price}</span>
                                    <span className="text-muted-foreground text-lg">{plan.currency}</span>
                                    <span className="text-muted-foreground text-sm">/ {plan.period}</span>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-5">
                                <ul className="space-y-3">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    className={`w-full gap-2 ${plan.popular ? `bg-gradient-to-r ${plan.color} hover:opacity-90` : ''}`}
                                    size="lg"
                                    variant={plan.popular ? 'default' : 'outline'}
                                    disabled={isActive}
                                    onClick={() => {
                                        toast({
                                            title: '💳 بوابة الدفع الإلكتروني',
                                            description: `تم اختيار ${plan.name} (${plan.price} ${plan.currency}). يجري تحضير وسيلة الدفع الآمنة لمدرستك.`,
                                        });
                                    }}
                                >
                                    <Zap className="w-4 h-4" />
                                    {isActive ? 'مشترك حالياً ✓' : 'اشترك الآن'}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <p className="text-center text-xs text-muted-foreground">
                جميع الأسعار شاملة الضريبة • إلغاء الاشتراك في أي وقت • بيانات مشفرة بالكامل 🔒
            </p>
        </div>
    );
}
