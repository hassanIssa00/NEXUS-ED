'use client'

import { useEffect, useMemo, useState } from 'react'
import { parseClassName, stageLabel, type ClassStage } from '@/lib/school-class-hierarchy'

export type ClassOption = { id: string; name: string }

const stageOrder: ClassStage[] = ['kindergarten', 'primary', 'middle', 'secondary', 'unspecified']

export function ClassHierarchyPicker({
  classes,
  value,
  onChange,
  locale = 'ar',
  classLabel,
}: {
  classes: ClassOption[]
  value: string
  onChange: (classId: string) => void
  locale?: 'ar' | 'en'
  classLabel?: string
}) {
  const english = locale === 'en'
  const initial = classes.find((item) => item.id === value)
  const [stage, setStage] = useState<ClassStage | ''>(initial ? parseClassName(initial.name).stage : '')
  const [grade, setGrade] = useState<number | ''>(initial ? parseClassName(initial.name).grade ?? '' : '')

  useEffect(() => {
    const selected = classes.find((item) => item.id === value)
    if (selected) {
      const parsed = parseClassName(selected.name)
      setStage(parsed.stage)
      setGrade(parsed.grade ?? '')
    } else if (!value) {
      setStage('')
      setGrade('')
    }
  }, [classes, value])

  const stages = useMemo(() => stageOrder.filter((key) => classes.some((item) => parseClassName(item.name).stage === key)), [classes])
  const stageClasses = useMemo(() => stage ? classes.filter((item) => parseClassName(item.name).stage === stage) : classes, [classes, stage])
  const grades = useMemo(() => [...new Set(stageClasses.map((item) => parseClassName(item.name).grade).filter((item): item is number => item !== null))].sort((a, b) => a - b), [stageClasses])
  const gradeClasses = useMemo(() => grade ? stageClasses.filter((item) => parseClassName(item.name).grade === grade) : stageClasses, [grade, stageClasses])

  return <div className="grid gap-3 sm:grid-cols-3">
    <label className="grid gap-1.5 text-sm font-semibold">
      <span>{english ? 'Stage' : 'المرحلة'}</span>
      <select value={stage} onChange={(event) => { setStage(event.target.value as ClassStage | ''); setGrade(''); onChange('') }} className="min-h-11 rounded-lg border border-border bg-background px-3">
        <option value="">{english ? 'Choose stage' : 'اختر المرحلة'}</option>
        {stages.map((item) => <option key={item} value={item}>{stageLabel(item, english)}</option>)}
      </select>
    </label>
    <label className="grid gap-1.5 text-sm font-semibold">
      <span>{english ? 'Grade' : 'الصف الدراسي'}</span>
      <select value={grade} disabled={!stage || !grades.length} onChange={(event) => { setGrade(event.target.value ? Number(event.target.value) : ''); onChange('') }} className="min-h-11 rounded-lg border border-border bg-background px-3 disabled:opacity-50">
        <option value="">{english ? 'Choose grade' : 'اختر الصف'}</option>
        {grades.map((item) => <option key={item} value={item}>{stage === 'kindergarten' ? `${english ? 'Level' : 'المستوى'} ${item}` : `${english ? 'Grade' : 'الصف'} ${item}`}</option>)}
        {!grades.length && stage && <option value="">{english ? 'No grade data in class records' : 'لا يوجد صف محدد في بيانات الفصول'}</option>}
      </select>
    </label>
    <label className="grid gap-1.5 text-sm font-semibold">
      <span>{classLabel || (english ? 'Class section' : 'الفصل / الشعبة')}</span>
      <select value={value} disabled={!gradeClasses.length} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3 disabled:opacity-50">
        <option value="">{english ? 'Choose class' : 'اختر الفصل'}</option>
        {gradeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        {!gradeClasses.length && stage && grade && <option value="">{english ? 'No classes are registered for this grade' : 'لا توجد فصول مسجلة لهذا الصف'}</option>}
      </select>
    </label>
  </div>
}
