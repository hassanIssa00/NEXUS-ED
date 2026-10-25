'use client'

import ConversationInbox from '@/components/messages/ConversationInbox'
import { useLocale } from 'next-intl'

export default function ParentMessagesPage() {
  const isEnglish = useLocale() === 'en'
  return (
    <ConversationInbox
      heading={isEnglish ? 'Contact teachers' : 'التواصل مع المعلمين'}
      description={isEnglish ? 'Message the teachers of children linked to your account using their student code.' : 'تواصل مع معلمي الأبناء المرتبطين بحسابك برمز الطالب.'}
    />
  )
}
