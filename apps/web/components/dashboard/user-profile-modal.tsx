'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from 'next-intl';
import { User, Mail, School, GraduationCap } from 'lucide-react';
import Image from 'next/image';

export function UserProfileModal({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth();
    const isEnglish = useLocale() === 'en';

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                    <DialogTitle className="text-white text-xl">{isEnglish ? 'Profile' : 'الملف الشخصي'}</DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-6">
                    <div className="flex flex-col items-center -mt-12">
                        <div className="relative h-24 w-24 overflow-hidden rounded-full bg-primary-100 p-1 shadow-lg">
                            {profile?.avatar_url
                                ? <Image src={profile.avatar_url} alt={isEnglish ? `${profile.full_name || 'User'} profile photo` : `صورة ${profile.full_name || 'المستخدم'}`} fill unoptimized sizes="96px" className="rounded-full bg-white object-contain" />
                                : <div className="flex h-full w-full items-center justify-center rounded-full text-3xl font-bold text-primary-600">{profile?.full_name?.[0] || 'N'}</div>}
                        </div>
                        <h3 className="mt-4 font-bold text-xl text-gray-900">{profile?.full_name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{isEnglish ? ({ student: 'Student', teacher: 'Teacher', parent: 'Parent', admin: 'Administrator', manager: 'School manager', principal: 'Principal' } as Record<string, string>)[profile?.role || ''] || profile?.role : ({ student: 'طالب', teacher: 'معلم', parent: 'ولي أمر', admin: 'مشرف', manager: 'مدير المدرسة', principal: 'مدير المدرسة' } as Record<string, string>)[profile?.role || ''] || profile?.role}</p>
                    </div>

                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-500 shadow-sm">
                                <Mail className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-gray-700">{user?.email}</span>
                        </div>
                        {profile?.phone ? <div className="flex items-center gap-3 text-sm"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary-500 shadow-sm"><User className="h-4 w-4" /></div><span className="font-medium text-gray-700">{profile.phone}</span></div> : null}
                        {profile?.gradeLevel !== undefined ? <div className="flex items-center gap-3 text-sm"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary-500 shadow-sm"><GraduationCap className="h-4 w-4" /></div><span className="font-medium text-gray-700">{isEnglish ? `Grade ${profile.gradeLevel}` : `الصف الدراسي ${profile.gradeLevel}`}</span></div> : null}
                        {profile?.schoolId ? <div className="flex items-center gap-3 text-sm"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary-500 shadow-sm"><School className="h-4 w-4" /></div><span className="font-medium text-gray-700">{isEnglish ? 'Linked to a school' : 'حساب مرتبط بمدرسة'}</span></div> : null}
                    </div>

                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm leading-6 text-slate-600">
                        {isEnglish ? 'Your name is registered with the school and cannot be changed here. To update your contact number, open Settings.' : 'الاسم مسجل لدى المدرسة ولا يمكن تغييره من الحساب. لتحديث رقم التواصل افتح الإعدادات.'}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
