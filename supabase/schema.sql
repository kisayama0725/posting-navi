-- ========================================
-- PostingNavi 完全スキーマ
-- ========================================

-- is_admin ヘルパー関数（RLS再帰防止）
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ========================================
-- profiles テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 新規ユーザー作成トリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- areas エリアマスタ
-- ========================================
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  ward TEXT DEFAULT '',
  district TEXT DEFAULT '',
  chome TEXT DEFAULT '',
  total_households INTEGER DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read areas" ON areas
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage areas" ON areas
  FOR ALL USING (public.is_admin());

-- ========================================
-- tasks 配布タスク
-- ========================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'paused', 'completed')),
  delivered_count INTEGER DEFAULT 0,
  target_count INTEGER DEFAULT 0,
  route_data JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  last_location JSONB,
  resume_from_index INTEGER DEFAULT 0,
  total_distance_m DOUBLE PRECISION DEFAULT 0,
  current_segment INTEGER DEFAULT 0,
  total_segments INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read own tasks" ON tasks
  FOR SELECT USING (auth.uid() = staff_id);
CREATE POLICY "Staff can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = staff_id);
CREATE POLICY "Admins can manage all tasks" ON tasks
  FOR ALL USING (public.is_admin());

-- ========================================
-- gps_tracks GPS軌跡ログ
-- ========================================
CREATE TABLE gps_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed_m_per_min DOUBLE PRECISION DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gps_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can insert own gps_tracks" ON gps_tracks
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT staff_id FROM tasks WHERE id = gps_tracks.task_id)
  );
CREATE POLICY "Staff can read own gps_tracks" ON gps_tracks
  FOR SELECT USING (
    auth.uid() = (SELECT staff_id FROM tasks WHERE id = gps_tracks.task_id)
  );
CREATE POLICY "Admins can read all gps_tracks" ON gps_tracks
  FOR SELECT USING (public.is_admin());

-- ========================================
-- delivery_photos 投函写真
-- ========================================
CREATE TABLE delivery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('manual', 'admin', 'timer')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE delivery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage own photos" ON delivery_photos
  FOR ALL USING (auth.uid() = staff_id);
CREATE POLICY "Admins can read all photos" ON delivery_photos
  FOR SELECT USING (public.is_admin());

-- ========================================
-- admin_commands 管理者指示
-- ========================================
CREATE TABLE admin_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  command TEXT NOT NULL CHECK (command IN ('take_photo')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read own commands" ON admin_commands
  FOR SELECT USING (auth.uid() = staff_id);
CREATE POLICY "Staff can update own commands" ON admin_commands
  FOR UPDATE USING (auth.uid() = staff_id);
CREATE POLICY "Admins can manage commands" ON admin_commands
  FOR ALL USING (public.is_admin());

-- ========================================
-- staff_sales_records スタッフ別売上
-- ========================================
CREATE TABLE staff_sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  month TEXT NOT NULL,
  order_count INTEGER DEFAULT 0,
  avg_order_value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, area_id, month)
);

ALTER TABLE staff_sales_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read own sales" ON staff_sales_records
  FOR SELECT USING (auth.uid() = staff_id);
CREATE POLICY "Admins can manage all sales" ON staff_sales_records
  FOR ALL USING (public.is_admin());

-- ========================================
-- flyer_calculations AI枚数算出ログ
-- ========================================
CREATE TABLE flyer_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  base_count INTEGER NOT NULL,
  buffer_count INTEGER DEFAULT 0,
  recommended_count INTEGER NOT NULL,
  historical_rate DOUBLE PRECISION DEFAULT 0,
  reasoning TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE flyer_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read own calculations" ON flyer_calculations
  FOR SELECT USING (
    auth.uid() = (SELECT staff_id FROM tasks WHERE id = flyer_calculations.task_id)
  );
CREATE POLICY "Admins can manage calculations" ON flyer_calculations
  FOR ALL USING (public.is_admin());

-- ========================================
-- parking_spots 駐輪場所
-- ========================================
CREATE TABLE parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  place_id TEXT,
  segment_index INTEGER DEFAULT 0,
  ai_reason TEXT DEFAULT '',
  selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE parking_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read own parking_spots" ON parking_spots
  FOR SELECT USING (
    auth.uid() = (SELECT staff_id FROM tasks WHERE id = parking_spots.task_id)
  );
CREATE POLICY "Admins can manage parking_spots" ON parking_spots
  FOR ALL USING (public.is_admin());

-- ========================================
-- ai_feedbacks AI月次振り返り
-- ========================================
CREATE TABLE ai_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  feedback TEXT DEFAULT '',
  strengths JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month)
);

ALTER TABLE ai_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read own feedbacks" ON ai_feedbacks
  FOR SELECT USING (auth.uid() = staff_id);
CREATE POLICY "Admins can manage feedbacks" ON ai_feedbacks
  FOR ALL USING (public.is_admin());

-- ========================================
-- Realtime 有効化
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE gps_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_commands;

-- ========================================
-- Storage バケット（投函写真）
-- ========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-photos', 'delivery-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'delivery-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'delivery-photos');
