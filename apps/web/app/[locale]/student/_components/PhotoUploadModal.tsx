'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Check, Trash2, Sparkles, User } from 'lucide-react'

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  currentPhoto?: string | null
  onSave: (photoUrl: string) => void
  role?: 'student' | 'teacher'
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=faces',
]

export function PhotoUploadModal({
  isOpen,
  onClose,
  currentPhoto,
  onSave,
  role = 'student'
}: PhotoUploadModalProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setPreview(event.target.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    if (preview) {
      onSave(preview)
      onClose()
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onSave('')
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#1a1a2e] border border-gray-100 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-right"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {role === 'teacher' ? 'الصورة الشخصية للمعلم' : 'الصورة الشخصية للطالب'}
                </h3>
                <p className="text-xs text-gray-400">ارفع صورتك الخاصة أو اختر صورة رمزية معتمدة</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/10 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Current Avatar Display */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-teal-500/30 bg-gray-100 dark:bg-white/5 flex items-center justify-center shadow-lg">
                {preview ? (
                  <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-bold text-gray-500 mt-3">
              {preview ? 'الصورة المحددة حالياً' : 'لم يتم اختيار صورة بعد (فارغة)'}
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-teal-500/40 hover:border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center gap-2 transition-all mb-4"
          >
            <Upload className="w-4 h-4" />
            <span>انقر لاختيار صورة من جهازك</span>
          </button>

          {/* Preset Avatars */}
          <div className="mb-6">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>أو اختر صورة جاهزة:</span>
            </div>
            <div className="flex items-center justify-center gap-2.5 overflow-x-auto py-1">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setPreview(url)}
                  className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-transform hover:scale-110 ${
                    preview === url ? 'border-teal-500 ring-2 ring-teal-500/30 scale-105' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5">
            <button
              onClick={handleConfirm}
              disabled={!preview}
              className="flex-1 py-3.5 rounded-2xl font-black text-xs bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>حفظ الصورة وتأكيدها</span>
            </button>
            {preview && (
              <button
                onClick={handleRemove}
                className="py-3.5 px-4 rounded-2xl font-bold text-xs bg-red-50 dark:bg-red-950/30 text-red-600 border border-red-200 dark:border-red-900/30 hover:bg-red-100 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف</span>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
