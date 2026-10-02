import { ClassRiskMonitor } from '@/components/analytics/class-risk-monitor'
import { Link } from '@/i18n/routing'
import { FileText } from 'lucide-react'

export default function CounselorDashboard() {
  return <main className="space-y-5">
    <nav className="flex justify-end">
      <Link href="/counselor/parent-surveys" className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"><FileText className="h-4 w-4" />استبيانات أولياء الأمور</Link>
    </nav>
    <ClassRiskMonitor title="متابعة المؤشرات الطلابية" description="مؤشرات أكاديمية وحضور وواجبات محفوظة في سجلات المدرسة، لمساندة المتابعة الطلابية." />
  </main>
}
