-- Storage setup only. This file intentionally creates no schools, users,
-- passwords, classes, students, grades, attendance, assignments, or submissions.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('profile-images', 'profile-images', true),
  ('course-assets', 'course-assets', false),
  ('attachments', 'attachments', false),
  ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view profile images') THEN
        CREATE POLICY "Anyone can view profile images" ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own profile image') THEN
        CREATE POLICY "Users can upload their own profile image" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile image') THEN
        CREATE POLICY "Users can update their own profile image" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can upload course assets') THEN
        CREATE POLICY "Teachers can upload course assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'course-assets' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enrolled students can view course assets') THEN
        CREATE POLICY "Enrolled students can view course assets" ON storage.objects FOR SELECT USING (bucket_id = 'course-assets' AND (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher') OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = auth.uid())));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload attachments') THEN
        CREATE POLICY "Users can upload attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their attachments') THEN
        CREATE POLICY "Users can view their attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments' AND (auth.uid()::text = (storage.foldername(name))[1] OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('teacher', 'admin'))));
    END IF;
END $$;
