'use client';

import { useState, useEffect, useMemo } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Search, BookOpen, FileText, Users, Calendar, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { useAuth, UserRole } from '@/contexts/auth-context';

interface SearchItem {
    id: string;
    title: string;
    description?: string;
    type: 'subject' | 'assignment' | 'teacher' | 'schedule' | 'setting';
    href: string;
    icon?: React.ReactNode;
    roles: UserRole[];
}

const navigationItems: SearchItem[] = [
    { id: 'student-subjects', title: 'المواد الدراسية', type: 'subject', href: '/student/subjects', icon: <BookOpen className="w-4 h-4" />, roles: ['student'] },
    { id: 'student-assignments', title: 'الواجبات', type: 'assignment', href: '/student/assignments', icon: <FileText className="w-4 h-4" />, roles: ['student'] },
    { id: 'student-schedule', title: 'الجدول الدراسي', type: 'schedule', href: '/student/schedule', icon: <Calendar className="w-4 h-4" />, roles: ['student'] },
    { id: 'student-settings', title: 'إعدادات الحساب', type: 'setting', href: '/student/settings', icon: <Settings className="w-4 h-4" />, roles: ['student'] },
    { id: 'teacher-classes', title: 'فصولي', type: 'teacher', href: '/teacher/classes', icon: <Users className="w-4 h-4" />, roles: ['teacher'] },
    { id: 'teacher-assignments', title: 'إدارة الواجبات', type: 'assignment', href: '/teacher/assignments', icon: <FileText className="w-4 h-4" />, roles: ['teacher'] },
    { id: 'teacher-schedule', title: 'الجدول الدراسي', type: 'schedule', href: '/teacher/schedule', icon: <Calendar className="w-4 h-4" />, roles: ['teacher'] },
    { id: 'teacher-settings', title: 'إعدادات الحساب', type: 'setting', href: '/teacher/settings', icon: <Settings className="w-4 h-4" />, roles: ['teacher'] },
];

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<SearchItem[]>([]);
    const router = useRouter();
    const { profile } = useAuth();

    const availableItems = useMemo(() => navigationItems.filter(item => item.roles.includes(profile?.role || 'student')), [profile?.role]);
    const fuse = useMemo(() => new Fuse(availableItems, {
        keys: ['title', 'description'],
        threshold: 0.3,
    }), [availableItems]);

    // Keyboard shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    // Search functionality
    useEffect(() => {
        if (search === '') {
            setResults(availableItems);
        } else {
            const searchResults = fuse.search(search).map(result => result.item);
            setResults(searchResults);
        }
    }, [search, availableItems, fuse]);

    const handleSelect = (href: string) => {
        setOpen(false);
        router.push(href);
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'subject': return 'text-blue-600 dark:text-blue-400';
            case 'assignment': return 'text-green-600 dark:text-green-400';
            case 'teacher': return 'text-purple-600 dark:text-purple-400';
            case 'schedule': return 'text-yellow-600 dark:text-yellow-400';
            case 'setting': return 'text-gray-600 dark:text-gray-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    const groupedResults = results.reduce((acc, item) => {
        if (!acc[item.type]) {
            acc[item.type] = [];
        }
        acc[item.type]!.push(item);
        return acc;
    }, {} as Record<string, SearchItem[]>);

    return (
        <>
            {/* Search Trigger Button */}
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-full md:w-auto"
            >
                <Search className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">بحث</span>
                <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-1.5 font-mono text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>

            {/* Search Dialog */}
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="ابحث عن صفحة في النظام..."
                    value={search}
                    onValueChange={setSearch}
                />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    {Object.entries(groupedResults).map(([type, items]) => (
                        <CommandGroup key={type} heading={type.charAt(0).toUpperCase() + type.slice(1) + 's'}>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    onSelect={() => handleSelect(item.href)}
                                    className="cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className={getTypeColor(item.type)}>
                                            {item.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                                            {item.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ))}
                </CommandList>
            </CommandDialog>
        </>
    );
}
