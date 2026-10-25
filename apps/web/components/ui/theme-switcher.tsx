'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

type Theme = 'light' | 'dark' | 'system';
type ColorScheme = 'blue' | 'purple' | 'green' | 'orange' | 'rose';

interface ThemeConfig {
    theme: Theme;
    colorScheme: ColorScheme;
}

const colorSchemes: Record<ColorScheme, { name: string; nameEn: string; primary: string; accent: string }> = {
    blue: { name: 'كحلي', nameEn: 'Navy', primary: '#234A65', accent: '#98793E' },
    purple: { name: 'ذهبي', nameEn: 'Gold', primary: '#98793E', accent: '#234A65' },
    green: { name: 'أخضر', nameEn: 'Green', primary: '#10b981', accent: '#34d399' },
    orange: { name: 'برتقالي', nameEn: 'Orange', primary: '#f59e0b', accent: '#fbbf24' },
    rose: { name: 'وردي', nameEn: 'Rose', primary: '#f43f5e', accent: '#fb7185' },
};

export function ThemeSwitcher() {
    const isEnglish = useLocale() === 'en';
    const [config, setConfig] = useState<ThemeConfig>({ theme: 'system', colorScheme: 'blue' });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load saved preferences
        const saved = localStorage.getItem('theme-config');
        if (saved) {
            try {
                setConfig(JSON.parse(saved));
            } catch {
                // Ignore parse errors
            }
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Apply theme
        const root = document.documentElement;
        if (config.theme === 'dark' || (config.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Apply color scheme
        root.style.setProperty('--color-primary', colorSchemes[config.colorScheme].primary);
        root.style.setProperty('--color-accent', colorSchemes[config.colorScheme].accent);

        // Save preferences
        localStorage.setItem('theme-config', JSON.stringify(config));
    }, [config, mounted]);

    if (!mounted) return null;

    const setTheme = (theme: Theme) => setConfig((prev) => ({ ...prev, theme }));
    const setColorScheme = (colorScheme: ColorScheme) => setConfig((prev) => ({ ...prev, colorScheme }));

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <motion.div
                        key={config.theme}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                    >
                        {config.theme === 'dark' ? (
                            <Moon className="w-5 h-5" />
                        ) : config.theme === 'light' ? (
                            <Sun className="w-5 h-5" />
                        ) : (
                            <Palette className="w-5 h-5" />
                        )}
                    </motion.div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{isEnglish ? 'Appearance' : 'المظهر'}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="w-4 h-4 me-2" />
                    {isEnglish ? 'Light' : 'فاتح'}
                    {config.theme === 'light' && <Check className="w-4 h-4 mr-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="w-4 h-4 me-2" />
                    {isEnglish ? 'Dark' : 'داكن'}
                    {config.theme === 'dark' && <Check className="w-4 h-4 mr-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Palette className="w-4 h-4 me-2" />
                    {isEnglish ? 'System' : 'تلقائي'}
                    {config.theme === 'system' && <Check className="w-4 h-4 mr-auto" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>{isEnglish ? 'Accent color' : 'اللون الرئيسي'}</DropdownMenuLabel>
                
                <div className="p-2 grid grid-cols-5 gap-2">
                    {(Object.keys(colorSchemes) as ColorScheme[]).map((scheme) => (
                        <motion.button
                            key={scheme}
                            onClick={() => setColorScheme(scheme)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                config.colorScheme === scheme ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                            }`}
                            style={{ backgroundColor: colorSchemes[scheme].primary }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            title={isEnglish ? colorSchemes[scheme].nameEn : colorSchemes[scheme].name}
                        >
                            {config.colorScheme === scheme && (
                                <Check className="w-4 h-4 text-white" />
                            )}
                        </motion.button>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
