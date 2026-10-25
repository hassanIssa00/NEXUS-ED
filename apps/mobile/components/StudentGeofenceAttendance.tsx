import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/lib/api';
import { BRAND } from '@/constants/Config';
import { ErrorNotice, PrimaryButton, SectionHeading, Surface } from './mobile-ui';

type CurrentPeriod = {
  scheduleEventId: string;
  className: string;
  subjectName: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  alreadyRecorded: boolean;
};
type CheckInResponse = {
  allowed: boolean;
  schoolName: string;
  distanceMeters: number;
  accuracyMeters: number;
  radiusMeters: number;
  currentPeriods: CurrentPeriod[];
  requiresPeriodSelection: boolean;
  checkIn: null | { className: string; subjectName: string; periodNumber: number; alreadyRecorded: boolean };
};

function errorMessage(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('، ') : message || error?.message || 'تعذر التحقق من الموقع وتسجيل الحضور.';
}

export function StudentGeofenceAttendance() {
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const checkIn = async (scheduleEventId?: string) => {
    setBusy(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('يلزم السماح بالوصول للموقع أثناء الاستخدام لتسجيل الحضور من المدرسة.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const accuracyMeters = position.coords.accuracy;
      if (accuracyMeters === null || !Number.isFinite(accuracyMeters)) throw new Error('لم نحصل على دقة GPS صالحة. حاول من مكان مفتوح.');
      const { data } = await apiClient.post<CheckInResponse>('/attendance/student/geofence/check-in', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters,
        ...(scheduleEventId ? { scheduleEventId } : {}),
      });
      setResult(data);
      if (data.checkIn) setError('');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return <Surface style={styles.surface}>
    <SectionHeading title="تسجيل الحضور من المدرسة" />
    <Text style={styles.description}>عند الضغط، يتحقق الخادم من موقعك وجدولك الحالي. لا يُسجل الحضور إذا كنت خارج النطاق أو لا توجد حصة الآن.</Text>
    {error ? <ErrorNotice>{error}</ErrorNotice> : null}
    {busy ? <View style={styles.loading}><ActivityIndicator color={BRAND.teal} /><Text style={styles.meta}>جارٍ تحديد الموقع والتحقق مع المدرسة…</Text></View> : null}
    {!busy ? <PrimaryButton title="تحقق من موقعي وسجل الحضور" icon="location-outline" onPress={() => void checkIn()} loading={busy} /> : null}
    {result?.requiresPeriodSelection ? <View style={styles.periodList}>
      <Text style={styles.description}>تم التحقق من وجودك داخل {result.radiusMeters} متر من المدرسة. اختر الحصة الحالية لتسجيلها:</Text>
      {result.currentPeriods.map((period) => <View key={period.scheduleEventId} style={styles.periodRow}>
        <View style={styles.periodCopy}><Text style={styles.periodTitle}>{period.subjectName} · {period.className}</Text><Text style={styles.meta}>الحصة {period.periodNumber} · {period.startTime}–{period.endTime}</Text></View>
        <PrimaryButton title={period.alreadyRecorded ? 'تم التسجيل' : 'تسجيل'} icon={period.alreadyRecorded ? 'checkmark' : 'checkmark-circle-outline'} onPress={() => void checkIn(period.scheduleEventId)} disabled={period.alreadyRecorded || busy} />
      </View>)}
    </View> : null}
    {result?.allowed && !result.checkIn && !result.requiresPeriodSelection ? <View style={styles.notice}><Ionicons name="information-circle-outline" size={18} color={BRAND.blue} /><Text style={styles.noticeText}>أنت داخل نطاق المدرسة ({result.distanceMeters} م)، لكن لا توجد حصة مسجلة في جدولك الآن؛ لم يُسجل حضور.</Text></View> : null}
    {result?.checkIn ? <View style={styles.success}><Ionicons name="checkmark-circle" size={22} color={BRAND.teal} /><Text style={styles.successText}>{result.checkIn.alreadyRecorded ? 'الحضور مسجل بالفعل' : 'تم تسجيل حضورك'} · الحصة {result.checkIn.periodNumber} · {result.checkIn.subjectName}</Text></View> : null}
  </Surface>;
}

const styles = StyleSheet.create({
  surface: { gap: 12 },
  description: { color: BRAND.muted, fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  loading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, justifyContent: 'center', padding: 10 },
  meta: { color: BRAND.muted, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  periodList: { gap: 9 },
  periodRow: { gap: 9, padding: 11, borderWidth: 1, borderColor: BRAND.line, borderRadius: 12, backgroundColor: '#FBFCFD' },
  periodCopy: { alignItems: 'flex-end', gap: 4 },
  periodTitle: { color: BRAND.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  notice: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 7, padding: 11, borderRadius: 10, backgroundColor: BRAND.blueSoft },
  noticeText: { flex: 1, color: BRAND.blue, fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  success: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 11, borderRadius: 10, backgroundColor: BRAND.tealSoft },
  successText: { flex: 1, color: BRAND.teal, fontSize: 13, fontWeight: '800', lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
});
