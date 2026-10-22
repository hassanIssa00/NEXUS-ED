'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { AlertCircle, LoaderCircle, MessageSquare, RefreshCw, Search, Send, Sparkles } from 'lucide-react'
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
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const en = locale === 'en'
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
  const [search, setSearch] = useState('')
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
  const filteredConversations = conversations.filter((conversation) => {
    const peer = conversation.participants?.find((item) => item.userId !== currentUserId)?.user as Contact | undefined
    return displayName(peer).toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale))
  })
  const filteredContacts = availableContacts.filter((contact) => displayName(contact).toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)))
  const title = en
    ? profile?.role === 'parent' ? 'Message your child’s teachers' : 'School messages'
    : heading
  const subtitle = en
    ? profile?.role === 'parent' ? 'A calm space to follow up with teachers connected to your children.' : 'Stay in touch with the teachers connected to your classes.'
    : description
  const formatMessageTime = (value: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ar-SA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

  return (
    <section className="space-y-5 pb-10" dir={en ? 'ltr' : 'rtl'}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadInbox()}
          disabled={loading}
          title={en ? 'Refresh conversations' : 'تحديث المحادثات'}
          aria-label={en ? 'Refresh conversations' : 'تحديث المحادثات'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-[#1e1e2d] dark:text-gray-300 dark:hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid min-h-[600px] overflow-hidden rounded-[28px] border border-gray-200/80 bg-white shadow-xl shadow-slate-900/5 dark:border-white/10 dark:bg-[#171824] md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-gray-200 bg-slate-50/80 dark:border-white/10 dark:bg-[#141521] md:border-b-0 md:border-e">
          <div className="border-b border-gray-200/80 p-5 dark:border-white/10">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/20"><MessageSquare className="size-5" /></span>
              <div><h2 className="font-bold text-gray-900 dark:text-white">{en ? 'Your conversations' : 'محادثاتك'}</h2><p className="mt-0.5 text-xs text-gray-500">{en ? 'Private school messages' : 'رسائل المدرسة الخاصة'}</p></div>
            </div>
            <label className="relative block">
              <Search className={`absolute top-1/2 size-4 -translate-y-1/2 text-gray-400 ${en ? 'left-3' : 'right-3'}`} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={en ? 'Search conversations' : 'ابحث في المحادثات'} className={`h-11 w-full rounded-xl border border-gray-200 bg-white text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#1d1e2c] ${en ? 'pl-10 pr-3' : 'pr-10 pl-3'}`} />
            </label>
          </div>
          <div className="max-h-[65vh] flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-500"><LoaderCircle className="h-4 w-4 animate-spin" /> {en ? 'Loading conversations…' : 'جارٍ تحميل المحادثات'}</div>
            ) : (
              <>
                {filteredConversations.map((conversation) => {
                  const peer = conversation.participants?.find((item) => item.userId !== currentUserId)?.user as Contact | undefined
                  const latest = conversation.messages?.[0]
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => void openConversation(conversation.id)}
                      className={`mb-1.5 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition ${activeId === conversation.id ? 'bg-white shadow-md shadow-slate-900/5 ring-1 ring-violet-100 dark:bg-[#222333] dark:ring-violet-400/20' : 'hover:bg-white/80 dark:hover:bg-white/5'}`}
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 text-sm font-bold text-white">{displayName(peer).slice(0, 1)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-gray-900 dark:text-white">{displayName(peer)}</span>
                        <span className="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">{latest?.content || (en ? 'Start a conversation' : 'لا توجد رسائل بعد')}</span>
                      </span>
                      {latest && <time className="self-start whitespace-nowrap text-[10px] text-gray-400">{formatMessageTime(latest.createdAt)}</time>}
                    </button>
                  )
                })}
                {filteredContacts.length > 0 && (
                  <div className="px-3 pb-2 pt-5 text-[11px] font-bold uppercase tracking-wide text-gray-400">{en ? 'Start a new chat' : 'ابدأ محادثة جديدة'}</div>
                )}
                {filteredContacts.map((contact) => (
                  <button key={contact.id} type="button" onClick={() => void openContact(contact)} className="mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition hover:bg-white/80 dark:hover:bg-white/5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">{displayName(contact).slice(0, 1)}</span>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName(contact)}</span><span className="mt-1 block text-xs text-violet-600 dark:text-violet-300">{en ? 'Send a message' : 'إرسال رسالة'}</span></span>
                  </button>
                ))}
                {filteredConversations.length === 0 && filteredContacts.length === 0 && (
                  <div className="mx-2 mt-5 rounded-2xl border border-dashed border-gray-300 p-5 text-center text-sm leading-6 text-gray-500 dark:border-white/10 dark:text-gray-400"><Sparkles className="mx-auto mb-2 size-5 text-violet-500" />{search ? (en ? 'No matches found.' : 'لا توجد نتائج مطابقة.') : (en ? 'No conversations or linked teachers are available yet.' : 'لا توجد محادثات أو معلمون مرتبطون بحسابك حتى الآن.')}</div>
                )}
              </>
            )}
          </div>
        </aside>

        <div className="flex min-h-[520px] flex-col bg-gradient-to-b from-white to-slate-50/60 dark:from-[#171824] dark:to-[#191a27]">
          {activeId ? (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200/80 px-5 py-4 dark:border-white/10">
                <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 font-bold text-white">{displayName(activePeer).slice(0, 1)}</span>
                <div><h2 className="text-sm font-bold text-gray-900 dark:text-white">{displayName(activePeer)}</h2><p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{en ? 'Messages are saved to your school account' : 'المحادثة محفوظة في حسابك المدرسي'}</p></div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-50/50 via-transparent to-transparent p-5 dark:from-violet-950/10">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500"><LoaderCircle className="me-2 h-4 w-4 animate-spin" /> {en ? 'Loading messages…' : 'جارٍ تحميل الرسائل'}</div>
                ) : messages.length ? messages.map((message) => {
                  const ownMessage = message.senderId === currentUserId
                  return (
                    <div key={message.id} className={`flex ${ownMessage ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${ownMessage ? 'rounded-br-md bg-gradient-to-br from-violet-600 to-indigo-600 text-white' : 'rounded-bl-md border border-gray-200 bg-white text-gray-900 dark:border-white/10 dark:bg-[#242535] dark:text-gray-100'}`}>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
                        <time className={`mt-1.5 block text-[10px] ${ownMessage ? 'text-violet-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {formatMessageTime(message.createdAt)}
                        </time>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-gray-400">
                    <MessageSquare className="h-8 w-8" />
                    <p>{en ? `Say hello to ${displayName(activePeer)} to start chatting.` : `ابدأ المحادثة برسالة إلى ${displayName(activePeer)}.`}</p>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <form onSubmit={sendMessage} className="flex items-end gap-3 border-t border-gray-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-[#171824]/80">
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
                  placeholder={en ? 'Write a message…' : 'اكتب رسالة...'}
                  className="min-h-12 flex-1 resize-y rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#202130] dark:text-white"
                />
                <button type="submit" disabled={!text.trim() || sending} aria-label={en ? 'Send message' : 'إرسال الرسالة'} title={en ? 'Send message' : 'إرسال الرسالة'} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 disabled:opacity-50">
                  {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-10 w-10" />
              <p className="text-sm">{en ? 'Select a conversation or start a new one with a linked teacher.' : 'اختر محادثة أو ابدأ محادثة مع أحد المعلمين المرتبطين بحسابك.'}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
