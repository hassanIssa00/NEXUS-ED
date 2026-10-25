import BackendStatus from '@/components/common/BackendStatus'

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const isEnglish = locale === 'en'
  return (
    <BackendStatus
      title={isEnglish ? 'Subscriptions are not enabled' : 'الاشتراكات غير مفعّلة'}
      detail={isEnglish
        ? 'No commercial plans or payment gateway are currently connected to school accounts. Prices and payment confirmations will not be shown until a real payment service is configured.'
        : 'لا توجد باقات تجارية أو بوابة دفع مرتبطة بحسابات المدرسة حاليًا. لن نعرض أسعارًا أو نؤكد عملية دفع قبل ربطها بخدمة دفع حقيقية.'}
    />
  )
}
