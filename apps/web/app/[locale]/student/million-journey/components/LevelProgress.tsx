'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface LevelProgressProps {
    currentLevel: string;
    levelNumber: number;
    progress: number;
    nextLevel: number;
}

export default function LevelProgress({
    currentLevel,
    levelNumber,
    progress,
    nextLevel
}: LevelProgressProps) {
    const getLevelColor = (level: number) => {
        const colors = [
            '#94A3B8', // Beginner
            '#4A687C', // Active Learner
            '#234A65', // Consistent Performer
            '#98793E', // Achiever
            '#F59E0B', // Elite Student
            '#10B981', // Top 1%
            '#EF4444', // Million Finalist
        ];
        return colors[level - 1] || colors[0];
    };

    const progressPercentage = Math.min(100 - (progress / 1000) * 100, 100);

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-card border-2 rounded-xl p-6"
            style={{ borderColor: getLevelColor(levelNumber) }}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-muted-foreground">Current Level</h3>
                <Sparkles className="w-6 h-6" style={{ color: getLevelColor(levelNumber) }} />
            </div>

            <div className="mb-4">
                <div className="text-3xl md:text-4xl font-bold mb-2" style={{ color: getLevelColor(levelNumber) }}>
                    {currentLevel}
                </div>
                <span className="text-sm text-muted-foreground">Level {levelNumber}</span>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress to Level {nextLevel}</span>
                    <span className="font-semibold">{progressPercentage.toFixed(0)}%</span>
                </div>

                <div className="relative w-full bg-secondary rounded-full h-4 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full relative overflow-hidden"
                        style={{ backgroundColor: getLevelColor(levelNumber) }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-white/30"
                            animate={{
                                x: ['-100%', '100%'],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                        />
                    </motion.div>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-2">
                    {progress} points until next level
                </p>
            </div>
        </motion.div>
    );
}
