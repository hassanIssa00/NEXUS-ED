'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, LoaderCircle, MessageSquare, RefreshCw, Send } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { messagingService, type Conversation, type Message, type UserPreview } from '@/lib/services/messaging.service'

interface Contact extends UserPreview {
  firstName?: string | null
  lastName?: string | null
}

type DisplayContact = UserPreview & Partial<Pick<Contact, 'firstName' | 'lastName'>>

interface Props {
  heading: string
  description: string
}

function displayName(user?: DisplayContact) {
  if (!user) return 'محادثة مدرسية'
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'مستخدم'
}

function errorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  if (Array.isArray(responseMessage)) return responseMessage.join('، ')
  return responseMessage || 'تعذر الاتصال بالخادم. حاول مرة أخرى.'
}

export default function ConversationInbox({ heading, description }: Props) {
  const { user, profile } = useAuth()
  const currentUserId = profile?.id || user?.id
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const activeConversation = conversations.find((item) => item.id === activeId)
  const activePeer = useMemo(() => {
    const participant = activeConversation?.participants?.find((item) => item.userId !== currentUserId)
    return participant?.user as Contact | undefined
  }, [activeConversation, currentUserId])

  async function loadInbox(preferredId?: string) {
    setLoading(true)
    setError('')
    try {
      const [nextConversations, nextContacts] = await Promise.all([
        messagingService.getConversations(),
        messagingService.getContacts(),
      ])
      setConversations(nextConversations)
      setContacts(nextContacts)
      const nextId = preferredId || activeId || nextConversations[0]?.id || null
      setActiveId(nextId)
      if (nextId) {
        setLoadingMessages(true)
        const nextMessages = await messagingService.getMessages(nextId)
        setMessages(nextMessages)
      } else {
        setMessages([])
      }
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoading(false)
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    void loadInbox()
    // Load once when the authenticated page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openConversation(conversationId: string) {
    setActiveId(conversationId)
    setLoadingMessages(true)
    setError('')
    try {
      setMessages(await messagingService.getMessages(conversationId))
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoadingMessages(false)
    }
  }

  async function openContact(contact: Contact) {
    setError('')
    try {
      const conversation = await messagingService.startConversation(contact.id)
      await loadInbox(conversation.id)
    } catch (startError) {
      setError(errorMessage(startError))
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    const content = text.trim()
    if (!activeId || !content || sending) return
    setSending(true)
    setError('')
    try {
      await messagingService.sendMessage(activeId, content)
      setText('')
      setMessages(await messagingService.getMessages(activeId))
      const nextConversations = await messagingService.getConversations()
      setConversations(nextConversations)
    } catch (sendError) {
      setError(errorMessage(sendError))
    } finally {
      setSending(false)
    }
  }

  const existingPeerIds = new Set(conversations.flatMap((item) =>
    item.participants?.map((participant) => participant.userId).filter((id) => id !== currentUserId) || [],
  ))
  const availableContacts = contacts.filter((contact) => !existingPeerIds.has(contact.id))

  return (
    <section className="space-y-5 pb-10" dir="rtl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{heading}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadInbox()}
          disabled={loading}
          title="تحديث المحادثات"
          aria-label="تحديث المحادثات"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid min-h-[460px] overflow-hidden rounded-md border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d] md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-gray-200 dark:border-white/10 md:border-b-0 md:border-l">
          <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 dark:border-white/10 dark:text-gray-100">المحادثات</div>
          <div className="max-h-[65vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-gray-500"><LoaderCircle className="h-4 w-4 animate-spin" /> جارٍ تحميل المحادثات</div>
            ) : (
              <>
                {conversations.map((conversation) => {
                  const peer = conversation.participants?.find((item) => item.userId !== currentUserId)?.user as Contact | undefined
                  const latest = conversation.messages?.[0]
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => void openConversation(conversation.id)}
                      className={`block w-full border-b border-gray-100 px-4 py-3 text-right hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5 ${activeId === conversation.id ? 'bg-sky-50 dark:bg-sky-950/30' : ''}`}
                    >
                      <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName(peer)}</span>
                      <span className="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">{latest?.content || 'لا توجد رسائل بعد'}</span>
                    </button>
                  )
                })}
                {availableContacts.length > 0 && (
                  <div className="border-b border-gray-200 px-4 py-3 text-xs font-semibold text-gray-500 dark:border-white/10 dark:text-gray-400">المعلمون المرتبطون بفصولك</div>
                )}
                {availableContacts.map((contact) => (
                  <button key={contact.id} type="button" onClick={() => void openContact(contact)} className="block w-full border-b border-gray-100 px-4 py-3 text-right hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5">
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName(contact)}</span>
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">بدء محادثة</span>
                  </button>
                ))}
                {conversations.length === 0 && contacts.length === 0 && (
                  <p className="p-4 text-sm leading-6 text-gray-500 dark:text-gray-400">لا توجد محادثات أو معلمون مرتبطون بحسابك حتى الآن.</p>
                )}
              </>
            )}
          </div>
        </aside>

        <div className="flex min-h-[460px] flex-col">
          {activeId ? (
            <>
              <div className="border-b border-gray-200 px-5 py-3 dark:border-white/10">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{displayName(activePeer)}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">محادثة محفوظة في حسابك المدرسي</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500"><LoaderCircle className="ml-2 h-4 w-4 animate-spin" /> جارٍ تحميل الرسائل</div>
                ) : messages.length ? messages.map((message) => {
                  const ownMessage = message.senderId === currentUserId
                  return (
                    <div key={message.id} className={`flex ${ownMessage ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-md px-3 py-2 ${ownMessage ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-gray-100'}`}>
                        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                        <time className={`mt-1 block text-[10px] ${ownMessage ? 'text-sky-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {new Date(message.createdAt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                        </time>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-gray-400">
                    <MessageSquare className="h-8 w-8" />
                    <p>ابدأ المحادثة برسالة إلى {displayName(activePeer)}.</p>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-gray-200 p-3 dark:border-white/10">
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      event.currentTarget.form?.requestSubmit()
                    }
                  }}
                  maxLength={5000}
                  rows={2}
                  placeholder="اكتب رسالة..."
                  className="min-h-11 flex-1 resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 dark:border-white/10 dark:bg-[#151521] dark:text-white"
                />
                <button type="submit" disabled={!text.trim() || sending} aria-label="إرسال الرسالة" title="إرسال الرسالة" className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50">
                  {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-10 w-10" />
              <p className="text-sm">اختر محادثة أو ابدأ محادثة مع أحد المعلمين المرتبطين بحسابك.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
