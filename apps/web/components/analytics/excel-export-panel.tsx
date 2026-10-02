'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api/client';

interface ExcelDownloadButtonProps {
  endpoint: string;
  filename: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export function ExcelDownloadButton({
  endpoint,
  filename,
  label,
  description,
  icon,
}: ExcelDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(endpoint, { responseType: 'blob' });
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('فشل تحميل الملف. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      className="gap-2"
      variant="outline"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon || <Download className="w-4 h-4" />
      )}
      {label}
    </Button>
  );
}

interface ExcelExportPanelProps {
  studentId?: string;
  subjectId?: string;
  classId?: string;
}

export function ExcelExportPanel({ studentId, subjectId, classId }: ExcelExportPanelProps) {
  const exports = [];

  if (studentId) {
    exports.push(
      {
        endpoint: `/export/student/${studentId}/grades`,
        filename: `student_grades_${studentId}.xlsx`,
        label: 'تصدير الدرجات',
        description: 'جميع الدرجات في ملف Excel',
      },
      {
        endpoint: `/export/student/${studentId}/report`,
        filename: `student_report_${studentId}.xlsx`,
        label: 'التقرير الشامل',
        description: 'معلومات + درجات + حضور',
      },
      {
        endpoint: `/export/student/${studentId}/analytics`,
        filename: `student_analytics_${studentId}.xlsx`,
        label: 'التحليلات',
        description: 'ملخص الأداء لكل مادة',
      }
    );
  }

  if (subjectId) {
    exports.push({
      endpoint: `/export/subject/${subjectId}/grades`,
      filename: `subject_grades_${subjectId}.xlsx`,
      label: 'تصدير درجات المادة',
      description: 'كل درجات الطلاب في هذه المادة',
    });
  }

  if (classId) {
    exports.push({
      endpoint: `/export/class/${classId}/attendance`,
      filename: `class_attendance_${classId}.xlsx`,
      label: 'تصدير الحضور والغياب',
      description: 'سجل الحضور للشهر الأخير',
    });
  }

  if (exports.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          تصدير البيانات إلى Excel
        </CardTitle>
        <CardDescription>قم بتحميل البيانات بصيغة Excel لسهولة التعامل معها</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exports.map((exp, index) => (
            <motion.div
              key={exp.endpoint}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border rounded-lg hover:border-blue-500 transition-colors"
            >
              <h4 className="font-medium mb-1">{exp.label}</h4>
              {exp.description && (
                <p className="text-sm text-gray-500 mb-3">{exp.description}</p>
              )}
              <ExcelDownloadButton
                endpoint={exp.endpoint}
                filename={exp.filename}
                label="تحميل"
                icon={<FileSpreadsheet className="w-4 h-4" />}
              />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
