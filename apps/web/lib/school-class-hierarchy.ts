export type SchoolClassLike = { id: string; name: string }

export type ClassStage = 'kindergarten' | 'primary' | 'middle' | 'secondary' | 'unspecified'

export type ParsedClassName = {
  stage: ClassStage
  grade: number | null
  section: number | null
  gradeLabel: string
}

const arabicDigits: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

const gradeWords: Array<[RegExp, number]> = [
  [/(?:الأول|الاول|أولى|اولى|الأولى|الاولى)/, 1],
  [/(?:الثاني|الثانية)/, 2],
  [/(?:الثالث|الثالثة)/, 3],
  [/(?:الرابع|الرابعة)/, 4],
  [/(?:الخامس|الخامسة)/, 5],
  [/(?:السادس|السادسة)/, 6],
]

export function normalizeClassText(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => arabicDigits[digit] || digit)
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseClassName(name: string): ParsedClassName {
  const normalized = normalizeClassText(name)
  const stage: ClassStage = /روض|تمهيد/.test(normalized)
    ? 'kindergarten'
    : /ابتدائ/.test(normalized)
      ? 'primary'
      : /متوسط|اعدادي|إعدادي/.test(name)
        ? 'middle'
        : /ثانوي/.test(normalized)
          ? 'secondary'
          : 'unspecified'

  const numberedClass = normalized.match(/(?:^|\s)(\d{1,2})\s*\/\s*(\d{1,2})(?:\D|$)/)
  const wordGrade = gradeWords.find(([pattern]) => pattern.test(normalized))?.[1] ?? null
  const grade = numberedClass ? Number(numberedClass[1]) : wordGrade
  const sectionMatch = numberedClass?.[2] || normalized.match(/(?:فصل|شعبة)\s*(\d{1,2})/)?.[1]
  const section = sectionMatch ? Number(sectionMatch) : null
  const gradeLabel = stage === 'kindergarten'
    ? 'رياض الأطفال'
    : grade
      ? `الصف ${grade} · ${stageLabel(stage)}`
      : 'صف غير محدد'

  return { stage, grade, section, gradeLabel }
}

export function stageLabel(stage: ClassStage, english = false) {
  if (english) {
    return ({ kindergarten: 'Kindergarten', primary: 'Primary', middle: 'Middle school', secondary: 'Secondary', unspecified: 'Unclassified' } as const)[stage]
  }
  return ({ kindergarten: 'رياض الأطفال', primary: 'ابتدائي', middle: 'متوسط', secondary: 'ثانوي', unspecified: 'غير مصنف' } as const)[stage]
}

export function gradeWordsLabel(grade: number, stage: ClassStage) {
  if (stage === 'kindergarten') return `المستوى ${grade}`
  const words: Record<number, string> = { 1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس', 6: 'السادس' }
  return `الصف ${words[grade] || grade} ${stage === 'unspecified' ? '' : `ال${stageLabel(stage)}`}`.trim()
}
