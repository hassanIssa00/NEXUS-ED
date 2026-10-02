import BackendStatus from '@/components/common/BackendStatus';

export default function RulesEnginePage() {
    return (
        <BackendStatus
            title="تشغيل القواعد الآلية غير متاح"
            detail="النظام الحالي لا يشغّل شروط القواعد ولا ينفّذ إجراءاتها تلقائيًا. أزلنا شاشة التشغيل حتى لا توحي بأن التنبيهات أو الإجراءات الآلية تعمل."
        />
    );
}
