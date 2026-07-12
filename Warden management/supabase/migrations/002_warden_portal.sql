-- ============================================
-- Warden Management Portal - Database Schema
-- Run this in Supabase SQL Editor
-- Depends on: profiles table (from 001)
-- ============================================

-- 1. ADD wallet_balance TO EXISTING profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. STOCK ITEMS
CREATE TABLE IF NOT EXISTS stock_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Groceries', 'Perishables', 'Dairy', 'Beverages', 'Condiments', 'Other')),
  unit TEXT NOT NULL DEFAULT 'kg',
  min_stock_alert DECIMAL(10,2) DEFAULT 0,
  current_stock DECIMAL(10,2) DEFAULT 0,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  opening_stock DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. STOCK PURCHASES (restock logs)
CREATE TABLE IF NOT EXISTS stock_purchases (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES stock_items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  vendor TEXT,
  date_purchased DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. STOCK USAGE (issue logs)
CREATE TABLE IF NOT EXISTS stock_usage (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES stock_items(id) ON DELETE CASCADE,
  quantity_used DECIMAL(10,2) NOT NULL,
  kitchen_unit TEXT,
  reason TEXT,
  date_used DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. KITCHEN UNITS
CREATE TABLE IF NOT EXISTS kitchen_units (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 6. VENDORS
CREATE TABLE IF NOT EXISTS vendors (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ATTENDANCE RECORDS
-- Note: This data is ingested from the student app
CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  meal_type TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date, meal_type)
);

-- 8. WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. MONTHLY EXPENSE SUMMARY
CREATE TABLE IF NOT EXISTS monthly_expense_summary (
  id BIGSERIAL PRIMARY KEY,
  month DATE NOT NULL,
  total_mess_expense DECIMAL(10,2) DEFAULT 0,
  total_active_days INTEGER DEFAULT 0,
  per_day_cost DECIMAL(10,2) DEFAULT 0,
  total_students_billed INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month)
);

-- 10. MONTHLY BILLS (per student per month)
CREATE TABLE IF NOT EXISTS monthly_bills (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_days_present INTEGER DEFAULT 0,
  per_day_cost DECIMAL(10,2) DEFAULT 0,
  total_bill DECIMAL(10,2) DEFAULT 0,
  deducted_from_wallet DECIMAL(10,2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, month)
);

-- 11. SYSTEM ALERTS
CREATE TABLE IF NOT EXISTS system_alerts (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('maintenance', 'fee_overdue', 'inventory', 'visitor', 'other')),
  entity_id TEXT,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_stock_purchases_item ON stock_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_date ON stock_purchases(date_purchased);
CREATE INDEX IF NOT EXISTS idx_stock_usage_item ON stock_usage(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_usage_date ON stock_usage(date_used);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_student ON wallet_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_student ON monthly_bills(student_id);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_month ON monthly_bills(month);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- ============================================
-- SEED DATA
-- ============================================
INSERT INTO kitchen_units (name, description) VALUES
  ('Mess Hall A', 'Undergraduate Student Mess'),
  ('Mess Hall B', 'Postgraduate Student Mess'),
  ('Staff Kitchen', 'Faculty and Staff Dining'),
  ('Guest House', 'Visitor Guest House Kitchen')
ON CONFLICT DO NOTHING;

INSERT INTO vendors (name, contact) VALUES
  ('Agarwal Wholesale', '9876543210'),
  ('Shiva Enterprises', '9876543211'),
  ('Fresh Dairy Co-op', '9876543212'),
  ('Global Grains Pvt Ltd', '9876543213')
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_expense_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Stock items: all authenticated users can read, admin/warden can write
CREATE POLICY stock_items_select ON stock_items FOR SELECT USING (true);
CREATE POLICY stock_items_insert ON stock_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'boys_warden', 'girls_warden')));
CREATE POLICY stock_items_update ON stock_items FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'boys_warden', 'girls_warden')));
CREATE POLICY stock_items_delete ON stock_items FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Stock purchases: read all, write by admin/warden
CREATE POLICY stock_purchases_select ON stock_purchases FOR SELECT USING (true);
CREATE POLICY stock_purchases_insert ON stock_purchases FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'boys_warden', 'girls_warden')));

-- Stock usage: read all, write by admin/warden
CREATE POLICY stock_usage_select ON stock_usage FOR SELECT USING (true);
CREATE POLICY stock_usage_insert ON stock_usage FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'boys_warden', 'girls_warden')));

-- Kitchen units & vendors: read all, write admin
CREATE POLICY kitchen_units_select ON kitchen_units FOR SELECT USING (true);
CREATE POLICY vendors_select ON vendors FOR SELECT USING (true);

-- Attendance: read by admin/warden, insert by system
CREATE POLICY attendance_records_select ON attendance_records FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'boys_warden', 'girls_warden')));

-- Wallet transactions: read by admin/warden
CREATE POLICY wallet_transactions_select ON wallet_transactions FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'boys_warden', 'girls_warden')));

-- Monthly tables: read by admin/warden
CREATE POLICY monthly_expense_summary_select ON monthly_expense_summary FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'boys_warden', 'girls_warden')));
CREATE POLICY monthly_bills_select ON monthly_bills FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'boys_warden', 'girls_warden')));

-- System alerts: read by admin/warden
CREATE POLICY system_alerts_select ON system_alerts FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'boys_warden', 'girls_warden')));
CREATE POLICY system_alerts_insert ON system_alerts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'boys_warden', 'girls_warden')));
