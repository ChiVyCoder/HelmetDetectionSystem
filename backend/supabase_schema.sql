-- Chạy trong Supabase Dashboard -> SQL Editor -> New query

-- Bảng chính: mỗi video đã xử lý là 1 record
create table video_analyses (
  id uuid primary key default gen_random_uuid(),
  original_name text,
  video_url text not null,
  video_storage_path text,           -- đường dẫn trong Supabase Storage (để xóa file khi cần)
  thumbnail_url text,
  processed_at timestamptz not null default now(),

  total_frames int,
  processing_time_sec numeric,
  avg_ms_per_frame numeric,
  with_helmet_count int,
  without_helmet_count int,
  unique_riders_tracked int,
  violation_rate_percent numeric
);

-- Bảng con: mỗi dòng là 1 lượt vi phạm cụ thể, liên kết tới video chứa nó
create table violation_events (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references video_analyses(id) on delete cascade,

  track_id int,
  timestamp_sec numeric,
  confidence numeric,
  plate_text text,
  plate_confidence numeric,
  box jsonb
);

-- Index phục vụ tìm kiếm biển số nhanh (kể cả tìm kiếm gần đúng bằng ILIKE)
create index idx_violation_events_plate_text on violation_events (plate_text);
create index idx_violation_events_analysis_id on violation_events (analysis_id);

-- (Tùy chọn) Cho phép đọc công khai nếu không cần đăng nhập - bật Row Level Security
-- rồi thêm policy đơn giản, phù hợp với đồ án không có hệ thống tài khoản người dùng
alter table video_analyses enable row level security;
alter table violation_events enable row level security;

create policy "Cho phép đọc công khai - video_analyses"
  on video_analyses for select
  using (true);

create policy "Cho phép đọc công khai - violation_events"
  on violation_events for select
  using (true);
