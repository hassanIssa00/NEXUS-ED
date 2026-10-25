const activityLabels: Record<string, { ar: string; en: string }> = {
  'student.record_viewed': { ar: 'تم فتح سجل طالب', en: 'Student record viewed' },
  'parent_link.code_issued': { ar: 'تم إصدار رمز ربط ولي أمر', en: 'Parent link code issued' },
  'assignment.created': { ar: 'تم إنشاء واجب', en: 'Assignment created' },
  'assignment.updated': { ar: 'تم تحديث واجب', en: 'Assignment updated' },
  'submission.created': { ar: 'تم تسليم واجب', en: 'Assignment submitted' },
  'submission.graded': { ar: 'تم تصحيح تسليم', en: 'Submission graded' },
  'attendance.recorded': { ar: 'تم تسجيل الحضور', en: 'Attendance recorded' },
  'attendance.updated': { ar: 'تم تحديث سجل الحضور', en: 'Attendance updated' },
  'user.created': { ar: 'تم إنشاء حساب', en: 'Account created' },
  'user.updated': { ar: 'تم تحديث حساب', en: 'Account updated' },
  'class.created': { ar: 'تم إنشاء فصل', en: 'Class created' },
  'subject.created': { ar: 'تم إنشاء مادة', en: 'Subject created' },
  'certificate.issued': { ar: 'تم إصدار شهادة', en: 'Certificate issued' },
  'payment.invoice_intent_created': { ar: 'تم إنشاء طلب سداد فاتورة', en: 'Invoice payment initiated' },
}

export function formatSchoolActivity(action: string, locale: string) {
  const language = locale === 'en' ? 'en' : 'ar'
  return activityLabels[action]?.[language] || (language === 'en' ? 'School activity recorded' : 'تم تسجيل نشاط مدرسي')
}
