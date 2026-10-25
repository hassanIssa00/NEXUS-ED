'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestionCardProps {
    question: {
        id: number;
        text_ar: string;
        options: string[];
    };
    timeLimit: number;
    onSubmit: (chosenIndex: number, timeTaken: number) => void;
    disabled?: boolean;
}

export function QuestionCard({ question, timeLimit, onSubmit, disabled = false }: QuestionCardProps) {
    const isEnglish = useLocale() === 'en';
    const [timeLeft, setTimeLeft] = useState(timeLimit);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [startTime] = useState(Date.now());

    // Timer countdown
    useEffect(() => {
        if (submitted || disabled) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(selectedIndex ?? -1);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [submitted, disabled, selectedIndex]);

    const handleSubmit = (index: number) => {
        if (submitted || disabled) return;

        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        setSubmitted(true);
        onSubmit(index, timeTaken);
    };

    const getTimerColor = () => {
        if (timeLeft > timeLimit * 0.5) return 'text-green-600';
        if (timeLeft > timeLimit * 0.25) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-3xl mx-auto"
            dir={isEnglish ? 'ltr' : 'rtl'}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                {/* Timer */}
                <div className="flex justify-center mb-6">
                    <div className={`text-6xl font-bold ${getTimerColor()} transition-colors`}>
                        {timeLeft}s
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-8 overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        initial={{ width: '100%' }}
                        animate={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Question */}
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center leading-relaxed">
                    {question.text_ar}
                </h2>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <AnimatePresence>
                        {question.options.map((option, index) => (
                            <motion.button
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: disabled || submitted ? 1 : 1.02 }}
                                whileTap={{ scale: disabled || submitted ? 1 : 0.98 }}
                                onClick={() => !disabled && !submitted && setSelectedIndex(index)}
                                disabled={disabled || submitted}
                                className={`
                  relative p-6 rounded-xl text-right text-lg font-medium transition-all
                  ${selectedIndex === index
                                        ? 'bg-blue-500 text-white shadow-lg ring-4 ring-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }
                  ${disabled || submitted ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                `}
                            >
                                <span className="absolute top-4 left-4 text-sm opacity-70">
                                    {String.fromCharCode(65 + index)}
                                </span>
                                {option}
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Submit Button */}
                <Button
                    onClick={() => selectedIndex !== null && handleSubmit(selectedIndex)}
                    disabled={selectedIndex === null || submitted || disabled}
                    className="w-full py-6 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500"
                    size="lg"
                >
                    {submitted ? (isEnglish ? '✓ Submitted' : '✓ تم الإرسال') : (isEnglish ? 'Submit answer' : 'إرسال الإجابة')}
                </Button>

                {submitted && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center text-green-600 dark:text-green-400 mt-4 font-medium"
                    >
                        {isEnglish ? '✓ Your answer has been received. Waiting for the result…' : '✓ تم استلام إجابتك! في انتظار النتيجة...'}
                    </motion.p>
                )}
            </div>
        </motion.div>
    );
}

export default QuestionCard;
