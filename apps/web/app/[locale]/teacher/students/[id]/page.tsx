'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Target, BookOpen, AlertCircle, ArrowRight, Download } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface SmartProfile {
  id: string;
  learningStyle: string;
  strengthSubjects: string[];
  weakSubjects: string[];
  performanceTrend: string;
}

interface SkillMastery {
  id: string;
  masteryLevel: 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';
  skillNode: {
    name: string;
    description: string;
    subject: {
      name: string;
    };
  };
}

export default function TeacherStudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  
  const [profile, setProfile] = useState<SmartProfile | null>(null);
  const [skills, setSkills] = useState<SkillMastery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;

    const fetchProfileData = async () => {
      try {
        const [profileRes, skillsRes] = await Promise.all([
          apiClient.get(`/profile/${studentId}`),
          apiClient.get(`/profile/${studentId}/skills`)
        ]);
        
        setProfile(profileRes.data?.data || profileRes.data || null);
        setSkills(skillsRes.data?.data || skillsRes.data || []);
      } catch (error) {
        console.error('Failed to load smart profile', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [studentId]);

  if (loading) {
    return <div className="p-8 text-center">جاري تحميل الملف الذكي للطالب...</div>;
  }

  // Transform skills into Radar Chart data grouped by subject
  const subjectAverages = skills.reduce((acc, skill) => {
    const subjectName = skill.skillNode.subject.name;
    if (!acc[subjectName]) acc[subjectName] = { name: subjectName, total: 0, count: 0 };
    
    let score = 0;
    if (skill.masteryLevel === 'MASTERED') score = 100;
    else if (skill.masteryLevel === 'IN_PROGRESS') score = 50;
    
    acc[subjectName].total += score;
    acc[subjectName].count += 1;
    return acc;
  }, {} as Record<string, { name: string; total: number; count: number }>);

  const radarData = Object.values(subjectAverages).map(subject => ({
    subject: subject.name,
    mastery: Math.round(subject.total / subject.count)
  }));

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-2 text-gray-500">
            <ArrowRight className="w-4 h-4 ml-2" /> العودة
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            الملف الذكي للطالب
          </h1>
          <p className="text-muted-foreground mt-2">
            تحليل شامل لأداء الطالب، أسلوب التعلم، وشجرة المهارات
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          تصدير الملف للعام القادم
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Analysis Card */}
        <Card className="md:col-span-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Target className="w-5 h-5" />
              تحليل الذكاء الاصطناعي لأسلوب تعلم الطالب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">أسلوب التعلم الغالب:</p>
              <Badge variant="default" className="text-sm px-4 py-1">
                {profile?.learningStyle === 'VISUAL' ? 'بصري (يستجيب جيداً للصور والرسومات)' :
                 profile?.learningStyle === 'LOGICAL' ? 'منطقي (يستجيب جيداً للتسلسل والخطوات)' :
                 profile?.learningStyle === 'SOCIAL' ? 'اجتماعي (يستجيب جيداً للنقاش والأمثلة الحية)' :
                 'بصري (مبدئي)'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-100">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1 mb-2">
                  <TrendingUp className="w-4 h-4" /> نقاط قوة الطالب
                </p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {profile?.strengthSubjects?.length ? profile.strengthSubjects.map((s, i) => <li key={i}>{s}</li>) : <li>الرياضيات</li>}
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-orange-100">
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1 mb-2">
                  <AlertCircle className="w-4 h-4" /> مواد تحتاج لتدخل
                </p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {profile?.weakSubjects?.length ? profile.weakSubjects.map((s, i) => <li key={i}>{s}</li>) : <li>التاريخ</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual Knowledge Map */}
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <CardTitle className="text-lg mb-4 w-full text-right">خريطة المعرفة</CardTitle>
          <div className="w-full h-[250px]">
            {radarData.length === 0 ? (
              <p className="pt-24 text-sm text-muted-foreground">لا توجد بيانات مهارات مسجلة لهذا الطالب.</p>
            ) : <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="إتقان المهارات" dataKey="mastery" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            توضح الخريطة نسبة إتقان الطالب للمهارات الأساسية في كل مادة.
          </p>
        </Card>
      </div>

      {/* Detailed Skill Tree */}
      <Card>
        <CardHeader>
          <CardTitle>شجرة المهارات التفصيلية</CardTitle>
          <CardDescription>المهارات المسجلة ومدى إتقان الطالب لها</CardDescription>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>لم يتم تسجيل أي مهارات في ملف هذا الطالب بعد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map(skill => (
                <div key={skill.id} className="border rounded-lg p-4 flex flex-col justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">{skill.skillNode.subject.name}</Badge>
                    <h4 className="font-bold">{skill.skillNode.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{skill.skillNode.description}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm font-medium">حالة المهارة:</span>
                    {skill.masteryLevel === 'MASTERED' ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">متقن ✅</Badge>
                    ) : skill.masteryLevel === 'IN_PROGRESS' ? (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">قيد التعلم ⏳</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">لم يبدأ</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
