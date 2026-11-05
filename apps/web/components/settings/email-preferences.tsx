'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Bell, FileText, AlertCircle, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmailPreference {
  type: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
  color: string;
}

export function EmailPreferencesPanel() {
  const [preferences, setPreferences] = useState<EmailPreference[]>([
    {
      type: 'absence',
      title: 'إشعارات الغياب',
      description: 'إخطار ولي الأمر عند غياب الطالب',
      enabled: true,
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-red-600',
    },
    {
      type: 'exam_reminder',
      title: 'تذكير بالامتحانات',
      description: 'إرسال تذكير للطالب قبل الامتحان',
      enabled: true,
      icon: <FileText className="w-5 h-5" />,
      color: 'text-blue-600',
    },
    {
      type: 'late_assignment',
      title: 'واجبات متأخرة',
      description: 'إشعار عند تأخر تسليم الواجب',
      enabled: true,
      icon: <Bell className="w-5 h-5" />,
      color: 'text-orange-600',
    },
    {
      type: 'grade_posted',
      title: 'درجات جديدة',
      description: 'إخطار عند رصد درجة جديدة',
      enabled: true,
      icon: <GraduationCap className="w-5 h-5" />,
      color: 'text-green-600',
    },
    {
      type: 'weekly_report',
      title: 'التقرير الأسبوعي',
      description: 'ملخص أسبوعي لأولياء الأمور',
      enabled: false,
      icon: <Mail className="w-5 h-5" />,
      color: 'text-purple-600',
    },
  ]);

  const handleToggle = (type: string) => {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.type === type ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  const enabledCount = preferences.filter((p) => p.enabled).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              إعدادات البريد الإلكتروني
            </CardTitle>
            <CardDescription>
              تحكم في أنواع الإشعارات التي تود استلامها عبر البريد الإلكتروني
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">
            {enabledCount} مُفعّل
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {preferences.map((pref, index) => (
            <motion.div
              key={pref.type}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                pref.enabled
                  ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 bg-gray-50 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className={`mt-1 ${pref.color}`}>
                  {pref.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{pref.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {pref.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={pref.enabled}
                onCheckedChange={() => handleToggle(pref.type)}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>ملاحظة:</strong> سيتم إرسال الإشعارات المُفعّلة إلى البريد الإلكتروني المسجل في حسابك.
            تأكد من صحة بريدك الإلكتروني في{' '}
            <a href="/student/profile" className="underline">
              إعدادات الملف الشخصي
            </a>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
