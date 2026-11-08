/* 工商自委资料库 · 公共工具与登录态 */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

let _profileCache = null;

async function getUser() {
  const { data } = await sb.auth.getUser();
  return data ? data.user : null;
}

async function getProfile(force = false) {
  if (_profileCache && !force) return _profileCache;
  const user = await getUser();
  if (!user) { _profileCache = null; return null; }
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  _profileCache = data || {
    id: user.id, email: user.email || '', display_name: user.email || '成员',
    role: 'member', status: 'pending'
  };
  return _profileCache;
}

function isApproved(p) { return !!p && p.status === 'approved'; }
function isManager(p) { return !!p && (p.role === 'owner' || p.role === 'admin') && p.status === 'approved'; }
function isOwner(p) { return !!p && p.role === 'owner' && p.status === 'approved'; }
function isAdmin(p) { return isManager(p); }

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtSize(bytes) {
  const n = Number(bytes || 0);
  if (!n) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

function toast(msg, type = 'ok') {
  let box = $('#toastBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastBox';
    box.className = 'toast-box';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
}

async function signUrl(bucket, path, expires = 3600) {
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expires);
  if (error) throw error;
  return data.signedUrl;
}

async function fileUrl(bucket, path) {
  if (bucket === SITE.buckets.public) {
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  return signUrl(bucket, path, 3600);
}

function bucketOf(m) { return m.visibility === 'public' ? SITE.buckets.public : SITE.buckets.internal; }

async function downloadMaterial(m) {
  try {
    const url = await fileUrl(bucketOf(m), m.file_path);
    const a = document.createElement('a');
    a.href = url;
    a.download = m.file_name || 'download';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    toast('获取文件失败：' + (e.message || '请稍后重试'), 'err');
  }
}

function navHighlight() {
  const p = location.pathname.split('/').pop() || 'index.html';
  $$('.main-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === p) a.classList.add('active');
  });
}

async function initAuth() {
  const area = $('#authArea');
  const p = await getProfile(true);
  if (area) {
    if (!p) {
      area.innerHTML = '<a class="btn btn-primary btn-sm" href="login.html">登录</a>';
    } else {
      const links = [];
      if (isApproved(p)) links.push('<a class="nav-link" href="studio.html">工作台</a>');
      if (isAdmin(p)) links.push('<a class="nav-link" href="admin.html">管理</a>');
      area.innerHTML = `<span class="user-chip" title="${esc(p.email)}">${esc(p.display_name || p.email)}</span>${links.join('')}<button class="btn btn-ghost btn-sm" id="logoutBtn">退出</button>`;
      const btn = $('#logoutBtn');
      if (btn) btn.addEventListener('click', async () => {
        await sb.auth.signOut();
        location.reload();
      });
    }
  }
  navHighlight();
  return p;
}

document.addEventListener('DOMContentLoaded', () => { initAuth(); });
