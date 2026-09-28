'use client';

import { useState } from 'react';
import { Users, Shield, Activity, Settings, BarChart3, FileText, Database } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AdminDashboardPage() {
    const t = useTranslations();

    const stats = [
        { label: 'إجمالي المستخدمين', value: '1,234', icon: Users, color: 'from-blue-500 to-blue-600', change: '+12%' },
        { label: 'الأنشطة اليوم', value: '456', icon: Activity, color: 'from-green-500 to-green-600', change: '+8%' },
        { label: 'الفصول النشطة', value: '48', icon: Database, color: 'from-purple-500 to-purple-600', change: '+5%' },
        { label: 'المحتوى', value: '892', icon: FileText, color: 'from-orange-500 to-orange-600', change: '+15%' },
    ];

    const recentUsers = [
        { name: 'أحمد فيصل الغامدي', role: 'طالب', status: 'active', email: 'ahmed.faisal@nexus.edu.sa', joined: '2026-08-15' },
        { name: 'د. إسماعيل عيسى', role: 'معلم (رائد الفصل)', status: 'active', email: 'ismail.issa@nexus.edu.sa', joined: '2026-08-01' },
        { name: 'فيصل الغامدي', role: 'ولي أمر', status: 'active', email: 'faisal.alghamdi@nexus.edu.sa', joined: '2026-08-15' },
    ];

    const systemHealth = [
        { name: 'Database', status: 'healthy', uptime: '99.9%', color: 'text-green-500' },
        { name: 'API Server', status: 'healthy', uptime: '99.8%', color: 'text-green-500' },
        { name: 'Storage', status: 'warning', uptime: '95.2%', color: 'text-yellow-500' },
    ];

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">🛡️ لوحة التحكم الإدارية</h1>
                <p className="text-muted-foreground mt-2">
                    إدارة كاملة للمنصة والمستخدمين
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className={`bg-gradient-to-br ${stat.color} text-white p-6 rounded-xl`}>
                            <div className="flex items-center justify-between mb-4">
                                <Icon className="w-8 h-8" />
                                <span className="text-sm bg-white/20 px-2 py-1 rounded">
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-sm opacity-90">{stat.label}</p>
                            <p className="text-3xl font-bold">{stat.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all text-right group">
                    <Users className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-bold text-lg mb-1">إدارة المستخدمين</h3>
                    <p className="text-sm text-muted-foreground">إضافة، تعديل وحذف المستخدمين</p>
                </button>

                <button className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all text-right group">
                    <Shield className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-bold text-lg mb-1">الصلاحيات</h3>
                    <p className="text-sm text-muted-foreground">إدارة الأدوار والصلاحيات</p>
                </button>

                <button className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all text-right group">
                    <Settings className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-bold text-lg mb-1">إعدادات النظام</h3>
                    <p className="text-sm text-muted-foreground">تخصيص المنصة والإعدادات</p>
                </button>
            </div>

            {/* Recent Users */}
            <div>
                <h2 className="text-2xl font-bold mb-4">المستخدمون الجدد</h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-4 text-right text-sm font-medium">الاسم</th>
                                <th className="px-6 py-4 text-right text-sm font-medium">الدور</th>
                                <th className="px-6 py-4 text-right text-sm font-medium">البريد</th>
                                <th className="px-6 py-4 text-right text-sm font-medium">تاريخ الانضمام</th>
                                <th className="px-6 py-4 text-right text-sm font-medium">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {recentUsers.map((user, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                                    <td className="px-6 py-4 font-medium">{user.name}</td>
                                    <td className="px-6 py-4">{user.role}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{user.joined}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs ${user.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {user.status === 'active' ? 'نشط' : 'معلق'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* System Health */}
            <div>
                <h2 className="text-2xl font-bold mb-4">صحة النظام</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {systemHealth.map((system, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold">{system.name}</h3>
                                <span className={`${system.color} text-2xl`}>●</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">وقت التشغيل</p>
                            <p className="text-2xl font-bold">{system.uptime}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
