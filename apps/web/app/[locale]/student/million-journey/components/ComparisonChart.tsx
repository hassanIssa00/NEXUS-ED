'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocale } from 'next-intl';

interface ComparisonChartProps {
    lastWeek?: number | null;
    thisWeek?: number | null;
    lastMonth?: number | null;
    thisMonth?: number | null;
}

export default function ComparisonChart({ lastWeek, thisWeek, lastMonth, thisMonth }: ComparisonChartProps) {
    const isEnglish = useLocale() === 'en';
    const data = [
        { name: isEnglish ? 'Last week' : 'الأسبوع الماضي', points: lastWeek },
        { name: isEnglish ? 'This week' : 'هذا الأسبوع', points: thisWeek },
        { name: isEnglish ? 'Last month' : 'الشهر الماضي', points: lastMonth },
        { name: isEnglish ? 'This month' : 'هذا الشهر', points: thisMonth },
    ].filter((item): item is { name: string; points: number } =>
        typeof item.points === 'number' && Number.isFinite(item.points),
    );

    return (
        <div className="bg-card border rounded-lg p-6" dir={isEnglish ? 'ltr' : 'rtl'}>
            <h3 className="text-lg font-semibold mb-4">{isEnglish ? 'Recorded points comparison' : 'مقارنة النقاط المسجلة'}</h3>
            {data.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">{isEnglish ? 'No comparison data is available.' : 'لا توجد بيانات مقارنة متاحة.'}</p>
            ) : (
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" className="text-sm" />
                        <YAxis className="text-sm" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                            }}
                        />
                        <Bar dataKey="points" name={isEnglish ? 'Points' : 'النقاط'} fill="#98793E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
