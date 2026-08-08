const { createClient } = require('@supabase/supabase-js');

// QUAN TRỌNG: dùng SERVICE ROLE KEY (không phải anon key) vì đây là code
// chạy phía server, cần quyền ghi đầy đủ vào database + storage.
// Key này TUYỆT ĐỐI không được lộ ra frontend hay commit lên git.
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VIDEO_BUCKET = 'videos';

module.exports = { supabase, VIDEO_BUCKET };
