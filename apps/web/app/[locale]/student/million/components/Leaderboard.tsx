'use client';

import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLocale } from 'next-intl';

interface LeaderboardEntry {
    userId: string;
    name: string;
    avatar?: string;
    totalPoints: number;
    correctAnswers: number;
    questionsAnswered: number;
    rank: number;
}

interface LeaderboardProps {
    entries: LeaderboardEntry[];
    currentUserId?: string;
}

export function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
    const isEnglish = useLocale() === 'en';
    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-6 h-6 text-yellow-500" />;
            case 2:
                return <Medal className="w-6 h-6 text-gray-400" />;
            case 3:
                return <Award className="w-6 h-6 text-amber-600" />;
            default:
                return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
        }
    };

    const getRankBadgeColor = (rank: number) => {
        switch (rank) {
            case 1:
                return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
            case 2:
                return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
            case 3:
                return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white';
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white';
        }
    };

    return (
        <div className="w-full" dir={isEnglish ? 'ltr' : 'rtl'}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Trophy className="w-8 h-8" />
                        {isEnglish ? 'Leaderboard' : 'لوحة المتصدرين'}
                    </h3>
                </div>

                <div className="p-6 space-y-3">
                    {entries.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            {isEnglish ? 'No results yet…' : 'لا توجد نتائج بعد...'}
                        </p>
                    ) : (
                        entries.map((entry, index) => (
                            <motion.div
                                key={entry.userId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`
                  flex items-center gap-4 p-4 rounded-xl transition-all
                  ${entry.userId === currentUserId
                                        ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                                        : 'bg-gray-50 dark:bg-gray-700/50'
                                    }
                  ${entry.rank <= 3 ? 'shadow-md' : ''}
                `}
                            >
                                {/* Rank */}
                                <div className={`
                  flex items-center justify-center w-14 h-14 rounded-full 
                  ${getRankBadgeColor(entry.rank)}
                `}>
                                    {getRankIcon(entry.rank)}
                                </div>

                                {/* Avatar & Name */}
                                <div className="flex items-center gap-3 flex-1">
                                    <Avatar className="w-12 h-12 ring-2 ring-gray-200 dark:ring-gray-600">
                                        <AvatarImage src={entry.avatar} alt={entry.name} />
                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold">
                                            {entry.name.slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">
                                            {entry.name}
                                            {entry.userId === currentUserId && (
                                                <span className="mr-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                                                    {isEnglish ? 'You' : 'أنت'}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {isEnglish ? `${entry.correctAnswers} of ${entry.questionsAnswered} correct` : `${entry.correctAnswers} من ${entry.questionsAnswered} صحيحة`}
                                        </p>
                                    </div>
                                </div>

                                {/* Points */}
                                <div className="text-left">
                                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                        {entry.totalPoints}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {isEnglish ? 'points' : 'نقطة'}
                                    </p>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Leaderboard;
