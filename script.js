/* ============================================================
   B.C.A // INTERNAL ARCHIVE TERMINAL — 前端逻辑
   模块：时钟 / 舞台切换 / 活体识别 / 会话计时 / 检索 / 导航
   ============================================================ */
'use strict';

/* ---------- 工具 ---------- */
function $(sel, root){ return (root || document).querySelector(sel); }
function $$(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function pad(n){ return String(n).padStart(2, '0'); }

/* ---------- 日志 ---------- */
function log(msg){
  const l1 = $('#log1'), l2 = $('#log2');
  if(!l1 || !l2) return;
  l2.textContent = l1.textContent;
  l1.textContent = msg;
}

/* ---------- 时钟 ---------- */
function tick(){
  const d = new Date();
  const el = $('#clock');
  if(!el) return;
  el.textContent =
    d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) +
    '  ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}
tick();
setInterval(tick, 1000);

/* ---------- 舞台切换 ---------- */
function hideAllStages(){
  $$('.stage').forEach(function(s){ s.classList.remove('active'); });
}
function go(n){
  if(n < 0) return;
  hideAllStages();
  const el = document.getElementById('s' + n);
  if(el) el.classList.add('active');
  if(n === 1) log('SYS // ACCESS REQUEST QUEUED');
  if(n === 3) startScan();
  if(n === 4) typeCredentials();
}

/* ---------- 拒绝 / 取消（终止连接） ---------- */
function denyExit(){
  log('SYS // CONNECTION TERMINATED BY OPERATOR');
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;inset:0;background:#05080a;z-index:200;display:flex;align-items:center;justify-content:center;color:#ff5a6a;font-size:12px;letter-spacing:.3em';
  t.textContent = '连接已终止';
  document.body.appendChild(t);
  setTimeout(function(){
    t.remove();
    resetStages();
    go(0);
  }, 1400);
}

/* ---------- 复位：扫描进度 / 状态文字 / 凭证 ---------- */
function resetStages(){
  const bar = $('#bar');
  const st  = $('#scanStatus');
  if(bar) bar.style.width = '0';
  if(st){ st.textContent = 'BIOMETRIC SCAN · INITIALIZING'; st.style.color = ''; }

  const sc = $('#scanline');
  if(sc) sc.style.top = '0';

  const uid = $('#uid');
  const ukey = $('#ukey');
  if(uid) uid.textContent = '————';
  if(ukey) ukey.textContent = '————';

  scanning = false;
  stopTyping();
}

/* ---------- 活体识别 ---------- */
let scanning = false;

function startScan(){
  if(scanning) return;
  scanning = true;
  const bar = $('#bar');
  const st  = $('#scanStatus');
  const sc  = $('#scanline');
  let p = 0;
  const anim = setInterval(function(){ if(sc) sc.style.top = (p % 100) + '%'; }, 16);
  const iv = setInterval(function(){
    p += Math.random() * 4 + 1.2;
    if(p >= 100){
      p = 100;
      clearInterval(iv);
      clearInterval(anim);
      if(bar) bar.style.width = '100%';
      if(st){ st.textContent = 'VERIFIED · ACCESS GRANTED'; st.style.color = '#4fe0c0'; }
      log('BIO // IDENTITY CONFIRMED');
      setTimeout(function(){ scanning = false; go(4); }, 1000);
      return;
    }
    if(bar) bar.style.width = p + '%';
    if(st) st.textContent = 'BIOMETRIC SCAN · ' + Math.floor(p) + '%';
  }, 110);
}

/* ---------- 凭证打字机（含防重入） ---------- */
let typeInts = [];
let typeTimeout = null;

function stopTyping(){
  typeInts.forEach(function(id){ clearInterval(id); });
  typeInts = [];
  if(typeTimeout){ clearTimeout(typeTimeout); typeTimeout = null; }
}

function typeCredentials(){
  const uid = $('#uid');
  const ukey = $('#ukey');
  if(!uid || !ukey) return;
  stopTyping();
  uid.textContent = '';
  ukey.textContent = '';
  const s1 = 'OPERATOR-0214', s2 = '••••••••••••';
  let i = 0, j = 0;
  const a = setInterval(function(){
    if(i < s1.length){ uid.textContent += s1[i++]; }
    else clearInterval(a);
  }, 55);
  typeInts.push(a);
  typeTimeout = setTimeout(function(){
    const b = setInterval(function(){
      if(j < s2.length){ ukey.textContent += s2[j++]; }
      else clearInterval(b);
    }, 45);
    typeInts.push(b);
  }, 700);
}

/* ---------- 会话计时器 ---------- */
let sessionEndAt = 0;
let sessionTick = null;
const SESSION_MINUTES = 45;

function startSessionTimer(){
  sessionEndAt = Date.now() + SESSION_MINUTES * 60 * 1000;
  const el = $('#sessionTimer');
  if(el){ el.style.display = 'inline'; el.classList.remove('warn-flash'); }
  clearInterval(sessionTick);
  sessionTick = setInterval(updateSessionTimer, 1000);
  updateSessionTimer();
}

function updateSessionTimer(){
  const el = $('#sessionTimer');
  if(!el) return;
  const left = Math.max(0, sessionEndAt - Date.now());
  const total = Math.ceil(left / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  el.textContent = 'TEMP // ' + pad(m) + ':' + pad(s);
  if(left <= 60000 && left > 0) el.classList.add('warn-flash');
  if(left <= 0){
    clearInterval(sessionTick);
    sessionTick = null;
    const modal = $('#expireModal');
    if(modal) modal.classList.add('on');
    log('SEC // SESSION EXPIRED · TEMP ACCESS 45:00');
  }
}

function stopSessionTimer(){
  clearInterval(sessionTick);
  sessionTick = null;
  const el = $('#sessionTimer');
  if(el){ el.style.display = 'none'; el.classList.remove('warn-flash'); }
}

/* ---------- 工作区状态复位（检索 + 视图） ---------- */
function resetWorkspace(){
  const q = $('#q');
  if(q) q.value = '';
  const resBox = $('#results');
  if(resBox){ resBox.classList.remove('on'); resBox.innerHTML = ''; }

  $$('.view').forEach(function(x){ x.classList.remove('on'); });
  const profile = $('#view-profile');
  if(profile) profile.classList.add('on');
  setActiveNav('profile');
}

/* ---------- 登录 / 退出 ---------- */
function doLogin(){
  hideAllStages();
  const app = $('#app');
  if(app) app.classList.add('active');
  log('AUTH // SESSION OPENED');

  resetWorkspace();
  startSessionTimer();

  const m = $('.main');
  if(m) m.scrollTop = 0;
}

function logout(){
  stopSessionTimer();
  const app = $('#app');
  if(app) app.classList.remove('active');
  resetStages();
  resetWorkspace();
  go(0);
  log('SYS // SESSION TERMINATED');
}

/* ---------- 检索索引 ----------
   fuzzy:true  → 模糊检索（子串 / 双向包含）
   fuzzy:false → 精确检索（仅当输入与词条名完全一致，如「程伟民」）
   ─────────────────────────────────────────── */
const DOCS = [
  {
    id: 'sharo',
    title: '沙罗会',
    type: 'OBSERVATION FILE',
    level: 5,
    desc: '未确认异能组织 · 目的不明 · 持续监控',
    fuzzy: true,
    keys: ['沙罗会','沙罗','sharo','纹身','未确认组织','古老组织','监控对象']
  },
  {
    id: 'bahati',
    title: 'BAHATI',
    type: 'INSTITUTION FILE',
    level: 5,
    desc: '英都语言学校 · 2009 年火灾后停办',
    fuzzy: true,
    keys: ['bahati','巴哈提','语言学校','特殊学校','斯瓦希里','火灾']
  },
  {
    id: 'xiang',
    title: '向',
    type: 'PERSONNEL FILE',
    level: 3,
    desc: '第七特别调查科 · 确认离职 · 2019 年批捕',
    fuzzy: true,
    keys: ['向','xiang','带教','高利贷','第七特别调查科','离职']
  },
  {
    id: 'ayuan',
    title: '阿元',
    type: 'PERSONNEL FILE',
    level: 3,
    desc: '火灾幸存者 · 言语支配 · 缅挝地区失联',
    fuzzy: true,
    keys: ['阿元','ayuan','缅挝','失忆','言灵','语言控制','控制他人']
  },
  {
    id: 'xiafei',
    title: '夏斐',
    type: 'PERSONNEL FILE',
    level: 4,
    desc: '火灾幸存者 · 英都皇家学院在读 · 需监控',
    fuzzy: true,
    keys: ['夏斐','xiafei','felix','皇家学院','模特','萧未影','失忆']
  },
  {
    id: 'wangqing',
    title: '王青',
    type: 'PERSONNEL FILE',
    level: 3,
    desc: '火灾唯一公开幸存者 · 心理咨询师 · 需监控',
    fuzzy: true,
    keys: ['王青','wangqing','chris','心理咨询','假死','失忆']
  },
  {
    id: 'bca',
    title: 'B.C.A 英都犯罪调查局',
    type: 'AGENCY FILE',
    level: 1,
    desc: '机构总览 · 异能犯罪官方调查机构',
    fuzzy: true,
    keys: ['bca','b.c.a','bridon','crime agency','犯罪调查局','调查局']
  },
  {
    id: 'weimin',
    title: '程伟民',
    type: 'PERSONNEL FILE',
    level: 5,
    desc: 'BAHATI 教师 · 内容受限',
    fuzzy: false,
    keys: ['程伟民','chengweimin']
  },
  {
    id: 'eagle',
    title: '雏鹰计划',
    type: 'PROJECT FILE',
    level: 3,
    desc: 'B.C.A 未成年异能者定向培养专项 · 2003 年立项',
    fuzzy: true,
    keys: ['雏鹰计划','雏鹰','eagle','专项培养','培养计划','未成年','定向培养']
  },
  {
    id: 'case',
    title: '萧氏商会灭门案',
    type: 'CASE FILE · C-01',
    level: 4,
    desc: '唐人街 · 萧氏宅邸 · 9 名死者 · 不予立案',
    fuzzy: true,
    keys: ['萧氏商会灭门案','萧氏商会','萧氏','商会灭门','灭门案','灭门','c-01','c01']
  },
  {
    id: 'dept',
    title: '警察厅特别调查科',
    type: 'DEPARTMENT FILE · SIU',
    level: 2,
    desc: 'B.C.A 与英都警察厅联合设立 · 唯一输送通道',
    fuzzy: true,
    keys: ['警察厅特别调查科','特别调查科','警察厅','特别调查','bps','siu']
  }
];

const qInput = $('#q');
const resBox = $('#results');

/* ---------- 索引查询：模糊 / 精确 ---------- */
function searchIndex(raw){
  const q = raw.toLowerCase();
  const hits = [];

  DOCS.forEach(function(d){
    let score = 0;
    const keys = [d.title].concat(d.keys || []);
    if(d.fuzzy === false){
      // 精确检索：必须与词条名（或罗马字）完全一致，不做子串匹配
      keys.forEach(function(k){
        if(k.toLowerCase() === q) score = 100;
      });
    }else{
      // 单字查询（如「向」「萧」）只按前缀匹配，避免命中「定向培养」这类泛词
      const oneChar = q.length === 1;
      keys.forEach(function(k){
        const kk = k.toLowerCase();
        if(kk === q) score = Math.max(score, 100);
        else if(kk.indexOf(q) === 0) score = Math.max(score, 70);
        else if(!oneChar && kk.indexOf(q) !== -1) score = Math.max(score, 50);
        else if(!oneChar && kk.length > 1 && q.indexOf(kk) !== -1) score = Math.max(score, 25);
      });
    }
    if(score > 0) hits.push({ doc: d, score: score });
  });

  hits.sort(function(a, b){
    if(b.score !== a.score) return b.score - a.score;
    return a.doc.title.length - b.doc.title.length;
  });
  return hits.map(function(h){ return h.doc; });
}

function resultItem(d){
  return '<div class="res-item" data-id="' + d.id + '" role="button" tabindex="0">' +
    '<span class="rk">›</span>' +
    '<div class="rt"><b>' + d.title + '</b>' +
    '<small><span class="lv">L' + d.level + '</span>' + d.type + '</small>' +
    '<small>' + d.desc + '</small></div></div>';
}

function renderResults(list, opts){
  opts = opts || {};
  if(!list.length){
    resBox.innerHTML = '<div class="res-empty">暂无资料 · NO RECORD</div>';
  }else{
    let html = '';
    if(opts.head) html += '<div class="res-help">' + opts.head + '</div>';
    html += list.map(resultItem).join('');
    resBox.innerHTML = html;
  }
  resBox.classList.add('on');
}

/* ---------- 检索 ---------- */
function doSearch(){
  if(!qInput || !resBox) return;
  const raw = qInput.value.trim();
  const q = raw.toLowerCase();
  if(!q){ resBox.classList.remove('on'); resBox.innerHTML = ''; return; }

  // help：输出全部可检索词条，不含 help 本身
  if(q === 'help'){
    renderResults(DOCS, { head: 'QUERY HELP · 全部可检索词条 · 共 ' + DOCS.length + ' 条' });
    log('IDX // HELP · ' + DOCS.length + ' ENTRIES LISTED');
    return;
  }

  renderResults(searchIndex(raw));
  log('IDX // QUERY · ' + raw.toUpperCase());
}

if(qInput){
  qInput.addEventListener('input', doSearch);
  qInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      const first = resBox ? resBox.querySelector('.res-item') : null;
      if(first) first.click();
    }
    if(e.key === 'Escape'){
      if(resBox) resBox.classList.remove('on');
      qInput.blur();
    }
  });
}

/* 事件委托：检索结果点击 / 键盘 */
if(resBox){
  resBox.addEventListener('click', function(e){
    const item = e.target.closest('.res-item');
    if(item) openDoc(item.getAttribute('data-id'));
  });
  resBox.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.res-item');
    if(item){ e.preventDefault(); openDoc(item.getAttribute('data-id')); }
  });
}

document.addEventListener('click', function(e){
  if(resBox && !e.target.closest('.searchwrap')){
    resBox.classList.remove('on');
  }
});

/* ---------- 打开词条 ---------- */
function openDoc(id){
  if(!id) return;
  $$('.view').forEach(function(x){ x.classList.remove('on'); });
  const v = document.getElementById('view-doc-' + id);
  if(v) v.classList.add('on');
  setActiveNav(null);
  if(resBox) resBox.classList.remove('on');
  const m = $('.main');
  if(m) m.scrollTop = 0;
  log('IDX // DOCUMENT OPENED · ' + id.toUpperCase());
}

function backToProfile(){
  $$('.view').forEach(function(x){ x.classList.remove('on'); });
  const profile = $('#view-profile');
  if(profile) profile.classList.add('on');
  setActiveNav('profile');
  const m = $('.main');
  if(m) m.scrollTop = 0;
  log('NAV // VIEW PROFILE');
}

/* ---------- 导航（含键盘可达性） ---------- */
function setActiveNav(v){
  $$('.nav-item').forEach(function(x){
    const on = !!v && x.getAttribute('data-v') === v;
    x.classList.toggle('on', on);
    if(on) x.setAttribute('aria-current', 'page');
    else x.removeAttribute('aria-current');
  });
}

function activateNav(item){
  const v = item.getAttribute('data-v');
  setActiveNav(v);
  $$('.view').forEach(function(x){ x.classList.remove('on'); });
  const view = document.getElementById('view-' + v);
  if(view) view.classList.add('on');
  const m = $('.main');
  if(m) m.scrollTop = 0;
  if(v === 'pre') log('SEC // ACCESS DENIED · LEVEL 5 REQUIRED');
  else log('NAV // VIEW ' + v.toUpperCase());
}

$$('.nav-item').forEach(function(item){
  item.setAttribute('role', 'button');
  item.setAttribute('tabindex', '0');
  item.addEventListener('click', function(){ activateNav(item); });
  item.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); activateNav(item); }
  });
});

/* ---------- 案件展开（含键盘可达性） ---------- */
function toggleCase(h){
  const box = h.parentElement;
  if(!box) return;
  box.classList.toggle('open');
  h.setAttribute('aria-expanded', String(box.classList.contains('open')));
}

$$('.case-h').forEach(function(h){
  h.setAttribute('role', 'button');
  h.setAttribute('tabindex', '0');
  h.setAttribute('aria-expanded', 'false');
  h.addEventListener('click', function(){ toggleCase(h); });
  h.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleCase(h); }
  });
});

/* ---------- 返回档案链接（键盘可达性） ---------- */
$$('.backlink').forEach(function(b){
  b.setAttribute('role', 'button');
  b.setAttribute('tabindex', '0');
  b.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); backToProfile(); }
  });
});

/* ---------- 启动页：建立安全连接 ---------- */
const connBtn = $('#connBtn');
if(connBtn){
  connBtn.addEventListener('click', function(){ go(1); });
  connBtn.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(1); }
  });
}

/* ---------- 到期弹窗：重新申请权限 ---------- */
document.body.addEventListener('click', function(e){
  if(e.target && e.target.id === 'expireBtn'){
    const modal = $('#expireModal');
    if(modal) modal.classList.remove('on');
    stopSessionTimer();
    const app = $('#app');
    if(app) app.classList.remove('active');
    resetStages();
    go(0);
    log('SYS // SESSION RESET · RE-AUTH REQUIRED');
  }
});

/* ============================================================
   彩蛋 · 越级提权（受限词条「程伟民」）
   流程：越级警告 → 申请提权（是 / 否）→ 读条校验 → 强警告 → 强制登出
   ============================================================ */
let escInts = [];
let escTouts = [];

function clearEscTimers(){
  escInts.forEach(function(id){ clearInterval(id); });
  escTouts.forEach(function(id){ clearTimeout(id); });
  escInts = [];
  escTouts = [];
}

function setEscStep(n){
  ['escS1', 'escS2', 'escS3'].forEach(function(id, i){
    const el = document.getElementById(id);
    if(el) el.classList.toggle('on', i === n - 1);
  });
}

function resetEsc(){
  clearEscTimers();
  const modal = $('#escModal');
  if(modal) modal.classList.remove('on', 'danger');
  const box = $('.esc-box');
  if(box) box.classList.remove('danger');

  setEscStep(1);
  const bar = $('#escBar');
  if(bar) bar.style.width = '0';
  const st = $('#escStatus');
  if(st) st.textContent = 'CLEARANCE CHECK · 0%';
  const cd = $('#escCount');
  if(cd) cd.textContent = 'FORCED LOGOUT · 5';
}

/* 打开越级警告：由受限词条区域触发 */
function openEsc(){
  resetEsc();
  const modal = $('#escModal');
  if(modal) modal.classList.add('on');
  log('SEC // ESCALATION REQUEST · LEVEL 5 REQUIRED');
}

function closeEsc(){
  const modal = $('#escModal');
  if(modal) modal.classList.remove('on', 'danger');
  const box = $('.esc-box');
  if(box) box.classList.remove('danger');
}

/* 否：退回已登录的主界面 */
function escDeny(){
  closeEsc();
  resetEsc();
  log('SEC // ESCALATION DECLINED BY OPERATOR');
  backToProfile();
}

/* 是：读取权限环境变量 */
function escAccept(){
  setEscStep(2);
  const bar = $('#escBar');
  const st  = $('#escStatus');
  const steps = [
    'READING ENVIRONMENT VARIABLES',
    'RESOLVING USER SID',
    'QUERYING CLEARANCE TABLE',
    'COMPARING TOKEN GROUPS'
  ];
  let p = 0;
  const iv = setInterval(function(){
    p += Math.random() * 6 + 2;
    if(p >= 100) p = 100;
    if(bar) bar.style.width = p + '%';
    if(st){
      const k = Math.min(steps.length - 1, Math.floor(p / 26));
      st.textContent = 'CLEARANCE CHECK · ' + steps[k] + ' · ' + Math.floor(p) + '%';
    }
    if(p >= 100){
      clearInterval(iv);
      escTouts.push(setTimeout(escFail, 420));
    }
  }, 95);
  escInts.push(iv);
  log('SEC // ESCALATION ACCEPTED · VERIFYING CLEARANCE');
}

/* 校验失败：强警告 + 倒计时 */
function escFail(){
  setEscStep(3);
  const modal = $('#escModal');
  const box = $('.esc-box');
  if(modal) modal.classList.add('danger');
  if(box) box.classList.add('danger');
  log('SEC // ESCALATION DENIED · USER NOT IN SYSTEM ENV');

  const cd = $('#escCount');
  let left = 5;
  if(cd) cd.textContent = 'FORCED LOGOUT · ' + left;
  const iv = setInterval(function(){
    left--;
    if(cd) cd.textContent = 'FORCED LOGOUT · ' + Math.max(0, left);
    if(left <= 0){
      clearInterval(iv);
      escInts = escInts.filter(function(x){ return x !== iv; });
      forcedLogout();
    }
  }, 1000);
  escInts.push(iv);
}

/* 强制登出：回到「建立安全连接」启动界面（可重新登录） */
function forcedLogout(){
  closeEsc();
  resetEsc();
  stopSessionTimer();
  const app = $('#app');
  if(app) app.classList.remove('active');
  resetStages();
  resetWorkspace();
  go(0);
  log('SEC // FORCED DISCONNECT · SESSION PURGED');
}

/* 弹窗按钮（弹窗标记位于脚本之后，故用事件委托） */
document.body.addEventListener('click', function(e){
  const t = e.target;
  if(!t) return;
  if(t.id === 'escYes') escAccept();
  else if(t.id === 'escNo') escDeny();
});

/* 受限词条：键盘可达 */
document.addEventListener('keydown', function(e){
  const t = e.target;
  if(e.key === 'Escape'){
    const modal = $('#escModal');
    if(modal && modal.classList.contains('on') && !modal.classList.contains('danger')){
      escDeny();
    }
    return;
  }
  if(e.key !== 'Enter' && e.key !== ' ') return;
  if(t && t.classList && t.classList.contains('restrict')){
    e.preventDefault();
    openEsc();
  }
});
