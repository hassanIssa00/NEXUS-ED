'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Volume2, VolumeX, Maximize, SkipForward, SkipBack } from 'lucide-react';

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoSrc?: string;
    title?: string;
    poster?: string;
}

export function VideoModal({ isOpen, onClose, videoSrc = '/videos/intro.mp4', title = 'الفيديو التعريفي لنِكْسُس', poster }: VideoModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState('0:00');
    const [duration, setDuration] = useState('0:00');

    useEffect(() => {
        if (isOpen && videoRef.current) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
        if (!isOpen && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsPlaying(false);
            setProgress(0);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(pct);
            setCurrentTime(formatTime(videoRef.current.currentTime));
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(formatTime(videoRef.current.duration));
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = clickX / rect.width;
            videoRef.current.currentTime = pct * videoRef.current.duration;
        }
    };

    const skip = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
        }
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                videoRef.current.requestFullscreen();
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
                    onClick={onClose}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="relative w-full max-w-5xl z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute -top-12 left-0 text-white/70 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                            <X className="w-5 h-5" />
                            إغلاق
                        </button>

                        {/* Title */}
                        <div className="absolute -top-12 right-0 text-white/90 text-sm font-bold flex items-center gap-2">
                            <Play className="w-4 h-4 text-primary-500" />
                            {title}
                        </div>

                        {/* Video Container */}
                        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
                            <video
                                ref={videoRef}
                                src={videoSrc}
                                poster={poster || '/images/hero-banner.webp'}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={() => setIsPlaying(false)}
                                className="w-full aspect-video object-cover"
                                playsInline
                            />

                            {/* Play Overlay (when paused) */}
                            {!isPlaying && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                                    onClick={togglePlay}
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center animate-pulse-glow"
                                    >
                                        <Play className="w-8 h-8 text-white fill-white mr-[-2px]" />
                                    </motion.div>
                                </motion.div>
                            )}

                            {/* Controls Bar */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12">
                                {/* Progress Bar */}
                                <div
                                    className="w-full h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer group hover:h-2.5 transition-all"
                                    onClick={seekTo}
                                >
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full relative transition-all"
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>

                                {/* Control Buttons */}
                                <div className="flex items-center justify-between text-white">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => skip(-10)} className="hover:text-primary-400 transition-colors">
                                            <SkipBack className="w-5 h-5" />
                                        </button>
                                        <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 mr-[-2px]" />}
                                        </button>
                                        <button onClick={() => skip(10)} className="hover:text-primary-400 transition-colors">
                                            <SkipForward className="w-5 h-5" />
                                        </button>
                                        <button onClick={toggleMute} className="hover:text-primary-400 transition-colors">
                                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                        </button>
                                        <span className="text-xs text-white/60 font-mono">{currentTime} / {duration}</span>
                                    </div>
                                    <button onClick={toggleFullscreen} className="hover:text-primary-400 transition-colors">
                                        <Maximize className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
