import { redirect } from 'next/navigation';

export default async function TeacherQuizzesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/teacher/assignments`);
}
