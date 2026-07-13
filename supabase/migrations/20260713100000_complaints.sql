CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Review', 'Resolved', 'Rejected')),
  admin_response TEXT,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Students can view and create their own complaints
CREATE POLICY "Students view own complaints"
  ON complaints FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students create complaints"
  ON complaints FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Admins can view all complaints and update them
CREATE POLICY "Admins view all complaints"
  ON complaints FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins update complaints"
  ON complaints FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Warden / mess_incharge / security can also view complaints related to their area
CREATE POLICY "Staff view complaints"
  ON complaints FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('boys_warden', 'girls_warden', 'mess_incharge', 'security')));
