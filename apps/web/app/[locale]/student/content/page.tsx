'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Play, FileText, Link as LinkIcon, Video, Music, BookOpen, Heart, Bookmark, MessageCircle, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

export default function ContentPage() {
    const t = useTranslations();
    const isEnglish = useLocale() === 'en';
    const copy = (ar: string, en: string) => isEnglish ? en : ar;
    const [filter, setFilter] = useState('all');
    const [contentItems, setContentItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [stats, setStats] = useState({ videos: 0, docs: 0, links: 0, hours: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const [itemsRes, catsRes] = await Promise.all([
                    apiClient.get('/content/items'),
                    apiClient.get('/content/categories')
                ]);
                
                const items = itemsRes.data?.data || itemsRes.data || [];
                if (items.length >= 0) {
                    setContentItems(items);
                    setStats({
                        videos: items.filter((i: any) => i.type === 'video').length,
                        docs: items.filter((i: any) => i.type === 'document').length,
                        links: items.filter((i: any) => i.type === 'link').length,
                        hours: parseFloat((items.filter((i: any) => i.type === 'video')
                            .reduce((sum: number, i: any) => sum + (i.durationMinutes || 0), 0) / 60).toFixed(1)),
                    });
                }
                if (catsRes.data?.success) setCategories(catsRes.data.data || []);
            } catch (error) {
                console.error('Error fetching content:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, []);

    const filteredContent = filter === 'all'
        ? contentItems
        : contentItems.filter(item => item.type === filter || item.categoryId === filter);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">📚 {copy('المكتبة التعليمية', 'Learning Library')}</h1>
                <p className="text-muted-foreground mt-2">
                    {copy('فيديوهات، ملفات، روابط مفيدة وكل المحتوى التعليمي', 'Videos, files, useful links, and learning resources')}
                </p>
            </div>

            {/* Stats — computed from real API data */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { icon: Video, label: copy('الفيديوهات', 'Videos'), value: stats.videos, from: 'from-blue-500', to: 'to-blue-600' },
                    { icon: FileText, label: copy('الملفات', 'Files'), value: stats.docs, from: 'from-purple-500', to: 'to-purple-600' },
                    { icon: LinkIcon, label: copy('الروابط', 'Links'), value: stats.links, from: 'from-green-500', to: 'to-green-600' },
                    { icon: TrendingUp, label: copy('ساعات المشاهدة', 'Watch hours'), value: stats.hours, from: 'from-orange-500', to: 'to-orange-600' },
                ].map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.from} ${s.to} text-white p-6 rounded-xl`}>
                        <div className="flex items-center gap-3">
                            <s.icon className="w-8 h-8" />
                            <div>
                                <p className="text-sm opacity-90">{s.label}</p>
                                <p className="text-3xl font-bold">{s.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg ${filter === 'all'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                >
                    {copy('الكل', 'All')}
                </button>
                <button
                    onClick={() => setFilter('video')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${filter === 'video'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                >
                    <Video className="w-4 h-4" />
                    {copy('فيديوهات', 'Videos')}
                </button>
                <button
                    onClick={() => setFilter('document')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${filter === 'document'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    {copy('ملفات PDF', 'PDF files')}
                </button>
                <button
                    onClick={() => setFilter('link')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${filter === 'link'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                >
                    <LinkIcon className="w-4 h-4" />
                    {copy('روابط', 'Links')}
                </button>
                <button
                    onClick={() => setFilter('audio')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${filter === 'audio'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                >
                    <Music className="w-4 h-4" />
                    {copy('صوتيات', 'Audio')}
                </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.map((item, idx) => {
                    const fallbackIcons = {
                        'video': Video,
                        'document': FileText,
                        'audio': Music,
                        'link': LinkIcon
                    };
                    const Icon = item.icon || fallbackIcons[item.type as keyof typeof fallbackIcons] || FileText;
                    const thumbnail = item.thumbnail || (item.type === 'video' ? '🎥' : item.type === 'document' ? '📄' : item.type === 'link' ? '🔗' : '📚');
                    const views = item.views || 0;
                    const likes = item.likes || 0;
                    const progress = item.progress || 0;

                    return (
                        <Link
                            key={item.id}
                            href={`/student/content/${item.id}`}
                            className="group"
                        >
                            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all hover:shadow-lg">
                                {/* Thumbnail */}
                                <div className="bg-gradient-to-br from-blue-500 to-purple-600 h-40 flex items-center justify-center text-6xl">
                                    {thumbnail}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <div className="flex items-start gap-2 mb-2">
                                        <Icon className="w-5 h-5 text-primary mt-0.5" />
                                        <h3 className="font-bold flex-1 group-hover:text-primary transition-colors">
                                            {item.title}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                        {item.duration && <span>⏱️ {item.duration}</span>}
                                        {item.size && <span>📦 {item.size}</span>}
                                        {item.url && <span className="truncate">🔗 {item.url}</span>}
                                    </div>

                                    {/* Progress Bar */}
                                    {progress > 0 && (
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span>{copy('التقدم', 'Progress')}</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-primary h-2 rounded-full transition-all"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center justify-between pt-3 border-t">
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Play className="w-4 h-4" />
                                                {views}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Heart className="w-4 h-4" />
                                                {likes}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 hover:bg-gray-100 rounded-lg">
                                                <Bookmark className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 hover:bg-gray-100 rounded-lg">
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
