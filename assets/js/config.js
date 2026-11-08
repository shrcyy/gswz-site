// 工商自委资料库 · 站点配置与 Supabase 客户端
// 注意：anon key 是公开密钥，安全性由数据库 RLS 策略保证，可随前端发布

const SUPABASE_URL = 'https://powlrgcnvzfrkonxfyya.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd2xyZ2NudnpmcmtvbnhmeXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxNDEzNzgsImV4cCI6MjEwOTcxNzM3OH0.oxJaEKlV3FiiRfmp_6seQRHh83kWFsN_swBNgnBrhsQ';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SITE = {
  name: '工商自委',
  fullName: '辽宁工程技术大学工商管理学院大学生自律委员会',
  shortName: '工商自委',
  departments: ['主席团', '办公室', '文艺部', '治生部', '组织部'],
  categories: ['通知公告', '制度文件', '模板表格', '会议纪要', '活动资料', '考核台账', '照片影像', '其他'],
  years: ['2023-2024', '2024-2025', '2025-2026', '2026-2027', '2027-2028'],
  buckets: {
    public: 'gswz-public',
    internal: 'gswz-internal'
  }
};

// 当前学年（9 月起算新学年）
function currentAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const start = m >= 9 ? y : y - 1;
  return `${start}-${start + 1}`;
}
