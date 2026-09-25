'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Check, X, Clock, Camera, ScanFace, QrCode, Sparkles, UserCheck,
  Calendar, Layers, RefreshCw, Volume2, VolumeX, Maximize2, ShieldCheck,
  CheckCircle2, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  nexusBridge,
  ClassStudentRecord,
  DailyAttendanceRecord,
  DAILY_PERIODS
} from '@/lib/nexusDataBridge';

export default function AttendancePage() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [students, setStudents] = useState<ClassStudentRecord[]>([]);
  const [attendance, setAttendance] = useState<DailyAttendanceRecord[]>([]);
  const [isFaceKioskOpen, setIsFaceKioskOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedStudentName, setScannedStudentName] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadData = () => {
    setStudents(nexusBridge.getStudents());
    setAttendance(nexusBridge.getTodayAttendance());
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('nexus:data-changed', handleSync);
    return () => window.removeEventListener('nexus:data-changed', handleSync);
  }, []);

  const getStudentPeriodStatus = (studentId: string, periodNum: number): 'present' | 'absent' | 'late' => {
    const studentRecord = attendance.find((a) => a.studentId === studentId);
    return studentRecord?.periods?.[periodNum]?.status || studentRecord?.overallStatus || 'present';
  };

  const updateStudentStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    nexusBridge.markStudentAttendance(studentId, selectedPeriod, status, 'manual_teacher');
    loadData();
  };

  const handleMarkAllPresent = () => {
    students.forEach((s) => {
      nexusBridge.markStudentAttendance(s.id, selectedPeriod, 'present', 'manual_teacher');
    });
    loadData();
    toast({
      title: 'تم تحضير جميع الطلاب ✅',
      description: `تم رصد حضور جميع طلاب الفصل للحصة (${selectedPeriod}).`,
    });
  };

  // Face Recognition Kiosk Simulation / Camera Stream
  const startCamera = async () => {
    setIsFaceKioskOpen(true);
    setCameraActive(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch {
      // Camera permission or device fallback
      console.warn('Camera not accessible, falling back to simulated biometric recognition.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsFaceKioskOpen(false);
    setScannedStudentName(null);
  };

  const simulateFaceScan = (student: ClassStudentRecord) => {
    setScannedStudentName(student.fullName);
    nexusBridge.markStudentAttendance(student.id, selectedPeriod, 'present', 'biometric_face');
    loadData();
    setTimeout(() => {
      setScannedStudentName(null);
    }, 2500);
  };

  const currentPeriodInfo = DAILY_PERIODS.find((p) => p.periodNumber === selectedPeriod);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              التحضير الذكي اليومي 📅
            </h2>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
              فصل د. إسماعيل عيسى
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            رصد الحضور بالحصص الـ 7 وبصمة الوجه البيومترية المتزامنة مع بوابات أولياء الأمور والطلاب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <Select
            value={String(selectedPeriod)}
            onValueChange={(val) => setSelectedPeriod(Number(val))}
          >
            <SelectTrigger className="w-[190px] h-10 rounded-xl font-bold bg-white dark:bg-[#1e1e2d]">
              <SelectValue placeholder="اختر الحصة" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {DAILY_PERIODS.map((p) => (
                <SelectItem key={p.periodNumber} value={String(p.periodNumber)} className="font-bold">
                  الحصة {p.periodNumber}: {p.subjectName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={startCamera}
            variant="outline"
            className="h-10 rounded-xl font-bold gap-1.5 border-teal-500/30 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 shadow-xs"
          >
            <ScanFace className="w-4 h-4 text-teal-500" />
            بصمة الوجه (Face ID)
          </Button>

          <Button
            onClick={handleMarkAllPresent}
            className="h-10 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-xs"
          >
            <UserCheck className="w-4 h-4 ml-1.5" />
            تحضير الجميع حاضر
          </Button>
        </div>
      </div>

      {/* Current Active Period Card */}
      {currentPeriodInfo && (
        <Card className="rounded-2xl border-primary/20 bg-primary/5 p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-white font-black">
                {currentPeriodInfo.periodNumber}
              </span>
              <span>الحصة الحالية: {currentPeriodInfo.subjectName}</span>
              <span className="text-muted-foreground">• المعلم: {currentPeriodInfo.teacherName}</span>
            </div>
            <div className="flex items-center gap-3 font-semibold text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {currentPeriodInfo.startTime} – {currentPeriodInfo.endTime}
              </span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">
                حاضر: {students.filter((s) => getStudentPeriodStatus(s.id, selectedPeriod) === 'present').length}
              </span>
              <span>•</span>
              <span className="text-rose-600 font-bold">
                غائب: {students.filter((s) => getStudentPeriodStatus(s.id, selectedPeriod) === 'absent').length}
              </span>
              <span>•</span>
              <span className="text-amber-600 font-bold">
                متأخر: {students.filter((s) => getStudentPeriodStatus(s.id, selectedPeriod) === 'late').length}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Students Attendance Grid */}
      <Card className="rounded-3xl border-gray-100 dark:border-white/5 shadow-sm overflow-hidden bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5">
          <CardTitle className="text-base font-black text-gray-900 dark:text-white">
            كشف رصد الحضور — الحصة {selectedPeriod} ({currentPeriodInfo?.subjectName})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {students.map((student) => {
              const status = getStudentPeriodStatus(student.id, selectedPeriod);
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 border border-gray-100 dark:border-white/5 rounded-2xl bg-white dark:bg-[#252538] hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 rounded-xl bg-primary/10 text-primary font-bold text-xs">
                      <AvatarFallback>{student.fullName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {student.fullName}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {student.parentName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateStudentStatus(student.id, 'present')}
                      className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        status === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-600 hover:bg-emerald-50'
                      }`}
                      title="حاضر"
                    >
                      <Check className="w-3.5 h-3.5" />
                      حاضر
                    </button>

                    <button
                      onClick={() => updateStudentStatus(student.id, 'late')}
                      className={`h-8 px-2 rounded-lg text-xs font-bold transition-colors flex items-center ${
                        status === 'late'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-600 hover:bg-amber-50'
                      }`}
                      title="متأخر"
                    >
                      متأخر
                    </button>

                    <button
                      onClick={() => updateStudentStatus(student.id, 'absent')}
                      className={`h-8 px-2 rounded-lg text-xs font-bold transition-colors flex items-center ${
                        status === 'absent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-600 hover:bg-rose-50'
                      }`}
                      title="غائب"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Face ID Biometric Attendance Kiosk Modal */}
      {isFaceKioskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#1e1e2d] rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/10 space-y-5 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-500/10 text-teal-600">
                  <ScanFace className="w-5 h-5" />
                </span>
                <div className="text-right">
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    كشك التحضير البيومتري الذكي (Face ID)
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    التعرف الفوري على ملامح الطالب وتسجيل الحضور بالذكاء الاصطناعي
                  </p>
                </div>
              </div>
              <button
                onClick={stopCamera}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Viewport */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border-2 border-teal-500/30 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Scanning Target Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-56 h-56 rounded-3xl border-2 border-dashed border-teal-400/80 animate-pulse flex items-center justify-center">
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-teal-400" />
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-teal-400" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-teal-400" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-teal-400" />
                  <span className="text-[11px] font-bold text-teal-300 bg-black/60 px-3 py-1 rounded-full">
                    وجّه الوجه نحو الإطار
                  </span>
                </div>
              </div>

              {/* Success Notification on detection */}
              {scannedStudentName && (
                <div className="absolute bottom-4 inset-x-4 bg-emerald-600 text-white py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 animate-in slide-in-from-bottom duration-300">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span className="font-black text-sm">
                    تم التحقق بنجاح: {scannedStudentName} (حاضر الحصة {selectedPeriod})
                  </span>
                </div>
              )}
            </div>

            {/* Quick Simulate Buttons for Real Students */}
            <div className="space-y-2 text-right">
              <p className="text-xs font-bold text-gray-500">
                أو انقر لتسجيل حضور طالب فورياً عبر بصمة الوجه:
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {students.map((st) => (
                  <Button
                    key={st.id}
                    variant="outline"
                    size="sm"
                    onClick={() => simulateFaceScan(st)}
                    className="text-xs rounded-xl border-teal-500/20 hover:bg-teal-50 dark:hover:bg-teal-900/20 font-bold"
                  >
                    <UserCheck className="w-3.5 h-3.5 ml-1 text-teal-600" />
                    {st.fullName}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={stopCamera}
                className="w-full h-11 rounded-xl font-bold bg-primary text-white"
              >
                إغلاق كشك التحضير والعودة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
