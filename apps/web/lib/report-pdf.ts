import { apiClient } from '@/lib/api/client'

export async function downloadBrandedPdf(title: string, content: string, filename: string) {
  let data: Blob
  try {
    const result = await apiClient.post<Blob>(
      '/reports/ai-response-pdf',
      { title: title.slice(0, 180), content: content.slice(0, 30000) },
      { responseType: 'blob' },
    )
    data = result.data
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status
    const messages: Record<number, string> = {
      401: 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى ثم حاول تنزيل PDF.',
      403: 'تنزيل PDF غير مسموح لهذا الحساب.',
      404: 'خدمة تنزيل PDF لم تصل إلى الخادم بعد. حدّث الصفحة بعد قليل.',
      429: 'طلبات تنزيل كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
      503: 'خدمة إنشاء PDF غير متاحة مؤقتًا. حاول بعد قليل.',
    }
    throw new Error(messages[status || 0] || 'تعذر إنشاء ملف PDF الآن. حاول مرة أخرى بعد قليل.')
  }

  if (!(data instanceof Blob) || data.size === 0) {
    throw new Error('لم يصل ملف PDF صالح من الخادم. حاول مرة أخرى.')
  }
  const objectUrl = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000)
}
