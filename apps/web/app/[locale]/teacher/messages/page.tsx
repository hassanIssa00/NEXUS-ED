'use client'

import ConversationInbox from '@/components/messages/ConversationInbox'
import { useLocale } from 'next-intl'

export default function TeacherMessagesPage() {
  const isEnglish = useLocale() === 'en'
  return (
    <ConversationInbox
      heading={isEnglish ? 'School messages' : 'رسائل المدرسة'}
      description={isEnglish ? 'Message parents and students linked to your classes, and keep track of conversations in one place.' : 'تواصل مع أولياء الأمور والطلاب المرتبطين بفصولك، وتابع رسائلك في مكان واحد.'}
    />
  )
}
