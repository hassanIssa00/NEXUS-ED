'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
    GraduationCap, 
    BookOpen, 
    Trophy, 
    ChevronLeft, 
    ChevronRight,
    Sparkles
} from 'lucide-react';

interface IntroScreen {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    isVideo?: boolean;
}

const introScreens: IntroScreen[] = [
    {
        icon: <GraduationCap className="w-24 h-24" />,
        title: 'مرحباً بك في منصة المليون!',
        description: 'منصتك التعليمية الذكية لتتبع تقدمك الأكاديمي ومتابعة دروسك بكل سهولة',
        color: 'from-blue-500 to-cyan-500',
    },
    {
        icon: <BookOpen className="w-24 h-24" />,
        title: 'تعلّم بذكاء',
        description: 'احصل على تحليلات مفصلة لأدائك، واستفد من نظام الإنذار المبكر لتحسين درجاتك',
        color: 'from-purple-500 to-pink-500',
    },
    {
        icon: <Trophy className="w-24 h-24" />,
        title: 'تنافس واربح!',
        description: 'اجمع النقاط والشارات وتنافس مع زملائك في لوحة الشرف',
        color: 'from-yellow-500 to-orange-500',
    },
    {
        icon: <div className="w-24 h-24 flex items-center justify-center bg-white/20 rounded-full">🎥</div>,
        title: 'شاهد الفيديو التعريفي',
        description: 'جولة سريعة في المنصة للتعرف على أهم الميزات في دقيقة واحدة',
        color: 'from-red-500 to-pink-600',
        isVideo: true,
    },
];

interface OnboardingIntroProps {
    onComplete: () => void;
}

export function OnboardingIntro({ onComplete }: OnboardingIntroProps) {
    const [currentScreen, setCurrentScreen] = useState(0);
    const [hasSeenIntro, setHasSeenIntro] = useState(false);

    useEffect(() => {
        const seen = localStorage.getItem('intro-seen');
        if (seen) {
            setHasSeenIntro(true);
            onComplete();
        }
    }, [onComplete]);

    const handleNext = () => {
        if (currentScreen < introScreens.length - 1) {
            setCurrentScreen((prev) => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentScreen > 0) {
            setCurrentScreen((prev) => prev - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem('intro-seen', 'true');
        setHasSeenIntro(true);
        onComplete();
    };

    const handleSkip = () => {
        handleComplete();
    };

    if (hasSeenIntro) return null;

    const screen = introScreens[currentScreen];
    if (!screen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
            <motion.div
                key={currentScreen}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`relative w-full max-w-lg mx-4 p-8 rounded-3xl bg-gradient-to-br ${screen.color} text-white shadow-2xl overflow-hidden`}
            >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                    {/* Content */}
                    <div className="relative z-10 text-center">
                        {/* Video or Icon */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                            className="mx-auto mb-6 w-full max-w-sm"
                        >
                            {(screen as any).isVideo ? (
                                <div className="aspect-video bg-black/30 rounded-xl overflow-hidden shadow-lg border border-white/20">
                                    <video 
                                        controls 
                                        className="w-full h-full object-cover"
                                        poster="/intro-poster.webp"
                                    >
                                        <source src="/intro-video.mp4" type="video/mp4" />
                                        متصفحك لا يدعم تشغيل الفيديو
                                    </video>
                                </div>
                            ) : (
                                <div className="p-4 bg-white/20 rounded-full w-fit mx-auto">
                                    {screen.icon}
                                </div>
                            )}
                        </motion.div>

                    {/* Title */}
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl md:text-3xl font-bold mb-4"
                    >
                        {screen.title}
                    </motion.h2>

                    {/* Description */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg opacity-90 mb-8"
                    >
                        {screen.description}
                    </motion.p>

                    {/* Progress dots */}
                    <div className="flex justify-center gap-2 mb-6">
                        {introScreens.map((_, index) => (
                            <motion.div
                                key={index}
                                className={`w-3 h-3 rounded-full transition-all ${
                                    index === currentScreen
                                        ? 'bg-white w-8'
                                        : 'bg-white/40'
                                }`}
                                whileHover={{ scale: 1.2 }}
                                onClick={() => setCurrentScreen(index)}
                                style={{ cursor: 'pointer' }}
                            />
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={handlePrev}
                            disabled={currentScreen === 0}
                            className="text-white hover:bg-white/20 disabled:opacity-30"
                        >
                            <ChevronRight className="w-5 h-5 ml-1" />
                            السابق
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={handleSkip}
                            className="text-white/70 hover:text-white hover:bg-white/10"
                        >
                            تخطي
                        </Button>

                        <Button
                            onClick={handleNext}
                            className="bg-white text-gray-900 hover:bg-white/90"
                        >
                            {currentScreen === introScreens.length - 1 ? (
                                <>
                                    <Sparkles className="w-5 h-5 ml-1" />
                                    ابدأ الآن
                                </>
                            ) : (
                                <>
                                    التالي
                                    <ChevronLeft className="w-5 h-5 mr-1" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
