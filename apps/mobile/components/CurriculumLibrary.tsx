import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { BRAND, WEB_URL } from '@/constants/Config';
import { mobileCurricula, type MobileCurriculum } from '@/data/curricula';
import { ChoiceButton, EmptyState, PrimaryButton, SectionHeading, Surface } from '@/components/mobile-ui';

type InkSegment = { x1: number; y1: number; x2: number; y2: number; color: string; width: number };
const inkColors = ['#17324B', '#167D6A', '#C33D45', '#7046A8', '#D28A20'];

export function CurriculumLibrary({ feature, fail }: { feature: string; fail: (message: string) => void }) {
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();
  const [book, setBook] = useState<MobileCurriculum | null>(null);
  const [page, setPage] = useState(1);
  const [pageDraft, setPageDraft] = useState('1');
  const [zoom, setZoom] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [highlighter, setHighlighter] = useState(false);
  const [eraser, setEraser] = useState(false);
  const [inkColor, setInkColor] = useState(inkColors[0]);
  const [segments, setSegments] = useState<InkSegment[]>([]);
  const segmentsRef = useRef<InkSegment[]>([]);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const books = useMemo(() => feature === 'quran' ? mobileCurricula.filter((item) => item.quran) : mobileCurricula, [feature]);
  const availableWidth = Math.min(width - 68, 760);
  const fitHeight = Math.min(availableWidth * 1.414, height * 0.62);
  const frameHeight = Math.min(760, fitHeight * (zoom === 0 ? 1 : zoom === 1 ? 1.18 : 1.35));
  const frameWidth = Math.min(availableWidth, frameHeight / 1.414);
  const imageUrl = book ? `${WEB_URL}/resources/curricula/${book.slug}/page-${String(page).padStart(3, '0')}.jpg` : '';
  const activeUnit = book?.units.find((unit) => page >= unit.fromPage && page <= unit.toPage);
  const storageKey = book && !book.quran ? `nexus.book-ink.${user?.id ?? 'student'}.${book.slug}.${page}` : '';

  const saveSegments = async (next: InkSegment[]) => {
    segmentsRef.current = next;
    setSegments(next);
    if (!storageKey) return;
    try {
      if (next.length) await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      else await AsyncStorage.removeItem(storageKey);
    } catch { /* Ink stays available in this screen if local storage is unavailable. */ }
  };

  useEffect(() => {
    segmentsRef.current = [];
    setSegments([]);
    if (!storageKey) return;
    let active = true;
    void AsyncStorage.getItem(storageKey).then((value) => {
      if (!active) return;
      const parsed = value ? JSON.parse(value) : [];
      const restored = Array.isArray(parsed) ? parsed.filter((item) => Number.isFinite(item.x1) && Number.isFinite(item.y1) && Number.isFinite(item.x2) && Number.isFinite(item.y2)) : [];
      segmentsRef.current = restored;
      setSegments(restored);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [storageKey]);

  const drawPoint = (x: number, y: number) => {
    const previous = lastPoint.current;
    if (!previous) { lastPoint.current = { x, y }; return; }
    if (highlighter) {
      const next = [...segmentsRef.current, { x1: previous.x, y1: previous.y, x2: x, y2: y, color: `${inkColor}66`, width: 11 }];
      segmentsRef.current = next; setSegments(next);
    } else {
      const next = [...segmentsRef.current, { x1: previous.x, y1: previous.y, x2: x, y2: y, color: inkColor, width: 3 }];
      segmentsRef.current = next; setSegments(next);
    }
    lastPoint.current = { x, y };
  };
  const erasePoint = (x: number, y: number) => {
    const next = segmentsRef.current.filter((line) => Math.hypot((line.x1 + line.x2) / 2 - x, (line.y1 + line.y2) / 2 - y) > 18);
    segmentsRef.current = next; setSegments(next);
  };
  const finishInk = () => { lastPoint.current = null; void saveSegments(segmentsRef.current); };

  const selectBook = (item: MobileCurriculum) => {
    setBook(item);
    setPage(1);
    setPageDraft('1');
    setZoom(0);
    setImageFailed(false);
  };
  const changePage = (next: number) => {
    if (!book) return;
    const safePage = Math.min(book.pageCount, Math.max(1, next));
    setPage(safePage);
    setPageDraft(String(safePage));
    setImageFailed(false);
  };
  const goToDraft = () => {
    const next = Number.parseInt(pageDraft, 10);
    if (!Number.isInteger(next) || next < 1 || !book || next > book.pageCount) {
      fail(`أدخل رقم صفحة من 1 إلى ${book?.pageCount ?? '—'}.`);
      return;
    }
    changePage(next);
  };
  const openQuranPdf = () => {
    const url = `${WEB_URL}/resources/curricula/quran/juz-amma.pdf`;
    void Linking.openURL(url).catch(() => fail('تعذر فتح نسخة المصحف PDF.'));
  };

  if (book) return (
    <View style={styles.stack}>
      <Surface style={styles.readerTop}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="العودة إلى قائمة الكتب" style={styles.backButton} onPress={() => setBook(null)}>
          <Ionicons name="arrow-forward" size={20} color={BRAND.ink} />
        </TouchableOpacity>
        <View style={styles.bookHeading}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookMeta}>{book.badge} · {page} من {book.pageCount}</Text>
        </View>
      </Surface>

      {book.quran ? <PrimaryButton title="فتح نسخة المصحف كاملة PDF" icon="open-outline" tone="blue" onPress={openQuranPdf} /> : null}

      <Surface style={styles.readerSurface}>
        <View style={[styles.readerFrame, { height: frameHeight, width: frameWidth }]}>
          {!imageFailed ? <Image
            key={imageUrl}
            accessibilityLabel={`${book.title}، الصفحة ${page}`}
            source={{ uri: imageUrl }}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
            style={styles.pageImage}
          /> : <View style={styles.imageError}>
            <Ionicons name="cloud-offline-outline" size={28} color={BRAND.muted} />
            <Text style={styles.copy}>تعذر تحميل هذه الصفحة. تحقق من الاتصال ثم أعد المحاولة.</Text>
            <PrimaryButton title="إعادة المحاولة" icon="refresh-outline" tone="blue" onPress={() => setImageFailed(false)} />
          </View>}
          {!imageFailed && book && !book.quran ? <View
            pointerEvents={drawing ? 'auto' : 'none'}
            style={styles.inkLayer}
            onStartShouldSetResponder={() => drawing}
            onMoveShouldSetResponder={() => drawing}
            onResponderGrant={(event) => {
              const { locationX, locationY } = event.nativeEvent;
              if (eraser && drawing) erasePoint(locationX, locationY);
              else if (drawing) lastPoint.current = { x: locationX, y: locationY };
            }}
            onResponderMove={(event) => {
              if (!drawing) return;
              const { locationX, locationY } = event.nativeEvent;
              if (eraser) erasePoint(locationX, locationY); else drawPoint(locationX, locationY);
            }}
            onResponderRelease={finishInk}
          >
            {segments.map((line, index) => {
              const dx = line.x2 - line.x1; const dy = line.y2 - line.y1; const length = Math.hypot(dx, dy);
              return <View key={`${index}-${line.x1}-${line.y1}`} pointerEvents="none" style={{ position: 'absolute', left: (line.x1 + line.x2 - length) / 2, top: (line.y1 + line.y2 - line.width) / 2, width: Math.max(1, length), height: line.width, borderRadius: line.width, backgroundColor: line.color, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }] }} />;
            })}
          </View> : null}
          {!imageFailed && !imageUrl ? <ActivityIndicator color={BRAND.teal} /> : null}
        </View>

        <View style={styles.pageControls}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="الصفحة التالية" disabled={page >= book.pageCount} onPress={() => changePage(page + 1)} style={[styles.pageArrow, page >= book.pageCount && styles.disabled]}>
            <Ionicons name="chevron-forward" size={19} color={BRAND.ink} />
          </TouchableOpacity>
          <TextInput
            accessibilityLabel="رقم الصفحة"
            value={pageDraft}
            onChangeText={setPageDraft}
            keyboardType="number-pad"
            returnKeyType="go"
            onSubmitEditing={goToDraft}
            style={styles.pageInput}
          />
          <Text style={styles.pageTotal}>/ {book.pageCount}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="انتقال إلى الصفحة" onPress={goToDraft} style={styles.goButton}>
            <Text style={styles.goText}>انتقال</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="الصفحة السابقة" disabled={page <= 1} onPress={() => changePage(page - 1)} style={[styles.pageArrow, page <= 1 && styles.disabled]}>
            <Ionicons name="chevron-back" size={19} color={BRAND.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.zoomRow}>
          <Text style={styles.copy}>عرض الصفحة كاملة</Text>
          <View style={styles.zoomActions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="تكبير الصفحة" disabled={zoom >= 2} onPress={() => setZoom((value) => Math.min(2, value + 1))} style={[styles.pageArrow, zoom >= 2 && styles.disabled]}><Ionicons name="add" size={18} color={BRAND.ink} /></TouchableOpacity>
            <Text style={styles.zoomText}>{zoom === 0 ? 'ملاءمة' : zoom === 1 ? 'مكبر' : 'أكبر'}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="تصغير الصفحة" disabled={zoom <= 0} onPress={() => setZoom((value) => Math.max(0, value - 1))} style={[styles.pageArrow, zoom <= 0 && styles.disabled]}><Ionicons name="remove" size={18} color={BRAND.ink} /></TouchableOpacity>
          </View>
        </View>
        {!book.quran ? <View style={styles.annotationPanel}>
          <View style={styles.annotationActions}>
            <ChoiceButton title={drawing ? 'إنهاء الكتابة' : 'اكتب على الصفحة'} selected={drawing} onPress={() => { if (drawing) finishInk(); setDrawing((current) => !current); }} />
            <ChoiceButton title={highlighter ? 'القلم' : 'تظليل'} selected={highlighter} onPress={() => { setHighlighter((current) => !current); setEraser(false); setDrawing(true); }} />
            <ChoiceButton title="مسح" selected={eraser} onPress={() => { setEraser((current) => !current); setDrawing(true); setHighlighter(false); }} />
            <TouchableOpacity accessibilityRole="button" onPress={() => void saveSegments(segmentsRef.current.slice(0, -1))} style={styles.pageArrow}><Ionicons name="arrow-undo-outline" size={17} color={BRAND.ink}/></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => void saveSegments([])} style={styles.pageArrow}><Ionicons name="trash-outline" size={17} color={BRAND.red}/></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colors}>
            {inkColors.map((color) => <TouchableOpacity key={color} accessibilityRole="button" accessibilityLabel="لون القلم" onPress={() => { setInkColor(color); setEraser(false); }} style={[styles.colorChip, { backgroundColor: color }, inkColor === color && styles.selectedColor]} />)}
          </ScrollView>
          <Text style={styles.annotationHint}>{drawing ? (eraser ? 'مرّر إصبعك فوق العلامات لمسحها.' : 'المس الصفحة وارسم بإصبعك؛ تُحفظ الملاحظات على هذا الجهاز.') : 'القلم متاح على الكتب الدراسية؛ المصحف للقراءة فقط.'}</Text>
        </View> : null}
      </Surface>

      {book.units.length ? <Surface style={styles.unitsSurface}>
        <SectionHeading title="الوحدات والفصول" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitList}>
          {book.units.map((unit) => <ChoiceButton key={`${unit.fromPage}-${unit.title}`} title={`${unit.title} · ${unit.fromPage}–${unit.toPage}`} selected={unit === activeUnit} onPress={() => changePage(unit.fromPage)} />)}
        </ScrollView>
      </Surface> : null}
      <Text style={styles.sourceNote}>الكتاب الدراسي · الصف الأول الابتدائي · الفصل الدراسي الأول</Text>
    </View>
  );

  return <View style={styles.stack}>
    <Surface style={styles.libraryIntro}>
      <View style={styles.libraryIcon}><Ionicons name={feature === 'quran' ? 'book-outline' : 'library-outline'} size={23} color={BRAND.teal} /></View>
      <Text style={styles.bookTitle}>{feature === 'quran' ? 'المصحف الشريف' : 'المناهج والكتب الدراسية'}</Text>
      <Text style={styles.copy}>اختر كتابًا لفتحه. تظهر الصفحة كاملة ويمكنك التنقل بين الوحدات والصفحات.</Text>
    </Surface>
    {books.length ? <View style={styles.bookGrid}>
      {books.map((item) => <TouchableOpacity accessibilityRole="button" key={item.slug} activeOpacity={0.82} onPress={() => selectBook(item)} style={styles.bookCard}>
        <View style={[styles.bookAccent, { backgroundColor: item.color }]} />
        <View style={[styles.bookIcon, { backgroundColor: `${item.color}16` }]}><Ionicons name={item.quran ? 'book-outline' : 'reader-outline'} size={21} color={item.color} /></View>
        <View style={styles.bookCardCopy}>
          <Text style={styles.bookTitle}>{item.title}</Text>
          <Text style={styles.copy}>{item.subtitle}</Text>
          <Text style={[styles.bookMeta, { color: item.color }]}>{item.badge} · {item.pageCount} صفحة</Text>
        </View>
        <Ionicons name="chevron-back" size={18} color={BRAND.muted} />
      </TouchableOpacity>)}
    </View> : <EmptyState title="لا توجد كتب في هذا القسم" detail="لم يتم العثور على كتب متاحة لهذا الحساب." icon="library-outline" />}
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  libraryIntro: { alignItems: 'flex-end', gap: 7 },
  libraryIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: BRAND.tealSoft },
  bookGrid: { gap: 9 },
  bookCard: { position: 'relative', flexDirection: 'row-reverse', alignItems: 'center', gap: 11, minHeight: 100, padding: 14, borderWidth: 1, borderColor: BRAND.line, borderRadius: 16, backgroundColor: BRAND.paper },
  bookAccent: { position: 'absolute', right: 0, top: 14, bottom: 14, width: 4, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  bookIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  bookCardCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  bookTitle: { color: BRAND.ink, fontSize: 15, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  bookMeta: { color: BRAND.muted, fontSize: 11, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  copy: { color: BRAND.muted, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  readerTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  bookHeading: { flex: 1, alignItems: 'flex-end', gap: 4 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.line, borderRadius: 12, backgroundColor: BRAND.paper },
  readerSurface: { alignItems: 'center', gap: 10, padding: 10 },
  readerFrame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 12, backgroundColor: '#F4F6F8' },
  pageImage: { width: '100%', height: '100%' },
  inkLayer: { ...StyleSheet.absoluteFill },
  imageError: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 18 },
  pageControls: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%' },
  pageArrow: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.line, borderRadius: 12, backgroundColor: BRAND.paper },
  disabled: { opacity: 0.35 },
  pageInput: { width: 54, height: 38, borderWidth: 1, borderColor: BRAND.line, borderRadius: 10, backgroundColor: BRAND.paper, color: BRAND.ink, textAlign: 'center', fontSize: 14, fontWeight: '800' },
  pageTotal: { color: BRAND.muted, fontSize: 12, fontWeight: '700' },
  goButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, borderRadius: 10, backgroundColor: BRAND.tealSoft },
  goText: { color: BRAND.teal, fontSize: 12, fontWeight: '900' },
  zoomRow: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
  zoomActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  zoomText: { minWidth: 42, color: BRAND.ink, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  unitsSurface: { gap: 8, paddingBottom: 12 },
  unitList: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 2 },
  sourceNote: { color: BRAND.muted, fontSize: 10, textAlign: 'center', writingDirection: 'rtl' },
  annotationPanel: { width: '100%', gap: 7, paddingTop: 7, borderTopWidth: 1, borderColor: BRAND.line },
  annotationActions: { flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  colors: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center', paddingVertical: 4 },
  colorChip: { width: 22, height: 22, borderRadius: 11 },
  selectedColor: { borderWidth: 3, borderColor: BRAND.ink, transform: [{ scale: 1.1 }] },
  annotationHint: { color: BRAND.muted, fontSize: 10, lineHeight: 15, textAlign: 'right', writingDirection: 'rtl' },
});
