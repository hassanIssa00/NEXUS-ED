'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ComparisonChartProps {
    lastWeek?: number | null;
    thisWeek?: number | null;
    lastMonth?: number | null;
    thisMonth?: number | null;
}

export default function ComparisonChart({ lastWeek, thisWeek, lastMonth, thisMonth }: ComparisonChartProps) {
    const data = [
        { name: 'الأسبوع الماضي', points: lastWeek },
        { name: 'هذا الأسبوع', points: thisWeek },
        { name: 'الشهر الماضي', points: lastMonth },
        { name: 'هذا الشهر', points: thisMonth },
    ].filter((item): item is { name: string; points: number } =>
        typeof item.points === 'number' && Number.isFinite(item.points),
    );

    return (
        <div className="bg-card border rounded-lg p-6" dir="rtl">
            <h3 className="text-lg font-semibold mb-4">مقارنة النقاط المسجلة</h3>
            {data.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">لا توجد بيانات مقارنة متاحة.</p>
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
                        <Bar dataKey="points" name="النقاط" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
