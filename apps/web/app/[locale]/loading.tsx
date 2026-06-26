'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function Loading() {
    const [activeLogo, setActiveLogo] = useState<'nexus' | 'school'>('nexus');

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveLogo((prev) => (prev === 'nexus' ? 'school' : 'nexus'));
        }, 2000); // Switch every 2 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-sm" dir="rtl">
            <div className="flex flex-col items-center gap-8 w-full max-w-md px-6">
                {/* Cinematic Logo Switcher */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                    {/* Glowing Backdrop */}
                    <div className="absolute inset-0 bg-primary-500/20 blur-[30px] rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
                    
                    <AnimatePresence mode="popLayout">
                        {activeLogo === 'nexus' && (
                            <motion.img
                                key="nexus"
                                src="/logo_new.webp"
                                alt="Nexus EDU"
                                initial={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                                className="absolute inset-0 w-full h-full object-cover rounded-[1.2rem] shadow-2xl border-2 border-white bg-white"
                            />
                        )}
                        {activeLogo === 'school' && (
                            <motion.img
                                key="school"
                                src="/second_logo.webp"
                                alt="School Logo"
                                initial={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                                className="absolute inset-0 w-full h-full object-cover rounded-[1.2rem] shadow-2xl border-2 border-white bg-white"
                            />
                        )}
                    </AnimatePresence>

                    {/* Orbiting rings */}
                    <div className="absolute -inset-4 rounded-[1.5rem] border border-primary-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]" />
                    <div className="absolute -inset-2 rounded-[1.3rem] bg-primary-500/10 animate-ping" style={{ animationDuration: '2.5s' }} />
                </div>

                {/* Loading Text */}
                <div className="text-center space-y-3 z-10">
                    <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">
                        جاري تجهيز المنصة...
                    </h3>
                    <div className="flex justify-center items-center gap-2">
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>

                {/* Elegant Skeletons */}
                <div className="w-full space-y-5 opacity-60 mt-4">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-2/3 mx-auto animate-pulse" />
                    
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-28 bg-white/60 dark:bg-slate-800/60 rounded-2xl animate-pulse border border-slate-200 dark:border-slate-700 shadow-sm" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
