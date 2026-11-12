/* ============================================================
   B.C.A // INTERNAL ARCHIVE TERMINAL — 前端逻辑
   模块：时钟 / 舞台切换 / 活体识别 / 会话计时 / 检索 / 导航
   ============================================================ */
'use strict';

/* ---------- 工具 ---------- */
function $(sel, root){ return (root || document).querySelector(sel); }
function $$(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function pad(n){ return String(n).padStart(2, '0'); }

/* 安全认证页的计时器池（打字 / 停顿） */
var authTimers = [];

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
  if(n === 5) prepareQuestion();
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
  closePreModal();
  resetAuthUI();
  stopPing();
  closeRatModal();
  closeConsent();
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
const SESSION_MINUTES = 20;

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
    log('SEC // SESSION EXPIRED · TEMP ACCESS 20:00');
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
    keys: ['夏斐','xiafei','felix','皇家学院','模特','失忆']
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
    id: 'jae',
    title: 'JAE LEE',
    type: 'PERSONNEL FILE',
    level: 4,
    desc: '本档案对象 · 档案说明',
    fuzzy: true,
    keys: ['jae lee','jae','lee','李孑','本档案对象','档案对象']
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
/* help / ping 不是词条，是命令：输入后需按 Enter 才执行 */
function asCommand(q){
  if(q === 'help' || q === 'ping') return q;
  return '';
}

function doSearch(){
  if(!qInput || !resBox) return;
  const raw = qInput.value.trim();
  const q = raw.toLowerCase();
  if(!q){ resBox.classList.remove('on'); resBox.innerHTML = ''; return; }

  const cmd = asCommand(q);
  if(cmd){
    resBox.innerHTML =
      '<div class="res-item res-cmd" data-cmd="' + cmd + '" role="button" tabindex="0">' +
        '<span class="rk">⌘</span>' +
        '<div class="rt"><b>' + cmd + '</b>' +
        '<small><span class="lv">CMD</span>命令 · 按 ENTER 执行</small></div></div>';
    resBox.classList.add('on');
    log('IDX // COMMAND · ' + cmd.toUpperCase());
    return;
  }

  renderResults(searchIndex(raw));
  log('IDX // QUERY · ' + raw.toUpperCase());
}

function runCommand(name){
  if(name === 'help') enterHelp();
  else if(name === 'ping') enterPing();
}

if(qInput){
  qInput.addEventListener('input', doSearch);
  qInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      const cmd = asCommand(qInput.value.trim().toLowerCase());
      if(cmd){ runCommand(cmd); return; }
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
    const cmdEl = e.target.closest('.res-cmd');
    if(cmdEl){ runCommand(cmdEl.getAttribute('data-cmd')); return; }
    const item = e.target.closest('.res-item');
    if(item) openDoc(item.getAttribute('data-id'));
  });
  resBox.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const cmdEl = e.target.closest('.res-cmd');
    if(cmdEl){ e.preventDefault(); runCommand(cmdEl.getAttribute('data-cmd')); return; }
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
  stopPing();
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
  stopPing();
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
      escTo404();
    }
  }, 1000);
  escInts.push(iv);
}

/* 提权失败：断开并落到 404（只能刷新恢复） */
function escTo404(){
  closeEsc();
  resetEsc();
  log('SEC // ESCALATION REVOKED');
  show404();
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

/* ============================================================
   安全认证问题（登录前）
   ============================================================ */
const SEC_LATIN = 'vein';
const SEC_CN = '萧未影';

function clearAuthTimers(){
  for(var i = 0; i < authTimers.length; i++){
    clearTimeout(authTimers[i]);
    clearInterval(authTimers[i]);
  }
  authTimers = [];
}

function closeAuthModals(){
  const ok = $('#okModal');
  const no = $('#noModal');
  if(ok) ok.classList.remove('on');
  if(no) no.classList.remove('on');
  const l1 = $('#noLine1');
  const l2 = $('#noLine2');
  if(l1){ l1.textContent = ''; l1.classList.remove('typing'); }
  if(l2){ l2.textContent = ''; l2.classList.remove('typing'); }
}

function resetAuthUI(){
  clearAuthTimers();
  closeAuthModals();
  const inp = $('#ansInput');
  if(inp) inp.value = '';
}

/* 进入作答页 */
function prepareQuestion(){
  resetAuthUI();
  setTimeout(function(){
    const i = $('#ansInput');
    if(i) i.focus();
  }, 80);
  log('SEC // SECURITY QUESTION PRESENTED');
}

/* 判定：Vein（不分大小写） / 萧未影（严格三字） */
function checkAnswer(){
  const inp = $('#ansInput');
  if(!inp) return;
  const raw = inp.value.trim();
  if(raw.toLowerCase() === SEC_LATIN || raw === SEC_CN) passAuth();
  else failAuth();
}

function passAuth(){
  clearAuthTimers();
  const m = $('#okModal');
  if(m) m.classList.add('on');
  log('AUTH // SECURITY QUESTION PASSED');
  setTimeout(function(){
    const b = $('#okBtn');
    if(b) b.focus();
  }, 120);
}

/* 通过后进入终端 */
function enterTerminal(){
  clearAuthTimers();
  closeAuthModals();
  log('AUTH // ACCESS GRANTED');
  doLogin();
}

/* 失败：打字 → 停 2s → 红字打字 → 停 2s → 回启动页 */
function failAuth(){
  clearAuthTimers();
  const modal = $('#noModal');
  const l1 = $('#noLine1');
  const l2 = $('#noLine2');
  if(!modal || !l1 || !l2) return;

  l1.textContent = '';
  l2.textContent = '';
  l1.classList.add('typing');
  modal.classList.add('on');
  log('SEC // SECURITY QUESTION FAILED');

  typeLine(l1, '答错了，这里可不欢迎不认识的小老鼠呢ᯇᴗᯇ', 70, function(){
    l1.classList.remove('typing');
    authTimers.push(setTimeout(function(){
      l2.classList.add('typing');
      typeLine(l2, '下次可要查仔细点再来看我的档案。', 95, function(){
        l2.classList.remove('typing');
        authTimers.push(setTimeout(function(){
          closeAuthModals();
          resetStages();
          go(0);
          log('SYS // CONNECTION TERMINATED');
        }, 2000));
      });
    }, 2000));
  });
}

function typeLine(el, text, speed, done){
  let i = 0;
  el.textContent = '';
  const iv = setInterval(function(){
    i++;
    el.textContent = text.slice(0, i);
    if(i >= text.length){
      clearInterval(iv);
      if(done) done();
    }
  }, speed);
  authTimers.push(iv);
}

/* 回车提交 + 成功弹窗按钮（弹窗标记在脚本之后，用事件委托） */
const ansInput = $('#ansInput');
if(ansInput){
  ansInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); checkAnswer(); }
  });
}

document.body.addEventListener('click', function(e){
  if(e.target && e.target.id === 'okBtn') enterTerminal();
});

/* ============================================================
   入组织前经历 · 申请提权（分支对话）
   ============================================================ */
var preTimers = [];

const PRE_TREE = {
  root: {
    text: '请确认是否执行提权：',
    opts: [
      { label: '是', to: 'q1' },
      { label: '否', to: 'CLOSE' }
    ]
  },
  q1: {
    text: '看够了吗，这么好奇我的经历吗ᯇᴗᯇ',
    opts: [
      { label: '抱歉，我没有恶意', to: 'soft' },
      { label: '有些好奇', to: 'curious' }
    ]
  },
  soft: {
    beats: [
      { text: '是吗？那最好了呢。', pause: 2000 },
      { text: '毕竟不该看的，还是不看为好，', cls: 'warn blink', pause: 2000 },
      { text: '对吧ᯇᴗᯇ', newp: false, cls: 'warn blink', pause: 2000 }
    ],
    end: 'CLOSE'
  },
  curious: {
    text: '受宠若惊啊，真的想知道吗？',
    opts: [
      { label: '算了', to: 'soft' },
      { label: '真的', to: 'sure' }
    ]
  },
  giveup: {
    beats: [
      { text: '是吗？那最好了呢。', pause: 2000 },
      { text: '希望这是你最后一次越界，', cls: 'warn blink', pause: 1000 },
      { text: '亲爱的。', newp: false, cls: 'warn blink', pause: 2000 }
    ],
    end: 'CLOSE'
  },
  sure: {
    text: '真是执着呢，真的确定？',
    opts: [
      { label: '算了', to: 'giveup' },
      { label: '确定', to: 'final' }
    ]
  },
  final: {
    cls: 'danger',
    beats: [
      { text: '你知道吗，B.C.A有一个全局共识，不该问的不问。', cls: 'warn', pause: 2000 },
      { text: '看来你不会是 B.C.A 的人。抓到你了，小老鼠。', cls: 'warn', pause: 2000 },
      { text: '已经给过你很多次机会了，这次，该有惩罚了。', cls: 'warn blink', pause: 2000 }
    ],
    end: 'KICK'
  }
};

function clearPreTimers(){
  for(var i = 0; i < preTimers.length; i++){
    clearTimeout(preTimers[i]);
    clearInterval(preTimers[i]);
  }
  preTimers = [];
}

function closePreModal(){
  clearPreTimers();
  const m = $('#preModal');
  if(m) m.classList.remove('on', 'flash', 'purge');
  const f = $('#preFlash');
  if(f) f.classList.remove('on');
  const box = $('.pre-box');
  if(box) box.classList.remove('danger', 'pre-switch');
  const body = $('#preBody');
  if(body) body.innerHTML = '';
  const opts = $('#preOpts');
  if(opts) opts.innerHTML = '';
}

/* 打开对话：入口按钮 */
function openPreEsc(){
  const m = $('#preModal');
  if(!m) return;
  closePreModal();
  m.classList.add('on');
  log('SEC // PRE-RECORD ESCALATION REQUEST');
  runPreNode('root');
}

function runPreNode(id){
  const node = PRE_TREE[id];
  const body = $('#preBody');
  const opts = $('#preOpts');
  const box  = $('.pre-box');
  if(!node || !body || !opts) return;

  opts.innerHTML = '';
  body.innerHTML = '';
  if(box){
    box.classList.remove('pre-switch');
    void box.offsetWidth;            /* 强制重排，让切换动画重播 */
    box.classList.add('pre-switch');
    box.classList.toggle('danger', node.cls === 'danger');
  }

  const beats = node.beats || [{ text: node.text || '', pause: 0 }];
  playBeats(beats, 0, function(){
    if(node.opts){ showPreOpts(node.opts); return; }
    if(node.end === 'KICK'){ preFlashThenKick(); return; }
    closePreModal();
  });
}

/* 逐句打字；newp:false 表示接着上一段继续打 */
function playBeats(beats, i, done){
  const body = $('#preBody');
  if(!body) return;
  if(i >= beats.length){ done(); return; }

  const b = beats[i];
  let p = body.lastElementChild;
  if(!p || b.newp !== false){
    p = document.createElement('p');
    p.className = 'pre-line' + (b.cls ? ' ' + b.cls : '');
    body.appendChild(p);
  }else if(b.cls){
    p.className = 'pre-line ' + b.cls;
  }

  p.classList.add('typing');
  typePre(p, b.text || '', b.speed || 70, function(){
    p.classList.remove('typing');
    if(!b.pause){ playBeats(beats, i + 1, done); return; }
    preTimers.push(setTimeout(function(){ playBeats(beats, i + 1, done); }, b.pause));
  });
}

function typePre(el, text, speed, done){
  const base = el.textContent;
  let i = 0;
  const iv = setInterval(function(){
    i++;
    el.textContent = base + text.slice(0, i);
    if(i >= text.length){ clearInterval(iv); if(done) done(); }
  }, speed);
  preTimers.push(iv);
}

function showPreOpts(opts){
  const box = $('#preOpts');
  if(!box) return;
  box.innerHTML = '';
  opts.forEach(function(o){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pre-opt';
    btn.textContent = o.label;
    btn.addEventListener('click', function(){
      if(o.to === 'CLOSE'){ closePreModal(); return; }
      log('SEC // PRE-RECORD DIALOG · ' + o.label);
      runPreNode(o.to);
    });
    box.appendChild(btn);
  });
}

/* 终局：满屏红光闪烁 2 秒，期间把对话换成驱逐警告，然后踢回启动页 */
function preFlashThenKick(){
  const m = $('#preModal');
  const f = $('#preFlash');
  if(!m || !f){ preKick(); return; }
  m.classList.add('flash', 'purge');
  f.classList.add('on');
  log('SEC // PRE-RECORD BREACH · CONTAINMENT');
  preTimers.push(setTimeout(function(){
    f.classList.remove('on');
    m.classList.remove('flash', 'purge');
    preKick();
  }, 2000));
}

/* 最后一次「确定」：踢回启动页 */
function preKick(){
  closePreModal();
  stopSessionTimer();
  const app = $('#app');
  if(app) app.classList.remove('active');
  resetStages();
  resetWorkspace();
  go(0);
  log('SEC // PRE-RECORD BREACH · SESSION PURGED');
}

/* ============================================================
   JAE LEE · 已知悉提示 → 命令窗口科普
   ============================================================ */
var tipTimer = null;

function resetKnownModal(){
  if(tipTimer){ clearTimeout(tipTimer); tipTimer = null; }
  const t = $('#knownTipText');
  if(t) t.textContent = '似乎知道了检索栏同时也是特殊的【命令窗口】';
  const q = $('#knownTipQ');
  if(q) q.style.display = '';
  const o = $('#knownTipOpts');
  if(o) o.style.display = '';
}

function openKnownModal(){
  const m = $('#knownModal');
  if(!m) return;
  resetKnownModal();
  m.classList.add('on');
  log('IDX // ACKNOWLEDGED · COMMAND WINDOW');
}

function closeKnownModal(){
  const m = $('#knownModal');
  if(m) m.classList.remove('on');
  resetKnownModal();
}

function cmdHelpYes(){
  closeKnownModal();
  openDoc('cmdhelp');
}

function cmdHelpNo(){
  const t = $('#knownTipText');
  const q = $('#knownTipQ');
  const o = $('#knownTipOpts');
  if(t) t.textContent = '祝您探索愉快。';
  if(q) q.style.display = 'none';
  if(o) o.style.display = 'none';
  tipTimer = setTimeout(function(){ closeKnownModal(); }, 1600);
}

/* ============================================================
   命令窗口模拟（ping）
   ============================================================ */
var pingTimers = [];
var pingQueue = [];
var pingIdx = 0;
var pingPhase = 'ping';

var PING_SCRIPT = [
  { d: 360, t: '' },
  { d: 320, t: '正在 Ping www.bca.com [10.7.214.9] 具有 32 字节的数据:' },
  { d: 700, t: '来自 10.7.214.9 的回复: 字节=32 时间=12ms TTL=57', c: 'ok' },
  { d: 620, t: '来自 10.7.214.9 的回复: 字节=32 时间=11ms TTL=57', c: 'ok' },
  { d: 640, t: '来自 10.7.214.9 的回复: 字节=32 时间=13ms TTL=57', c: 'ok' },
  { d: 900, t: '来自 10.7.214.9 的回复: 请求超时。', c: 'err' },
  { d: 700, t: '请求超时。', c: 'err' },
  { d: 800, t: 'PING: 传输失败。常见故障。', c: 'err' },
  { d: 520, t: '[ 防火墙已拦截此连接 · 规则 WIN-FW-BCA-07 ]', c: 'err' },
  { d: 700, t: '' }
];

var RM_SCRIPT = [
  { d: 260, t: 'C:\\root\\group\\admin> del /f /s /q *.*', type: true },
  { d: 180, t: '正在删除 C:\\root\\group\\admin\\agents.db', c: 'err' },
  { d: 140, t: '正在删除 C:\\root\\group\\admin\\logs\\audit-2019.log', c: 'err' },
  { d: 130, t: '正在删除 C:\\root\\group\\admin\\cases\\C-01 … C-06', c: 'err' },
  { d: 130, t: '正在删除 C:\\root\\group\\admin\\personnel\\*.dat', c: 'err' },
  { d: 200, t: 'C:\\root\\group\\admin> rm -rf /', type: true, c: 'err' },
  { d: 120, t: 'rm: 正在删除 /bin', c: 'err' },
  { d: 100, t: 'rm: 正在删除 /etc', c: 'err' },
  { d: 90,  t: 'rm: 正在删除 /root/group', c: 'err' },
  { d: 90,  t: 'rm: 正在删除 /var/log', c: 'err' },
  { d: 120, t: 'rm: 正在删除 /B.C.A', c: 'err' },
  { d: 420, t: 'Segmentation fault (core dumped)', c: 'dim2' },
  { d: 300, t: '' }
];

function clearPingTimers(){
  for(var i = 0; i < pingTimers.length; i++){
    clearTimeout(pingTimers[i]);
    clearInterval(pingTimers[i]);
  }
  pingTimers = [];
}

function stopPing(){
  clearPingTimers();
  pingIdx = 0;
  vnTyping = false;
}

/* 往黑窗里追加一行 */
function cmdAppend(text, cls){
  const body = $('#cmdBody');
  if(!body) return null;
  const el = document.createElement('div');
  el.className = 'cmd-line' + (cls ? ' ' + cls : '');
  el.textContent = text;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
  return el;
}

/* ---------- 进入命令窗口舞台 ---------- */
function enterPing(){
  hideAllStages();
  const app = $('#app');
  if(app) app.classList.remove('active');
  const s = $('#sPing');
  if(s) s.classList.add('active');
  if(resBox) resBox.classList.remove('on');
  startPing();
}

function startPing(){
  clearPingTimers();
  clearRatTimers();
  closeRatModal();
  closeConsent();
  hideVn();

  const body = $('#cmdBody');
  if(body){
    body.innerHTML = '';
    const ghost = document.createElement('div');
    ghost.className = 'cmd-line ghost';
    ghost.textContent = 'ping www.bca.com';
    body.appendChild(ghost);
  }

  const row = $('#cmdInputRow');
  if(row) row.classList.add('hide');
  const inp = $('#cmdInput');
  if(inp){ inp.value = ''; inp.disabled = false; }

  log('CMD // SHELL OPENED');
  openVn();
}

/* ---------- 文游对话框 ---------- */
var VN_LINES = [
  '原来 B.C.A 的终端居然真的有这种功能……是不是输入命令的关键字后都会直接唤起命令窗口呢？',
  '那正好，已经打开了的话，顺便来试试网络连通性吧，就测试 B.C.A 的网站好了。',
  '跟着打出这行命令——ping www.bca.com，按下 Enter 即可。'
];
var vnIndex = 0;
var vnTyping = false;
var vnInt = null;

function openVn(){
  const box = $('#vnBox');
  if(!box) return;
  box.classList.add('on');
  vnIndex = 0;
  showVnLine(0);
}

function showVnLine(i){
  const t = $('#vnText');
  if(!t) return;
  if(i >= VN_LINES.length){ closeVn(); return; }
  vnIndex = i;
  typeVn(t, VN_LINES[i], 52);
}

function typeVn(el, text, speed){
  let i = 0;
  el.textContent = '';
  vnTyping = true;
  const iv = setInterval(function(){
    i++;
    el.textContent = text.slice(0, i);
    if(i >= text.length){ clearInterval(iv); vnTyping = false; }
  }, speed);
  vnInt = iv;
  pingTimers.push(iv);
}

function vnAdvance(){
  const box = $('#vnBox');
  if(!box || !box.classList.contains('on')) return;
  if(vnTyping){
    if(vnInt) clearInterval(vnInt);
    vnTyping = false;
    const t = $('#vnText');
    if(t) t.textContent = VN_LINES[vnIndex] || '';
    return;
  }
  showVnLine(vnIndex + 1);
}

function hideVn(){
  if(vnInt){ clearInterval(vnInt); vnInt = null; }
  vnTyping = false;
  const box = $('#vnBox');
  if(box) box.classList.remove('on');
  const t = $('#vnText');
  if(t) t.textContent = '';
}

function closeVn(){
  hideVn();
  const row = $('#cmdInputRow');
  if(row) row.classList.remove('hide');
  const inp = $('#cmdInput');
  if(inp){
    inp.value = '';
    setTimeout(function(){ inp.focus(); }, 90);
  }
  log('CMD // INPUT READY');
}

/* ---------- 命令提交 ---------- */
function submitCommand(value){
  const raw = (value || '').trim();
  if(!raw) return;

  const inp = $('#cmdInput');
  if(inp) inp.value = '';
  cmdAppend('C:\\root\\group\\admin> ' + raw);

  const norm = raw.toLowerCase().replace(/\s+/g, ' ');

  if(norm === 'ping www.bca.com'){
    if(inp) inp.disabled = true;
    const row = $('#cmdInputRow');
    if(row) row.classList.add('hide');
    log('CMD // PING WWW.BCA.COM');
    pingTimers.push(setTimeout(function(){
      pingPhase = 'ping';
      pingQueue = PING_SCRIPT;
      pingIdx = 0;
      runPingStep();
    }, 420));
    return;
  }

  if(norm.indexOf('ping') === 0){
    cmdAppend('用法: ping 目标名称', 'dim2');
    cmdAppend('提示: 请输入屏幕上那条命令。', 'dim2');
  }else{
    cmdAppend("'" + raw + "' 不是内部或外部命令，也不是可运行的程序或批处理文件。", 'err');
  }
  if(inp) inp.focus();
}

function runPingStep(){
  if(pingIdx >= pingQueue.length){ onCmdDone(); return; }
  const s = pingQueue[pingIdx++];
  const line = cmdAppend(s.t, s.c);

  const next = function(){
    pingTimers.push(setTimeout(runPingStep, s.d));
  };
  if(s.type && line) typeCmd(line, s.t, 32, pingTimers, next);
  else next();
}

function onCmdDone(){
  if(pingPhase === 'rm'){ showBSOD(); return; }
  openRatModal();
}

/* 逐字写入（pool 决定归哪个计时器池管理） */
function typeCmd(el, text, speed, pool, done){
  let i = 0;
  el.textContent = '';
  const iv = setInterval(function(){
    i++;
    el.textContent = text.slice(0, i);
    const host = el.parentElement;
    if(host && host.classList && host.classList.contains('cmdbody')) host.scrollTop = host.scrollHeight;
    if(i >= text.length){ clearInterval(iv); if(done) done(); }
  }, speed);
  pool.push(iv);
}

/* ============================================================
   ping 警告弹窗 → rm → 404
   ============================================================ */
var ratTimers = [];
var RAT_LINES = [
  { t: '大人说的话就是不听', p: 950 },
  { t: '已经警告过你很多次了', p: 950 },
  { t: '还是不乖', p: 950 },
  { t: '果然惩罚——还是不够啊ᯇᴗᯇ', p: 1400, blink: true }
];

function clearRatTimers(){
  for(var i = 0; i < ratTimers.length; i++){
    clearTimeout(ratTimers[i]);
    clearInterval(ratTimers[i]);
  }
  ratTimers = [];
}

function closeRatModal(){
  clearRatTimers();
  const m = $('#ratModal');
  if(m) m.classList.remove('on');
  const b = $('#ratBody');
  if(b) b.innerHTML = '';
}

function openRatModal(){
  const m = $('#ratModal');
  const b = $('#ratBody');
  if(!m || !b) return;
  clearRatTimers();
  b.innerHTML = '';
  m.classList.add('on');
  log('SEC // PING BLOCKED · WARNING');
  playRatLine(0);
}

function playRatLine(i){
  const b = $('#ratBody');
  if(!b || i >= RAT_LINES.length) return;
  const s = RAT_LINES[i];
  const p = document.createElement('p');
  p.className = 'rat-line' + (s.blink ? ' blink' : '');
  b.appendChild(p);
  p.classList.add('typ');
  typeCmd(p, s.t, 62, ratTimers, function(){
    p.classList.remove('typ');
    ratTimers.push(setTimeout(function(){
      if(i + 1 >= RAT_LINES.length){ finishRat(); return; }
      playRatLine(i + 1);
    }, s.p));
  });
}

function finishRat(){
  ratTimers.push(setTimeout(function(){
    const m = $('#ratModal');
    if(m) m.classList.remove('on');
    clearRatTimers();
    const b = $('#ratBody');
    if(b) b.innerHTML = '';
    openConsent();
  }, 1200));
}

function startRm(){
  const body = $('#cmdBody');
  if(!body) return;
  pingPhase = 'rm';
  pingQueue = RM_SCRIPT;
  pingIdx = 0;
  log('CMD // DEL /F /S /Q');
  pingTimers.push(setTimeout(runPingStep, 300));
}

function show404(){
  clearPingTimers();
  clearRatTimers();
  stopSessionTimer();
  hideAllStages();
  const app = $('#app');
  if(app) app.classList.remove('active');
  const s = $('#s404');
  if(s) s.classList.add('active');
  log('SYS // 404 · RESOURCE DESTROYED');
}

/* 蓝屏（ping 流的终点） */
var bsodTimer = null;

function showBSOD(){
  clearPingTimers();
  clearRatTimers();
  stopSessionTimer();
  hideAllStages();
  const app = $('#app');
  if(app) app.classList.remove('active');
  const s = $('#sBSOD');
  if(s) s.classList.add('active');

  const el = $('#bsodPct');
  if(el) el.textContent = '0';
  if(bsodTimer){ clearInterval(bsodTimer); bsodTimer = null; }
  let p = 0;
  bsodTimer = setInterval(function(){
    p = Math.min(100, p + Math.floor(Math.random() * 9) + 3);
    if(el) el.textContent = String(p);
    if(p >= 100){ clearInterval(bsodTimer); bsodTimer = null; }
  }, 260);
  log('SYS // KERNEL PANIC · BSOD');
}

/* ============================================================
   help 命令 · 检索索引舞台
   ============================================================ */
function buildHelpList(){
  const list = $('#helpList');
  const cnt = $('#helpCount');
  if(cnt) cnt.textContent = DOCS.length;
  if(!list) return;
  list.innerHTML = DOCS.map(function(d){
    return '<div class="help-item" data-id="' + d.id + '" role="button" tabindex="0">' +
      '<span class="lv">L' + d.level + '</span>' +
      '<div class="ht"><b>' + d.title + '</b>' +
      '<small>' + d.type + ' · ' + d.desc + '</small></div></div>';
  }).join('');
}

function enterHelp(){
  buildHelpList();
  hideAllStages();
  const app = $('#app');
  if(app) app.classList.remove('active');
  const s = $('#sHelp');
  if(s) s.classList.add('active');
  if(resBox) resBox.classList.remove('on');
  log('CMD // HELP · ' + DOCS.length + ' ENTRIES');
}

function exitHelp(){
  hideAllStages();
  if(qInput) qInput.value = '';
  if(resBox) resBox.classList.remove('on');
  const app = $('#app');
  if(app) app.classList.add('active');
  log('NAV // BACK TO TERMINAL');
}

/* ============================================================
   ping → 远程连接请求弹窗
   ============================================================ */
var consentPress = 0;

function openConsent(){
  const m = $('#consentModal');
  if(!m) return;
  consentPress = 0;
  const agree = $('#consentAgree');
  if(agree) agree.style.flex = '';
  m.classList.add('on');
  log('SEC // REMOTE CONNECTION REQUEST');
}

function closeConsent(){
  const m = $('#consentModal');
  if(m) m.classList.remove('on');
}

function consentDeny(){
  const btn = $('#consentDeny');
  const agree = $('#consentAgree');

  // 触感反馈
  if(btn){
    btn.classList.remove('tap');
    void btn.offsetWidth;
    btn.classList.add('tap');
    setTimeout(function(){ btn.classList.remove('tap'); }, 200);
  }

  // 每按一次，同意按钮宽 4px，十次封顶
  if(consentPress < 10 && agree){
    consentPress++;
    agree.style.flex = '0 0 calc(50% - 5px + ' + (consentPress * 4) + 'px)';
  }
  log('SEC // REMOTE CONNECTION DECLINED · ' + consentPress);
}

function consentAccept(){
  closeConsent();
  startRm();
}

/* ---------- 绑定：命令输入 / 索引列表 / 远程连接弹窗 ---------- */
const cmdInputEl = $('#cmdInput');
if(cmdInputEl){
  cmdInputEl.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); submitCommand(cmdInputEl.value); }
  });
}

const pingStageEl = $('#sPing');
if(pingStageEl){
  pingStageEl.addEventListener('click', function(e){
    if(e.target.closest('#cmdInputRow')) return;
    vnAdvance();
  });
}

const helpListEl = $('#helpList');
if(helpListEl){
  helpListEl.addEventListener('click', function(e){
    const it = e.target.closest('.help-item');
    if(!it) return;
    const id = it.getAttribute('data-id');
    exitHelp();
    openDoc(id);
  });
}

/* 弹窗标记在脚本之后，用事件委托 */
document.body.addEventListener('click', function(e){
  const t = e.target;
  if(!t) return;
  if(t.id === 'consentAgree') consentAccept();
  else if(t.id === 'consentDeny') consentDeny();
});
