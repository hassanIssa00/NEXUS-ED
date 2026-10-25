'use client'

import ConversationInbox from '@/components/messages/ConversationInbox'
import { useLocale } from 'next-intl'

export default function StudentMessagesPage() {
  const isEnglish = useLocale() === 'en'
  return (
    <ConversationInbox
      heading={isEnglish ? 'School messages' : 'الرسائل المدرسية'}
      description={isEnglish ? 'Contact teachers linked to your classes and view messages saved to your account.' : 'تواصل مع المعلمين المرتبطين بفصولك، وتابع رسائلك المحفوظة في حسابك.'}
    />
  )
}
