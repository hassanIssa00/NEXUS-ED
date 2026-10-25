'use client';

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';

interface PerformanceChartProps {
    data: Array<{
        name: string;
        score: number;
        average: number;
    }>;
}

export function PerformanceChart({ data }: PerformanceChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4A687C" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4A687C" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                    }}
                />
                <Legend />
                <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#4A687C"
                    fillOpacity={1}
                    fill="url(#colorScore)"
                    name="Your Score"
                />
                <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Class Average"
                    strokeDasharray="5 5"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

interface SubjectPerformanceProps {
    data: Array<{
        subject: string;
        score: number;
        color: string;
    }>;
}

export function SubjectPerformanceChart({ data }: SubjectPerformanceProps) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="subject" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                    }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

interface AttendanceChartProps {
    data: Array<{
        name: string;
        value: number;
    }>;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

export function AttendanceChart({ data }: AttendanceChartProps) {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#4A687C"
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
            </PieChart>
        </ResponsiveContainer>
    );
}

interface WeeklyActivityProps {
    data: Array<{
        day: string;
        hours: number;
    }>;
}

export function WeeklyActivityChart({ data }: WeeklyActivityProps) {
    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                    }}
                />
                <Bar dataKey="hours" fill="#234A65" radius={[8, 8, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
