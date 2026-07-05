-- ========================================
-- UCE IT v3.1.0 — Attendance Tracking
-- ========================================

CREATE TABLE public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hostel_type TEXT NOT NULL,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PRESENT',
  marked_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, student_id)
);

CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_hostel_date ON public.attendance(hostel_type, date);
CREATE INDEX idx_attendance_dept_year ON public.attendance(hostel_type, date, department, year);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wardens and admins can read attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('boys_warden', 'girls_warden', 'admin')
  ));

CREATE POLICY "Wardens and admins can insert attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('boys_warden', 'girls_warden', 'admin')
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
