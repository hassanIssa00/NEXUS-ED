import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/lib/api';
import { BRAND } from '@/constants/Config';
import { ChoiceButton, EmptyState, ErrorNotice, SectionHeading, Surface } from './mobile-ui';

type ScheduleEvent = {
  id: string;
  dayOfWeek: number;
  periodNumber?: number | null;
  startTime: string;
  endTime: string;
  class?: { name?: string };
  subject?: { name?: string };
};

const days = [
  { id: 0, name: 'الأحد' }, { id: 1, name: 'الاثنين' }, { id: 2, name: 'الثلاثاء' },
  { id: 3, name: 'الأربعاء' }, { id: 4, name: 'الخميس' }, { id: 5, name: 'الجمعة' }, { id: 6, name: 'السبت' },
];

function messageOf(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر تحميل الجدول من سجلات المدرسة.';
}

export function Timetable({ endpoint, title = 'الجدول الدراسي' }: { endpoint: string; title?: string }) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.get<{ success?: boolean; data?: Record<string, ScheduleEvent[]> } | Record<string, ScheduleEvent[]>>(endpoint)
      .then(({ data }) => {
        const grouped = (data as { data?: Record<string, ScheduleEvent[]> })?.data ?? data as Record<string, ScheduleEvent[]>;
        const all = Object.entries(grouped ?? {}).flatMap(([day, dayEvents]) =>
          (Array.isArray(dayEvents) ? dayEvents : []).map((event) => ({ ...event, dayOfWeek: Number(day) })),
        );
        if (active) { setEvents(all.sort((a, b) => a.startTime.localeCompare(b.startTime))); setError(''); }
      })
      .catch((requestError) => { if (active) setError(messageOf(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const dayEvents = useMemo(() => events.filter((event) => event.dayOfWeek === selectedDay), [events, selectedDay]);
  const minuteOfDay = useMemo(() => { const date = new Date(now); return date.getHours() * 60 + date.getMinutes(); }, [now]);
  const today = new Date(now).getDay();
  const currentEvent = selectedDay === today ? dayEvents.find((event) => {
    const start = timeInMinutes(event.startTime); const end = timeInMinutes(event.endTime);
    return start !== null && end !== null && minuteOfDay >= start && minuteOfDay < end;
  }) : undefined;
  const nextEvent = dayEvents.find((event) => {
    const start = timeInMinutes(event.startTime);
    const afterMinute = selectedDay !== today ? null : currentEvent ? timeInMinutes(currentEvent.endTime) : minuteOfDay;
    return start !== null && (afterMinute === null || start >= afterMinute);
  });

  return <View style={styles.wrap}>
    <SectionHeading title={title} />
    {loading ? <ActivityIndicator color={BRAND.teal} /> : null}
    {error ? <ErrorNotice>{error}</ErrorNotice> : null}
    {!loading && !error ? <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {days.map((day) => <TouchableOpacity key={day.id} accessibilityRole="button" accessibilityState={{ selected: selectedDay === day.id }} onPress={() => setSelectedDay(day.id)} activeOpacity={0.82} style={[styles.day, selectedDay === day.id && styles.daySelected, day.id === today && styles.dayToday]}>
          <Text style={[styles.dayName, selectedDay === day.id && styles.dayNameSelected]}>{day.name}</Text>
          {day.id === today ? <View style={[styles.todayMark, selectedDay === day.id && styles.todayMarkSelected]}><Text style={[styles.todayText, selectedDay === day.id && styles.todayTextSelected]}>اليوم</Text></View> : <View style={styles.daySpacer} />}
        </TouchableOpacity>)}
      </ScrollView>
      {currentEvent ? <Surface style={styles.liveCard}>
        <View style={styles.liveIcon}><Ionicons name="radio" size={18} color="#FFFFFF" /></View>
        <View style={styles.copy}><Text style={styles.liveEyebrow}>حصتك الحالية</Text><Text style={styles.subject}>{currentEvent.subject?.name ?? 'حصة دراسية'}</Text><Text style={styles.meta}>{currentEvent.class?.name ? `${currentEvent.class.name} · ` : ''}{currentEvent.periodNumber ? `الحصة ${currentEvent.periodNumber}` : ''} · تنتهي {currentEvent.endTime}</Text></View>
        <View style={styles.liveBadge}><View style={styles.liveDot}/><Text style={styles.liveBadgeText}>جارية الآن</Text></View>
      </Surface> : null}
      {nextEvent ? <Surface style={styles.nextCard}>
        <View style={styles.nextIcon}><Ionicons name="time-outline" size={19} color={BRAND.teal} /></View>
        <View style={styles.copy}><Text style={styles.nextEyebrow}>{selectedDay === today ? 'الحصة القادمة' : `أقرب حصة يوم ${days[selectedDay]?.name ?? ''}`}</Text><Text style={styles.subject}>{nextEvent.subject?.name ?? 'حصة دراسية'}</Text><Text style={styles.meta}>{nextEvent.class?.name ? `${nextEvent.class.name} · ` : ''}{nextEvent.periodNumber ? `الحصة ${nextEvent.periodNumber} · ` : ''}{nextEvent.startTime} – {nextEvent.endTime}</Text></View>
      </Surface> : null}
      {!currentEvent && !nextEvent && dayEvents.length && selectedDay === today ? <View style={styles.dayDone}><Ionicons name="checkmark-circle-outline" size={17} color={BRAND.muted}/><Text style={styles.meta}>انتهت حصص اليوم</Text></View> : null}
      {dayEvents.length ? dayEvents.map((event) => <Surface key={event.id} style={styles.event}>
        <View style={styles.time}><Text style={styles.timeText}>{event.startTime}</Text><Text style={styles.meta}>إلى {event.endTime}</Text></View>
        <View style={styles.copy}><Text style={styles.subject}>{event.subject?.name ?? 'حصة دراسية'}</Text><Text style={styles.meta}>{event.class?.name ? `${event.class.name} · ` : ''}{event.periodNumber ? `الحصة ${event.periodNumber}` : days[selectedDay].name}</Text></View>
        {currentEvent?.id === event.id ? <View style={styles.eventLive}><View style={styles.liveDot}/><Text style={styles.eventLiveText}>جارية الآن</Text></View> : selectedDay === today && (timeInMinutes(event.startTime) ?? Infinity) < minuteOfDay ? <Ionicons name="checkmark-circle" size={18} color={BRAND.muted}/> : null}
      </Surface>) : <EmptyState title="لا توجد حصص مسجلة لهذا اليوم" detail="يعرض الجدول الحصص التي سجلتها المدرسة لهذا الحساب." icon="calendar-outline" />}
    </> : null}
  </View>;
}

function timeInMinutes(value?: string | null) {
  if (!value) return null;
  const match = /(?:^|T)(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]); const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

const styles = StyleSheet.create({
  wrap: { gap: 11 },
  days: { flexDirection: 'row-reverse', gap: 7, paddingVertical: 2 },
  day: { minWidth: 84, minHeight: 55, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: BRAND.line, borderRadius: 13, backgroundColor: BRAND.paper },
  daySelected: { borderColor: BRAND.teal, backgroundColor: BRAND.teal, shadowColor: BRAND.teal, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2 },
  dayToday: { borderColor: BRAND.teal },
  dayName: { color: BRAND.ink, fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  dayNameSelected: { color: '#FFFFFF' },
  todayMark: { minHeight: 15, paddingHorizontal: 6, borderRadius: 9, backgroundColor: BRAND.tealSoft },
  todayMarkSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  todayText: { color: BRAND.teal, fontSize: 9, fontWeight: '800', writingDirection: 'rtl' },
  todayTextSelected: { color: '#FFFFFF' },
  daySpacer: { height: 15 },
  event: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 13 },
  time: { alignItems: 'flex-start', gap: 3 },
  timeText: { color: BRAND.teal, fontSize: 14, fontWeight: '900' },
  subject: { color: BRAND.ink, fontSize: 15, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  meta: { color: BRAND.muted, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  liveCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderColor: '#8DDFC5', backgroundColor: '#F0FCF7' },
  liveIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: BRAND.teal },
  copy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  liveEyebrow: { color: BRAND.teal, fontSize: 11, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  liveBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, backgroundColor: BRAND.teal },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
  liveBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
  nextCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderColor: '#C9E8DF', backgroundColor: '#F7FCFA' },
  nextIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: BRAND.tealSoft },
  nextEyebrow: { color: BRAND.teal, fontSize: 11, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  dayDone: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, alignSelf: 'flex-end', paddingHorizontal: 3 },
  eventLive: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, backgroundColor: BRAND.tealSoft },
  eventLiveText: { color: BRAND.teal, fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
});
