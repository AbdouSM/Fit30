'use strict';
/* =========================================================
   لياقتي 30 – تحدي 30 يوماً لحرق دهون البطن
   Vanilla JS • localStorage • PWA
   ========================================================= */

/* ===================== أدوات عامة ===================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => dateKey(new Date());
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const round1 = n => Math.round(n * 10) / 10;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = sec => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const fmtDate = k => { const d = parseKey(k); return `${d.getDate()} ${AR_MONTHS[d.getMonth()]}`; };
const fmtDateLong = k => { const d = parseKey(k); return `${AR_DAYS[d.getDay()]} ${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
function vibrate(p) { if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* غير مدعوم */ } } }

/* ===================== التخزين المحلي ===================== */
const STORE_KEY = 'fit30_data_v1';
const DEFAULT_STATE = () => ({
  version: 1,
  createdAt: todayKey(),
  profile: { sex: 'male', age: '', height: '', weight: '', activity: 1.375 },
  settings: { sound: true, voice: true, vibrate: true, wakeLock: true, waterGoal: 8 },
  plan: { completed: {} },
  activity: {},
  meals: {},
  water: {},
  measurements: [],
  customMeals: []
});

function mergeState(d) {
  const base = DEFAULT_STATE();
  if (!d || typeof d !== 'object') return base;
  return {
    ...base,
    ...d,
    profile: { ...base.profile, ...(d.profile || {}) },
    settings: { ...base.settings, ...(d.settings || {}) },
    plan: { completed: { ...((d.plan && d.plan.completed) || {}) } },
    activity: (d.activity && typeof d.activity === 'object') ? d.activity : {},
    meals: (d.meals && typeof d.meals === 'object') ? d.meals : {},
    water: (d.water && typeof d.water === 'object') ? d.water : {},
    measurements: Array.isArray(d.measurements) ? d.measurements : [],
    customMeals: Array.isArray(d.customMeals) ? d.customMeals : []
  };
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? mergeState(JSON.parse(raw)) : DEFAULT_STATE();
  } catch (e) { return DEFAULT_STATE(); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { toast('تعذّر الحفظ: مساحة التخزين ممتلئة'); }
}
let S = load();

/* ===================== الأيقونات ===================== */
const ICONS = {
  play: '<path d="M7 4.5v15l13-7.5z" class="fill"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" class="fill"/><rect x="14" y="4.5" width="4" height="15" rx="1" class="fill"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  chevR: '<path d="M9 6l6 6-6 6"/>',
  chevL: '<path d="M15 6l-6 6 6 6"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  dumbbell: '<path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="1.5"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 10a5 5 0 0 1 8 0l-3 2"/>',
  tape: '<path d="M3 15 15 3l6 6L9 21z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M4 4h16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  food: '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 13v8"/><path d="M17 21V3c-2 1.5-3 4-3 7s1 4 3 4"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" class="fill"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M11 18.5h2"/>',
  refresh: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  heart: '<path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z"/>'
};
const icon = (name, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}">${ICONS[name] || ''}</svg>`;

/* ===================== الرسوم المتحركة للتمارين (SVG) ===================== */
/* كل تمرين = مجموعة وضعيات (مفاصل) يتم التحريك بينها تلقائياً */
const ST_SIDE = { h: [100, 38], n: [100, 55], p: [100, 110], eL: [98, 83], hL: [97, 109], eR: [103, 83], hR: [105, 109], kL: [99, 146], fL: [98, 182], kR: [101, 146], fR: [102, 182] };
const ST_FRONT = { h: [100, 38], n: [100, 55], p: [100, 110], eL: [88, 80], hL: [84, 106], eR: [112, 80], hR: [116, 106], kL: [94, 146], fL: [92, 182], kR: [106, 146], fR: [108, 182] };

function expand(o) {
  const r = {};
  for (const [k, v] of Object.entries(o || {})) {
    if (k === 'e') { r.eL = v; r.eR = v; }
    else if (k === 'hd') { r.hL = v; r.hR = v; }
    else if (k === 'k') { r.kL = v; r.kR = v; }
    else if (k === 'f') { r.fL = v; r.fR = v; }
    else r[k] = v;
  }
  return r;
}
const pose = (base, o) => Object.assign({}, base, expand(o));
function mirror(p) {
  const sw = { eL: 'eR', eR: 'eL', hL: 'hR', hR: 'hL', kL: 'kR', kR: 'kL', fL: 'fR', fR: 'fL' };
  const m = {};
  for (const [k, v] of Object.entries(p)) m[sw[k] || k] = [200 - v[0], v[1]];
  return m;
}
function completePose(p) {
  const q = { ...p };
  if (!q.m) q.m = [(q.n[0] + q.p[0]) / 2, (q.n[1] + q.p[1]) / 2];
  return q;
}

/* أذرع الجري (منظر جانبي) */
const RUN_A = { eL: [112, 78], hL: [124, 62], eR: [90, 80], hR: [84, 104] };
const RUN_B = { eR: [112, 78], hR: [124, 62], eL: [90, 80], hL: [84, 104] };
const UP_ARMS = { eL: [76, 38], hL: [66, 14], eR: [124, 38], hR: [134, 14] };

/* وضعيات أساسية مشتركة */
const MC_BASE = pose(ST_SIDE, { h: [166, 128], n: [150, 136], p: [100, 148], e: [151, 159], hd: [152, 182], k: [66, 162], f: [32, 176] });
const PLANK_BASE = pose(ST_SIDE, { h: [166, 140], n: [150, 148], p: [100, 154], e: [150, 180], hd: [174, 182], k: [66, 165], f: [32, 177] });
const LYING = pose(ST_SIDE, { h: [36, 172], n: [52, 176], p: [100, 176], e: [76, 180], hd: [96, 182], k: [134, 176], f: [168, 176] });
const CRUNCH_A = pose(ST_SIDE, { h: [36, 170], n: [52, 174], p: [100, 174], k: [126, 144], f: [148, 182], e: [50, 156], hd: [38, 162] });
const BICYCLE = pose(ST_SIDE, { h: [50, 142], n: [62, 152], m: [84, 166], p: [100, 172], eL: [74, 138], hL: [56, 140], eR: [70, 144], hR: [56, 142] });
const FLUTTER = pose(ST_SIDE, { h: [38, 166], n: [54, 172], p: [100, 176], e: [76, 178], hd: [96, 182] });
const RTWIST = pose(ST_SIDE, { h: [72, 108], n: [78, 124], p: [100, 172], k: [130, 148], f: [156, 162] });
const DEADBUG = pose(ST_SIDE, { h: [36, 172], n: [52, 176], p: [100, 176], e: [54, 150], hd: [56, 124], k: [100, 140], f: [134, 140] });
const ALL4 = pose(ST_SIDE, { h: [156, 132], n: [140, 140], p: [96, 146], e: [140, 161], hd: [140, 182], k: [96, 182], f: [60, 182] });
const BRIDGE = pose(ST_SIDE, { h: [34, 172], n: [50, 176], p: [100, 176], k: [130, 146], f: [150, 182], e: [72, 180], hd: [94, 182] });
const PRONE = pose(ST_SIDE, { h: [166, 172], n: [150, 176], p: [100, 178], k: [65, 178], f: [30, 178], e: [172, 178], hd: [194, 178] });
const BOX = pose(ST_SIDE, { h: [104, 38], n: [102, 55], kL: [92, 146], fL: [82, 182], kR: [110, 146], fR: [118, 182] });
const SQUAT_DOWN = pose(ST_SIDE, { h: [128, 84], n: [119, 98], p: [84, 140], k: [118, 150], f: [102, 182], e: [143, 100], hd: [168, 100] });
const BURPEE_SQ = pose(ST_SIDE, { h: [132, 104], n: [118, 112], p: [88, 142], k: [116, 150], f: [102, 182], e: [124, 146], hd: [126, 180] });
const BURPEE_PL = pose(ST_SIDE, { h: [142, 128], n: [126, 136], p: [78, 150], e: [126, 159], hd: [126, 182], k: [44, 164], f: [10, 178] });
const COBRA_A = pose(ST_SIDE, { h: [156, 170], n: [140, 174], p: [100, 178], k: [65, 180], f: [30, 180], e: [128, 180], hd: [150, 182] });
const CHILD = pose(ST_SIDE, { h: [142, 174], n: [128, 170], p: [82, 166], e: [154, 178], hd: [182, 182], k: [114, 180], f: [78, 182] });
const QUAD = pose(ST_SIDE, { kR: [100, 146], fR: [84, 116], eR: [92, 84], hR: [86, 114], eL: [118, 70], hL: [142, 64] });
const SEATED = pose(ST_FRONT, { h: [100, 101], n: [100, 118], p: [100, 170], kL: [70, 174], fL: [112, 182], kR: [130, 174], fR: [88, 182], eL: [82, 146], hL: [74, 170], eR: [118, 146], hR: [126, 170] });
const TWIST_A = pose(ST_FRONT, { h: [96, 38], eL: [80, 64], hL: [66, 74], eR: [104, 70], hR: [84, 76] });

const armCircleFrames = [0, 1, 2, 3].map(i => {
  const a = i * Math.PI / 2, dx = Math.cos(a) * 7, dy = Math.sin(a) * 7;
  return pose(ST_FRONT, { eL: [75 + dx / 2, 55 + dy / 2], hL: [50 + dx, 55 + dy], eR: [125 - dx / 2, 55 + dy / 2], hR: [150 - dx, 55 + dy] });
});
const hipCircleFrames = [[8, 0], [0, 6], [-8, 0], [0, -6]].map(([dx, dy]) => {
  const px = 100 + dx, py = 110 + dy;
  return pose(ST_FRONT, {
    p: [px, py], eL: [px - 20, 86], hL: [px - 9, py - 3], eR: [px + 20, 86], hR: [px + 9, py - 3],
    kL: [(px - 6 + 92) / 2, 146 + dy / 2], kR: [(px + 6 + 108) / 2, 146 + dy / 2]
  });
});

/* ===================== مكتبة التمارين ===================== */
const CATS = { warmup: 'الإحماء', cardio: 'كارديو وحرق دهون', core: 'البطن والجذع', strength: 'قوة بوزن الجسم', stretch: 'إطالة وتهدئة' };

const EX = {
  march: {
    ar: 'المشي في المكان', en: 'Marching in Place', cat: 'warmup',
    muscles: 'الفخذ الأمامي (Quadriceps) • عضلات الورك القابضة (Hip Flexors)',
    steps: ['قف مستقيماً وشدّ عضلات البطن قليلاً.', 'ارفع ركبتك اليمنى ثم اليسرى بالتناوب كأنك تمشي.', 'حرّك ذراعيك عكس الساقين وتنفّس بانتظام.'],
    tips: ['انزل على مقدمة القدم بهدوء لتخفيف الضغط على الركبتين.'],
    frames: [pose(ST_SIDE, { kR: [124, 134], fR: [120, 170], ...RUN_A }), pose(ST_SIDE, { kL: [124, 134], fL: [120, 170], ...RUN_B })], dur: 1.2
  },
  arm_circles: {
    ar: 'دوائر الذراعين', en: 'Arm Circles', cat: 'warmup',
    muscles: 'عضلات الكتف (Deltoids) • أعلى الظهر (Trapezius)',
    steps: ['افرد ذراعيك جانباً على مستوى الكتفين.', 'ارسم دوائر صغيرة للأمام لمدة 30 ثانية.', 'اعكس الاتجاه للخلف مع تكبير الدوائر تدريجياً.'],
    tips: ['أبقِ الكتفين بعيدين عن الأذنين ولا تقوّس أسفل الظهر.'],
    frames: armCircleFrames, dur: 1.2
  },
  torso_twist: {
    ar: 'لفّ الجذع وقوفاً', en: 'Standing Torso Twist', cat: 'warmup',
    muscles: 'العضلات المائلة (Obliques) • أسفل الظهر (Erector Spinae)',
    steps: ['قف والقدمان بعرض الكتفين والمرفقان مرفوعان أمام الصدر.', 'لُفّ الجذع يميناً ثم يساراً بحركة متحكَّم بها.', 'أبقِ الحوض ثابتاً تقريباً ودع الجزء العلوي يدور.'],
    tips: ['لا تلفّ بعنف أو سرعة؛ الهدف تسخين العمود الفقري.'],
    frames: [TWIST_A, mirror(TWIST_A)], dur: 2.2
  },
  hip_circles: {
    ar: 'دوائر الحوض', en: 'Hip Circles', cat: 'warmup',
    muscles: 'عضلات الورك الدوّارة (Hip Rotators) • أسفل الظهر',
    steps: ['ضع يديك على خصرك والقدمان أعرض قليلاً من الكتفين.', 'حرّك الحوض في دوائر واسعة باتجاه عقارب الساعة.', 'بعد 30 ثانية اعكس الاتجاه.'],
    tips: ['اثنِ الركبتين قليلاً وحافظ على ثبات الرأس.'],
    frames: hipCircleFrames, dur: 2.4
  },
  step_jacks: {
    ar: 'القفز المفتوح بالخطوة (بدون قفز)', en: 'Step Jacks (Low-Impact Jumping Jacks)', yt: 'step jacks low impact jumping jacks', cat: 'cardio',
    muscles: 'الجسم كامل (Full Body) • الكتفان والساقان',
    steps: ['قف بقدمين متلاصقتين وذراعين بجانب الجسم.', 'اخطُ بقدمك اليمنى جانباً مع رفع الذراعين فوق الرأس.', 'ارجع للوسط ثم كرّر للجهة اليسرى بالتناوب وبسرعة.'],
    tips: ['بديل ممتاز للقفز إن كان لديك وزن زائد أو ألم في الركبة.'],
    frames: [ST_FRONT, pose(ST_FRONT, { ...UP_ARMS, kL: [84, 146], fL: [70, 182] }), ST_FRONT, pose(ST_FRONT, { ...UP_ARMS, kR: [116, 146], fR: [130, 182] })], dur: 2.4
  },
  jumping_jacks: {
    ar: 'القفز المفتوح', en: 'Jumping Jacks', cat: 'cardio',
    muscles: 'الجسم كامل (Full Body) • تمرين هوائي',
    steps: ['قف بقدمين متلاصقتين وذراعين بجانبك.', 'اقفز مع فتح القدمين ورفع الذراعين فوق الرأس.', 'اقفز للعودة إلى الوضع الأول وكرّر بإيقاع ثابت.'],
    tips: ['اهبط على مقدمة القدمين مع ثني بسيط للركبتين.', 'إن تعبت، استبدلها بالخطوة الجانبية دون قفز.'],
    frames: [ST_FRONT, pose(ST_FRONT, { ...UP_ARMS, kL: [86, 146], fL: [72, 182], kR: [114, 146], fR: [128, 182] })], dur: 1
  },
  high_knees: {
    ar: 'رفع الركبتين عالياً', en: 'High Knees', cat: 'cardio',
    muscles: 'عضلات الورك القابضة (Hip Flexors) • البطن • الفخذ',
    steps: ['قف مستقيماً وابدأ الجري في المكان.', 'ارفع كل ركبة إلى مستوى الحوض تقريباً.', 'حرّك ذراعيك بقوة وحافظ على استقامة الظهر.'],
    tips: ['للمبتدئين: نفّذها مشياً سريعاً دون قفز.'],
    frames: [pose(ST_SIDE, { kR: [136, 112], fR: [134, 148], ...RUN_A }), pose(ST_SIDE, { kL: [136, 112], fL: [134, 148], ...RUN_B })], dur: 0.7
  },
  butt_kicks: {
    ar: 'ركل الأرداف', en: 'Butt Kicks', cat: 'cardio',
    muscles: 'الفخذ الخلفي (Hamstrings) • السمّانة (Calves)',
    steps: ['اجرِ في المكان بخطوات خفيفة.', 'اثنِ الركبة ليقترب كعبك من مؤخرتك.', 'بدّل الساقين بسرعة مع تحريك الذراعين.'],
    tips: ['أبقِ الركبتين متجهتين للأسفل ولا تمِل للأمام.'],
    frames: [pose(ST_SIDE, { kR: [104, 146], fR: [80, 126], ...RUN_A }), pose(ST_SIDE, { kL: [104, 146], fL: [80, 126], ...RUN_B })], dur: 0.8
  },
  shadow_boxing: {
    ar: 'الملاكمة الوهمية', en: 'Shadow Boxing', cat: 'cardio',
    muscles: 'الكتفان (Deltoids) • الذراعان • البطن – تمرين هوائي',
    steps: ['قف بوضعية الملاكم: قدم للأمام والركبتان مرنتان.', 'وجّه لكمات مستقيمة متتالية بالتناوب.', 'أرجع يدك بسرعة لحماية الوجه وتحرّك بخفة.'],
    tips: ['لا تفرد المرفق بالكامل بقوة لحماية المفصل.'],
    frames: [pose(BOX, { eR: [128, 58], hR: [156, 56], eL: [112, 78], hL: [118, 58] }), pose(BOX, { eL: [128, 58], hL: [156, 56], eR: [112, 78], hR: [118, 58] })], dur: 0.8
  },
  mountain_climbers: {
    ar: 'متسلّق الجبل', en: 'Mountain Climbers', cat: 'cardio', floor: true,
    muscles: 'المستقيمة البطنية (Rectus Abdominis) • الكتفان • الورك',
    steps: ['ابدأ من وضع الضغط واليدان تحت الكتفين.', 'اسحب ركبة نحو الصدر ثم أعدها وبدّل بالأخرى.', 'حافظ على إيقاع ثابت والحوض منخفضاً.'],
    tips: ['للمبتدئين: نفّذها ببطء خطوة بخطوة.', 'لا ترفع الأرداف للأعلى.'],
    frames: [pose(MC_BASE, { kR: [130, 162], fR: [110, 178] }), pose(MC_BASE, { kL: [130, 162], fL: [110, 178] })], dur: 0.8
  },
  burpee: {
    ar: 'البيربي المعدّل (بالخطوة)', en: 'Step-Back Burpee (Modified)', yt: 'step back burpee modified beginner', cat: 'cardio',
    muscles: 'الجسم كامل (Full Body)',
    steps: ['انزل بالقرفصاء وضع يديك على الأرض.', 'أرجع قدميك للخلف واحدة تلو الأخرى إلى وضع اللوح.', 'أعد القدمين للأمام ثم قف وارفع ذراعيك.'],
    tips: ['لا قفز في النسخة المعدّلة؛ ركّز على الأداء الصحيح.'],
    frames: [pose(ST_SIDE, {}), BURPEE_SQ, BURPEE_PL, BURPEE_SQ, pose(ST_SIDE, { e: [104, 30], hd: [108, 6] })], dur: 4
  },
  squat: {
    ar: 'القرفصاء بوزن الجسم', en: 'Bodyweight Squat', cat: 'strength',
    muscles: 'الفخذ الأمامي (Quadriceps) • الأرداف (Gluteus Maximus)',
    steps: ['قف والقدمان بعرض الكتفين وأصابعهما للخارج قليلاً.', 'ادفع الوركين للخلف وانزل كأنك تجلس على كرسي مع مدّ الذراعين.', 'انزل حتى يوازي الفخذ الأرض ثم اصعد بالضغط على الكعبين.'],
    tips: ['لا تدع الركبتين تنهاران للداخل.', 'أبقِ صدرك مرفوعاً وظهرك مستقيماً.'],
    frames: [pose(ST_SIDE, { e: [104, 82], hd: [108, 106] }), SQUAT_DOWN], dur: 2.4
  },
  reverse_lunge: {
    ar: 'الطعن الخلفي', en: 'Reverse Lunge', cat: 'strength',
    muscles: 'الأرداف (Gluteus) • الفخذ الأمامي والخلفي',
    steps: ['قف مستقيماً ويداك على خصرك.', 'ارجع بقدم خطوة واسعة للخلف وانزل حتى تقترب الركبة الخلفية من الأرض.', 'ادفع بالقدم الأمامية للعودة وبدّل الجهة.'],
    tips: ['الركبة الأمامية فوق الكاحل تقريباً.', 'استند إلى حائط إن فقدت التوازن.'],
    frames: [pose(ST_SIDE, { e: [86, 84], hd: [96, 108] }), pose(ST_SIDE, { h: [79, 70], n: [78, 86], p: [76, 140], e: [66, 112], hd: [76, 136], kR: [106, 147], fR: [102, 182], kL: [66, 174], fL: [36, 180] })], dur: 2.6
  },
  knee_pushup: {
    ar: 'الضغط على الركبتين', en: 'Knee Push-up (Modified Push-up)', cat: 'strength', floor: true,
    muscles: 'الصدر (Pectoralis Major) • الكتف الأمامي • الذراع الخلفية (Triceps)',
    steps: ['ضع يديك أعرض قليلاً من الكتفين والركبتين على الأرض.', 'اجعل جسمك خطاً مستقيماً من الرأس حتى الركبتين.', 'انزل بصدرك نحو الأرض ثم ادفع للأعلى.'],
    tips: ['شدّ البطن والأرداف حتى لا يهبط الحوض.', 'المرفقان بزاوية 45° تقريباً عن الجسم.'],
    frames: [pose(ST_SIDE, { h: [164, 131], n: [148, 140], p: [98, 160], k: [70, 182], f: [46, 162], e: [149, 161], hd: [150, 182] }),
      pose(ST_SIDE, { h: [166, 158], n: [150, 166], p: [98, 171], k: [70, 182], f: [46, 162], e: [134, 172], hd: [150, 182] })], dur: 2.2
  },
  glute_bridge: {
    ar: 'جسر الأرداف', en: 'Glute Bridge', cat: 'strength', floor: true,
    muscles: 'الأرداف (Gluteus Maximus) • الفخذ الخلفي (Hamstrings)',
    steps: ['استلقِ مع ثني الركبتين والقدمان قريبتان من الأرداف.', 'ادفع بالكعبين وارفع الحوض حتى يستقيم الجسم من الكتفين للركبتين.', 'اعصر الأرداف في الأعلى ثم انزل ببطء.'],
    tips: ['لا ترفع الحوض أكثر من اللازم فتقوّس ظهرك.'],
    frames: [BRIDGE, pose(BRIDGE, { p: [100, 146], m: [75, 162] })], dur: 2.4
  },
  superman: {
    ar: 'تمرين سوبرمان', en: 'Superman (Prone Back Extension)', yt: 'superman exercise', cat: 'strength', floor: true,
    muscles: 'أسفل الظهر (Erector Spinae) • الأرداف',
    steps: ['استلقِ على بطنك والذراعان ممدودتان للأمام.', 'ارفع الذراعين والصدر والساقين قليلاً عن الأرض.', 'اثبت ثانية ثم انزل ببطء.'],
    tips: ['انظر للأرض لتبقى الرقبة مستقيمة.'],
    frames: [PRONE, pose(PRONE, { h: [164, 158], n: [148, 166], e: [170, 158], hd: [192, 150], k: [66, 172], f: [32, 164] })], dur: 2.6
  },
  plank: {
    ar: 'اللوح الأمامي (البلانك)', en: 'Forearm Plank', cat: 'core', floor: true,
    muscles: 'البطن العميقة (Transversus Abdominis) • المستقيمة البطنية',
    steps: ['ضع الساعدين على الأرض والمرفقان تحت الكتفين.', 'ارفع جسمك على الساعدين وأصابع القدمين بخط مستقيم.', 'شدّ البطن والأرداف وتنفّس بهدوء طوال المدة.'],
    tips: ['لا تحبس النفس ولا تدع أسفل الظهر يهبط.', 'إن كان صعباً ضع الركبتين على الأرض.'],
    frames: [PLANK_BASE, pose(PLANK_BASE, { p: [100, 150], h: [166, 138] })], dur: 3
  },
  crunches: {
    ar: 'الطحن البطني (الكرنش)', en: 'Abdominal Crunch', cat: 'core', floor: true,
    muscles: 'العضلة المستقيمة البطنية (Rectus Abdominis)',
    steps: ['استلقِ على ظهرك مع ثني الركبتين والقدمان على الأرض.', 'ضع أطراف أصابعك خلف الأذنين.', 'ارفع الكتفين عن الأرض بشدّ البطن ثم انزل ببطء.'],
    tips: ['لا تسحب رقبتك بيديك؛ الحركة من البطن.', 'أخرج النفس أثناء الصعود.'],
    frames: [CRUNCH_A, pose(CRUNCH_A, { h: [54, 140], n: [64, 152], m: [84, 166], e: [74, 138], hd: [56, 140] })], dur: 2
  },
  bicycle: {
    ar: 'الدرّاجة الهوائية', en: 'Bicycle Crunch', cat: 'core', floor: true,
    muscles: 'العضلات المائلة (Obliques) • المستقيمة البطنية',
    steps: ['استلقِ وارفع الكتفين قليلاً واليدان خلف الرأس.', 'اسحب ركبة نحو الصدر مع لفّ المرفق المعاكس نحوها.', 'بدّل الجهة بحركة دراجة متحكَّم بها.'],
    tips: ['الأبطأ أفضل: ركّز على اللف من الجذع لا من المرفق.'],
    frames: [pose(BICYCLE, { kR: [114, 144], fR: [138, 150], kL: [134, 164], fL: [168, 162] }), pose(BICYCLE, { kL: [114, 144], fL: [138, 150], kR: [134, 164], fR: [168, 162] })], dur: 1.4
  },
  leg_raises: {
    ar: 'رفع الساقين', en: 'Lying Leg Raise', cat: 'core', floor: true,
    muscles: 'أسفل البطن (Lower Rectus Abdominis) • عضلات الورك',
    steps: ['استلقِ على ظهرك ويداك بجانبك أو تحت أسفل الظهر.', 'ارفع الساقين مستقيمتين حتى تصبحا عموديتين.', 'انزل ببطء دون لمس الأرض ثم كرّر.'],
    tips: ['إن شعرت بألم أسفل الظهر اثنِ الركبتين قليلاً.'],
    frames: [pose(LYING, { k: [134, 174], f: [168, 170] }), pose(LYING, { k: [108, 142], f: [116, 106] })], dur: 2.6
  },
  flutter_kicks: {
    ar: 'ركلات الرفرفة', en: 'Flutter Kicks', cat: 'core', floor: true,
    muscles: 'أسفل البطن • عضلات الورك القابضة (Hip Flexors)',
    steps: ['استلقِ على ظهرك وارفع الساقين قليلاً عن الأرض.', 'حرّك الساقين للأعلى والأسفل بالتناوب بحركة قصيرة.', 'أبقِ أسفل الظهر ملتصقاً بالأرض.'],
    tips: ['كلما رفعت الساقين أعلى صار التمرين أسهل.'],
    frames: [pose(FLUTTER, { kL: [134, 168], fL: [168, 156], kR: [134, 176], fR: [168, 174] }), pose(FLUTTER, { kR: [134, 168], fR: [168, 156], kL: [134, 176], fL: [168, 174] })], dur: 0.6
  },
  russian_twist: {
    ar: 'الالتفاف الروسي', en: 'Russian Twist', cat: 'core', floor: true,
    muscles: 'العضلات المائلة (Obliques)',
    steps: ['اجلس مع ثني الركبتين وأمِل جذعك للخلف قليلاً.', 'اشبك يديك أمام صدرك.', 'لُفّ الجذع يميناً ثم يساراً بتحكّم.'],
    tips: ['للمبتدئين: أبقِ القدمين على الأرض.', 'حافظ على استقامة الظهر وعدم تقويسه.'],
    frames: [pose(RTWIST, { e: [100, 140], hd: [118, 150] }), pose(RTWIST, { e: [86, 150], hd: [96, 170], h: [70, 110] })], dur: 1.6
  },
  dead_bug: {
    ar: 'الحشرة الميتة', en: 'Dead Bug', cat: 'core', floor: true,
    muscles: 'البطن العميقة (Transversus Abdominis)',
    steps: ['استلقِ على ظهرك وارفع ذراعيك للأعلى والركبتين بزاوية 90°.', 'مُدّ ذراعاً للخلف والساق المعاكسة للأمام ببطء.', 'ارجع للوسط وبدّل الجهة.'],
    tips: ['أسفل الظهر ملتصق بالأرض طوال التمرين.', 'تمرين آمن جداً للظهر ومثالي للمبتدئين.'],
    frames: [DEADBUG, pose(DEADBUG, { eR: [30, 164], hR: [8, 160], kL: [134, 166], fL: [168, 170] }), DEADBUG, pose(DEADBUG, { eL: [30, 164], hL: [8, 160], kR: [134, 166], fR: [168, 170] })], dur: 5
  },
  bird_dog: {
    ar: 'الطائر والكلب', en: 'Bird Dog', cat: 'core', floor: true,
    muscles: 'أسفل الظهر (Erector Spinae) • البطن • الأرداف',
    steps: ['ابدأ على اليدين والركبتين.', 'مُدّ ذراعك اليمنى للأمام والساق اليسرى للخلف.', 'اثبت ثانيتين ثم ارجع وبدّل.'],
    tips: ['لا تقوّس الظهر ولا تُدِر الحوض.'],
    frames: [ALL4, pose(ALL4, { eR: [164, 134], hR: [190, 128], kL: [62, 142], fL: [28, 140] }), ALL4, pose(ALL4, { eL: [164, 134], hL: [190, 128], kR: [62, 142], fR: [28, 140] })], dur: 5
  },
  hamstring_stretch: {
    ar: 'إطالة الفخذ الخلفي (الانحناء للأمام)', en: 'Standing Forward Fold (Hamstring Stretch)', yt: 'standing forward fold hamstring stretch', cat: 'stretch',
    muscles: 'الفخذ الخلفي (Hamstrings) • أسفل الظهر',
    steps: ['قف والقدمان بعرض الحوض.', 'انحنِ ببطء من الوركين باتجاه قدميك.', 'اترك الرأس والذراعين يتدلّيان وتنفّس بعمق.'],
    tips: ['اثنِ الركبتين قليلاً إن شعرت بشدّ قوي.'],
    frames: [pose(ST_SIDE, {}), pose(ST_SIDE, { h: [130, 168], n: [124, 152], p: [96, 110], e: [124, 170], hd: [112, 182] })], dur: 4
  },
  quad_stretch: {
    ar: 'إطالة الفخذ الأمامي', en: 'Standing Quad Stretch', cat: 'stretch',
    muscles: 'الفخذ الأمامي (Quadriceps)',
    steps: ['قف واستند إلى حائط إن لزم.', 'امسك قدمك واسحب الكعب نحو المؤخرة.', 'اثبت 30 ثانية ثم بدّل الساق.'],
    tips: ['أبقِ الركبتين متقاربتين والحوض مستقيماً.'],
    frames: [QUAD, pose(QUAD, { hL: [143, 60], p: [100, 111] })], dur: 3
  },
  cat_cow: {
    ar: 'القطة والبقرة', en: 'Cat-Cow Stretch', cat: 'stretch', floor: true,
    muscles: 'العمود الفقري • عضلات الظهر والبطن',
    steps: ['ابدأ على اليدين والركبتين.', 'مع الشهيق اخفض البطن وارفع الرأس (البقرة).', 'مع الزفير قوّس ظهرك للأعلى وأنزل الرأس (القطة).'],
    tips: ['تحرّك ببطء مع التنفس ودون أي ألم.'],
    frames: [pose(ALL4, { m: [118, 154], h: [156, 128] }), pose(ALL4, { m: [118, 126], h: [150, 152] })], dur: 4
  },
  cobra: {
    ar: 'إطالة الكوبرا', en: 'Cobra Stretch', cat: 'stretch', floor: true,
    muscles: 'عضلات البطن • أسفل الظهر',
    steps: ['استلقِ على بطنك والكفّان تحت الكتفين.', 'ادفع بيديك لرفع الصدر مع إبقاء الحوض على الأرض.', 'اثبت وتنفّس ثم انزل ببطء.'],
    tips: ['ارتفع بقدر ما يسمح ظهرك دون ألم.'],
    frames: [COBRA_A, pose(COBRA_A, { h: [150, 126], n: [138, 140], e: [140, 161], hd: [142, 182] })], dur: 4
  },
  child_pose: {
    ar: 'وضعية الطفل', en: "Child's Pose", yt: 'child pose stretch', cat: 'stretch', floor: true,
    muscles: 'أسفل الظهر • الكتفان • الوركان',
    steps: ['اجلس على كعبيك والركبتان متباعدتان قليلاً.', 'انحنِ للأمام ومُدّ ذراعيك على الأرض.', 'أرخِ جبهتك وتنفّس بعمق.'],
    tips: ['وضعية استرخاء ممتازة لنهاية التمرين.'],
    frames: [CHILD, pose(CHILD, { n: [128, 166], p: [84, 162], h: [142, 171] })], dur: 4
  },
  knee_to_chest: {
    ar: 'ضمّ الركبتين للصدر', en: 'Knees-to-Chest Stretch', cat: 'stretch', floor: true,
    muscles: 'أسفل الظهر • الأرداف',
    steps: ['استلقِ على ظهرك.', 'اسحب ركبتيك نحو صدرك وأحِطهما بذراعيك.', 'اثبت وتأرجح بلطف يميناً ويساراً.'],
    tips: ['أبقِ الرأس والكتفين مرتاحين على الأرض.'],
    frames: [LYING, pose(LYING, { h: [38, 166], k: [82, 146], f: [110, 142], e: [64, 156], hd: [82, 144] })], dur: 4
  },
  deep_breathing: {
    ar: 'التنفّس العميق', en: 'Diaphragmatic Breathing', yt: 'diaphragmatic breathing technique', cat: 'stretch', floor: true,
    muscles: 'الحجاب الحاجز (Diaphragm)',
    steps: ['اجلس متربّعاً وظهرك مستقيم.', 'خذ شهيقاً من الأنف 4 ثوانٍ مع رفع الذراعين.', 'أخرج الزفير من الفم 6 ثوانٍ مع إنزال الذراعين.'],
    tips: ['التنفس العميق يخفّف التوتر وهرمون الكورتيزول المرتبط بدهون البطن.'],
    frames: [SEATED, pose(SEATED, { eL: [80, 96], hL: [92, 74], eR: [120, 96], hR: [108, 74] })], dur: 6
  }
};
const ytUrl = id => `https://www.youtube.com/results?search_query=${encodeURIComponent((EX[id].yt || EX[id].en) + ' proper form')}`;

function figureSVG(id, opts = {}) {
  const ex = EX[id];
  if (!ex) return '';
  const frames = ex.frames.map(completePose);
  const animate = !opts.static && frames.length > 1;
  const f0 = frames[0];
  const seq = animate ? [...frames, frames[0]] : [f0];
  const n = seq.length - 1;
  const dur = ex.dur || 2;
  const keyTimes = animate ? seq.map((_, i) => (i / n).toFixed(3)).join(';') : '';
  const splines = animate ? Array(n).fill('.45 0 .55 1').join(';') : '';
  const an = (attr, key, i) => animate
    ? `<animate attributeName="${attr}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="${keyTimes}" keySplines="${splines}" values="${seq.map(f => f[key][i]).join(';')}"/>`
    : '';
  const line = (a, b, cls) => `<line class="${cls}" x1="${f0[a][0]}" y1="${f0[a][1]}" x2="${f0[b][0]}" y2="${f0[b][1]}">${an('x1', a, 0)}${an('y1', a, 1)}${an('x2', b, 0)}${an('y2', b, 1)}</line>`;
  let s = `<svg class="fig ${opts.cls || ''}" viewBox="0 0 200 200" aria-hidden="true">`;
  s += '<line class="ground" x1="8" y1="187" x2="192" y2="187"/>';
  if (ex.floor) s += '<rect class="mat" x="12" y="184" width="176" height="6" rx="3"/>';
  [['n', 'eL'], ['eL', 'hL'], ['p', 'kL'], ['kL', 'fL']].forEach(([a, b]) => { s += line(a, b, 'limb far'); });
  [['n', 'm'], ['m', 'p']].forEach(([a, b]) => { s += line(a, b, 'torso'); });
  [['p', 'kR'], ['kR', 'fR'], ['n', 'eR'], ['eR', 'hR']].forEach(([a, b]) => { s += line(a, b, 'limb'); });
  s += `<circle class="head" cx="${f0.h[0]}" cy="${f0.h[1]}" r="11">${an('cx', 'h', 0)}${an('cy', 'h', 1)}</circle>`;
  return s + '</svg>';
}

/* ===================== خطة الـ 30 يوماً ===================== */
const LEVELS = {
  1: { work: 30, rest: 30, label: 'تأسيسي' },
  2: { work: 35, rest: 25, label: 'بناء' },
  3: { work: 40, rest: 20, label: 'تقدّم' },
  4: { work: 45, rest: 15, label: 'قوة' }
};
const DAY_TYPES = [
  'cardio', 'core', 'mix', 'rest', 'cardio', 'core', 'rest',
  'cardio', 'core', 'mix', 'rest', 'cardio', 'core', 'rest',
  'cardio', 'core', 'mix', 'rest', 'cardio', 'core', 'rest',
  'cardio', 'core', 'mix', 'rest', 'cardio', 'core', 'rest',
  'cardio', 'mix'
];
const TYPE_INFO = {
  cardio: { name: 'كارديو حرق الدهون', short: 'كارديو', icon: 'bolt', met: 6, desc: 'تمارين هوائية متواصلة ترفع نبضك لحرق أكبر قدر من السعرات.' },
  core: { name: 'شدّ البطن والجذع', short: 'بطن', icon: 'target', met: 4, desc: 'تقوية عضلات البطن والجذع لشدّ منطقة الخصر وتحسين القوام.' },
  mix: { name: 'حرق شامل + قوة', short: 'شامل', icon: 'dumbbell', met: 5, desc: 'مزيج من القوة والكارديو لبناء العضلات ورفع معدل الحرق اليومي.' },
  rest: { name: 'راحة استشفائية', short: 'راحة', icon: 'bed', met: 2.5, desc: 'العضلات تُبنى وقت الراحة. جلسة إطالة خفيفة اختيارية (10 دقائق) + مشي هادئ 20–30 دقيقة.' }
};
const CIRCUITS = {
  cardio: {
    1: ['step_jacks', 'butt_kicks', 'squat', 'shadow_boxing', 'high_knees'],
    2: ['jumping_jacks', 'high_knees', 'squat', 'butt_kicks', 'mountain_climbers'],
    3: ['jumping_jacks', 'high_knees', 'mountain_climbers', 'reverse_lunge', 'shadow_boxing'],
    4: ['burpee', 'high_knees', 'mountain_climbers', 'squat', 'jumping_jacks']
  },
  core: {
    1: ['crunches', 'glute_bridge', 'dead_bug', 'plank', 'bird_dog'],
    2: ['crunches', 'dead_bug', 'leg_raises', 'plank', 'glute_bridge'],
    3: ['bicycle', 'leg_raises', 'plank', 'russian_twist', 'flutter_kicks'],
    4: ['bicycle', 'mountain_climbers', 'leg_raises', 'russian_twist', 'plank']
  },
  mix: {
    1: ['squat', 'knee_pushup', 'step_jacks', 'crunches', 'glute_bridge'],
    2: ['squat', 'knee_pushup', 'jumping_jacks', 'plank', 'reverse_lunge'],
    3: ['reverse_lunge', 'knee_pushup', 'high_knees', 'bicycle', 'superman'],
    4: ['burpee', 'squat', 'knee_pushup', 'mountain_climbers', 'plank']
  }
};
const WARMUP = ['march', 'arm_circles', 'torso_twist', 'hip_circles', 'step_jacks'];
const COOLDOWN = ['hamstring_stretch', 'quad_stretch', 'cat_cow', 'cobra', 'child_pose'];
const RECOVERY = [['march', 60], ['arm_circles', 60], ['cat_cow', 60], ['knee_to_chest', 60], ['cobra', 60], ['child_pose', 60], ['quad_stretch', 60], ['hamstring_stretch', 60], ['deep_breathing', 120]];
const ROUNDS = 4;
const PHASES = { prep: 'استعد', warmup: 'الإحماء', main: 'التمارين الأساسية', cooldown: 'الإطالة والتهدئة', recovery: 'جلسة الاستشفاء' };

function getDay(n) {
  const type = DAY_TYPES[n - 1];
  const week = Math.min(4, Math.ceil(n / 7));
  const lv = LEVELS[week];
  return {
    n, type, week, work: lv.work, rest: lv.rest,
    title: n === 30 ? 'تحدّي الختام 🏆' : TYPE_INFO[type].name,
    circuit: type === 'rest' ? [] : CIRCUITS[type][week],
    warmup: week >= 3 ? WARMUP.map(x => (x === 'step_jacks' ? 'jumping_jacks' : x)) : WARMUP
  };
}
function buildSegments(d) {
  const segs = [];
  if (d.type === 'rest') {
    RECOVERY.forEach(([id, t]) => segs.push({ phase: 'recovery', kind: 'work', id, dur: t }));
  } else {
    d.warmup.forEach(id => segs.push({ phase: 'warmup', kind: 'work', id, dur: 60 }));
    for (let r = 1; r <= ROUNDS; r++) {
      d.circuit.forEach(id => {
        segs.push({ phase: 'main', kind: 'work', id, dur: d.work, round: r });
        segs.push({ phase: 'main', kind: 'rest', id: null, dur: d.rest, round: r });
      });
    }
    COOLDOWN.forEach(id => segs.push({ phase: 'cooldown', kind: 'work', id, dur: 60 }));
  }
  segs.unshift({ phase: 'prep', kind: 'rest', id: null, dur: 10 });
  segs.forEach((s, i) => { if (s.kind === 'rest') s.id = segs[i + 1] ? segs[i + 1].id : null; });
  return segs;
}
function currentDayNum() {
  for (let n = 1; n <= 30; n++) if (!S.plan.completed[n]) return n;
  return 31;
}
function addActivity(date, { type, day, kcal = 0, min = 0 }) {
  const a = S.activity[date] || { types: [], days: [], kcal: 0, min: 0 };
  if (!a.types.includes(type)) a.types.push(type);
  if (day && !a.days.includes(day)) a.days.push(day);
  a.kcal = Math.round((a.kcal || 0) + kcal);
  a.min = Math.round((a.min || 0) + min);
  S.activity[date] = a;
}
function markRestDone(n) {
  S.plan.completed[n] = todayKey();
  addActivity(todayKey(), { type: 'rest', day: n });
  save();
  toast('تم تسجيل يوم الراحة ✓ سلسلتك مستمرة');
  renderAll();
}
function bodyWeight() {
  const ms = [...S.measurements].filter(m => m.weight).sort((a, b) => a.date.localeCompare(b.date));
  return +S.profile.weight || (ms.length ? +ms[ms.length - 1].weight : 0) || 70;
}

/* ===================== التغذية ===================== */
const ACTIVITY = [
  { v: 1.2, l: 'خامل (عمل مكتبي، بدون رياضة)' },
  { v: 1.375, l: 'خفيف (تمرين 1–3 أيام أسبوعياً)' },
  { v: 1.55, l: 'متوسط (تمرين 3–5 أيام أسبوعياً)' },
  { v: 1.725, l: 'عالٍ (تمرين 6–7 أيام أسبوعياً)' }
];
const MEAL_TYPES = { breakfast: 'الفطور', lunch: 'الغداء', dinner: 'العشاء', snack: 'وجبات خفيفة' };
const PRESET_MEALS = [
  { t: 'breakfast', name: 'شوفان بالحليب والموز', portion: '50غ شوفان + كوب حليب + موزة', kcal: 390, p: 15 },
  { t: 'breakfast', name: 'بيضتان مسلوقتان + خبز أسمر + خيار', portion: '2 بيض + شريحة خبز', kcal: 250, p: 16 },
  { t: 'breakfast', name: 'عجّة بيضتين بالخضار', portion: '2 بيض + فلفل وطماطم + ملعقة صغيرة زيت', kcal: 230, p: 13 },
  { t: 'breakfast', name: 'فول مدمّس بزيت الزيتون', portion: 'طبق 150غ + ملعقة صغيرة زيت', kcal: 260, p: 14 },
  { t: 'breakfast', name: 'لبن رائب/زبادي بالعسل', portion: '200غ + ملعقة صغيرة عسل', kcal: 170, p: 9 },
  { t: 'breakfast', name: 'جبن خفيف مع طماطم وخبز أسمر', portion: '60غ جبن + شريحة خبز', kcal: 240, p: 15 },
  { t: 'lunch', name: 'صدر دجاج مشوي مع أرز وسلطة', portion: '150غ دجاج + 100غ أرز مطبوخ', kcal: 470, p: 50 },
  { t: 'lunch', name: 'شوربة عدس + سلطة', portion: 'طبق كبير 350مل', kcal: 320, p: 18 },
  { t: 'lunch', name: 'سردين معلّب مع سلطة وخبز أسمر', portion: 'علبة 120غ مصفّاة + شريحة خبز', kcal: 380, p: 27 },
  { t: 'lunch', name: 'حمّص مطبوخ بالخضار', portion: '200غ حمص مطبوخ + خضار', kcal: 360, p: 17 },
  { t: 'lunch', name: 'تونة بالماء مع سلطة خضراء', portion: 'علبة + ملعقة زيت زيتون', kcal: 280, p: 30 },
  { t: 'lunch', name: 'طاجين خضار بالدجاج', portion: 'صحن متوسط', kcal: 420, p: 32 },
  { t: 'lunch', name: 'معكرونة قمح كامل بالتونة والطماطم', portion: '80غ معكرونة (قبل الطهي)', kcal: 450, p: 30 },
  { t: 'lunch', name: 'لوبيا بيضاء بالصلصة', portion: 'صحن متوسط 250غ', kcal: 330, p: 17 },
  { t: 'dinner', name: 'سلطة كبيرة مع بيضتين', portion: 'خضار متنوعة + 2 بيض', kcal: 250, p: 14 },
  { t: 'dinner', name: 'زبادي مع خيار (سلطة لبن)', portion: '200غ', kcal: 140, p: 10 },
  { t: 'dinner', name: 'شوربة خضار مع دجاج', portion: 'طبق + 100غ دجاج', kcal: 280, p: 28 },
  { t: 'dinner', name: 'كسكسي بالخضار (صحن صغير)', portion: '150غ مطبوخ + خضار', kcal: 350, p: 11 },
  { t: 'dinner', name: 'سمك مشوي مع خضار سوتيه', portion: '150غ سمك', kcal: 300, p: 32 },
  { t: 'snack', name: 'تفاحة', portion: 'حبة متوسطة', kcal: 95, p: 0.5 },
  { t: 'snack', name: 'موزة', portion: 'حبة متوسطة', kcal: 105, p: 1.3 },
  { t: 'snack', name: 'برتقالة', portion: 'حبة متوسطة', kcal: 65, p: 1.3 },
  { t: 'snack', name: 'حفنة لوز', portion: '20غ (≈15 حبة)', kcal: 120, p: 4 },
  { t: 'snack', name: '3 تمرات', portion: '≈ 24غ', kcal: 70, p: 0.6 },
  { t: 'snack', name: 'كوب حليب قليل الدسم', portion: '250مل', kcal: 110, p: 8 },
  { t: 'snack', name: 'بيضة مسلوقة', portion: 'بيضة واحدة', kcal: 75, p: 6.5 },
  { t: 'snack', name: 'خيار وجزر', portion: 'صحن صغير', kcal: 40, p: 1 },
  { t: 'snack', name: 'حمّص محمّص', portion: '30غ', kcal: 120, p: 6 },
  { t: 'snack', name: 'زبادي طبيعي', portion: 'علبة 125غ', kcal: 75, p: 4.5 }
];
const TIPS = [
  { t: 'لا يوجد حرق موضعي', d: 'دهون البطن تنقص مع نزول نسبة الدهون في الجسم كله. تمارين البطن تقوّي العضلات وتشدّها، أما العجز في السعرات فهو ما يحرق الدهون.' },
  { t: 'البروتين في كل وجبة', d: 'البيض، العدس، الحمص، الدجاج، السردين والزبادي تزيد الشبع وتحمي عضلاتك أثناء التنحيف.' },
  { t: 'نصف الطبق خضار', d: 'املأ نصف طبقك بالخضار، وربعه بروتين، وربعه نشويات كاملة (خبز أسمر، أرز، شوفان، كسكسي بكمية معتدلة).' },
  { t: 'احذف السكر السائل', d: 'المشروبات الغازية والعصائر المحلّاة من أكبر أسباب دهون البطن. استبدلها بالماء أو الشاي والقهوة دون سكر.' },
  { t: 'قلّل الخبز الأبيض والمقليات', d: 'استبدل الخبز الأبيض بالأسمر، واستخدم الشوي والطهي بالفرن والطاجين بدل القلي.' },
  { t: 'اشرب الماء قبل الأكل', d: 'كوب إلى كوبين قبل الوجبة بنصف ساعة يساعد على الشبع وتقليل الكمية.' },
  { t: 'النوم 7–8 ساعات', d: 'قلّة النوم ترفع هرمونات الجوع والتوتر (الكورتيزول) المرتبطة بتخزين الدهون حول البطن.' },
  { t: 'كُل ببطء', d: 'خذ 15–20 دقيقة لكل وجبة؛ الإحساس بالشبع يحتاج وقتاً ليصل إلى الدماغ.' },
  { t: 'تجنّب الأكل المتأخر العشوائي', d: 'اجعل آخر وجبة قبل النوم بساعتين إلى ثلاث، وإن جعت فاختر زبادي أو خضاراً.' },
  { t: 'امشِ أكثر خلال اليوم', d: 'استهدف 7000–10000 خطوة يومياً بجانب التمرين؛ المشي من أسهل طرق زيادة الحرق.' },
  { t: 'خطّط لوجباتك', d: 'جهّز أساسيات الأسبوع مسبقاً (عدس، دجاج، بيض مسلوق، خضار مقطّعة) حتى لا تلجأ للأكل السريع.' },
  { t: 'الألياف صديقتك', d: 'البقوليات والشوفان والخضار والفواكه الكاملة تبطئ الهضم وتقلّل الجوع.' },
  { t: 'قِس نفسك بذكاء', d: 'زن نفسك وقِس محيط البطن مرة أسبوعياً صباحاً قبل الأكل وبنفس الظروف، ولا تقلق من تقلبات الأيام.' },
  { t: 'الاستمرارية أهم من الكمال', d: 'وجبة غير صحية لا تُفسد تقدّمك؛ عُد للخطة في الوجبة التالية مباشرة.' }
];

function calcNutrition(p) {
  const w = +p.weight, h = +p.height, a = +p.age;
  if (!(w > 0 && h > 0 && a > 0)) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'female' ? -161 : 5);
  const tdee = bmr * (+p.activity || 1.375);
  const deficit = Math.min(500, tdee * 0.2);
  const floor = p.sex === 'female' ? 1200 : 1500;
  const target = Math.round(Math.min(Math.max(floor, tdee - deficit), tdee) / 10) * 10;
  const hm = h / 100;
  const bmi = w / (hm * hm);
  const refWeight = Math.min(w, 27 * hm * hm);
  const protein = Math.round(refWeight * 1.6);
  const fat = Math.round((target * 0.28) / 9);
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));
  const realDeficit = Math.max(0, tdee - target);
  return {
    bmr: Math.round(bmr), tdee: Math.round(tdee), target, bmi: round1(bmi), protein, fat, carbs,
    water: round1(w * 0.035), deficit: Math.round(realDeficit), weekly: round1((realDeficit * 7) / 7700)
  };
}
function bmiLabel(b) {
  if (b < 18.5) return 'نقص في الوزن';
  if (b < 25) return 'وزن طبيعي';
  if (b < 30) return 'زيادة في الوزن';
  return 'سمنة';
}
const dayMeals = k => S.meals[k] || [];
const sumMeals = k => dayMeals(k).reduce((a, m) => ({ kcal: a.kcal + (+m.kcal || 0), p: a.p + (+m.protein || 0) }), { kcal: 0, p: 0 });
function defaultMealType() {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}
function changeWater(delta, k = todayKey()) {
  const v = clamp((S.water[k] || 0) + delta, 0, 30);
  S.water[k] = v;
  save();
  if (delta > 0) {
    vibrate(20);
    if (v === +S.settings.waterGoal) toast('🎉 وصلت لهدف الماء اليوم!');
  }
  renderAll();
}

/* ===================== التقدم ===================== */
function streakInfo() {
  const keys = Object.keys(S.activity).sort();
  const set = new Set(keys);
  let cur = 0;
  let k = todayKey();
  if (!set.has(k)) k = addDays(k, -1);
  while (set.has(k)) { cur++; k = addDays(k, -1); }
  let best = 0, run = 0, prev = null;
  for (const key of keys) {
    run = (prev && addDays(prev, 1) === key) ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return { cur, best };
}
const sortedMeasurements = () => [...S.measurements].sort((a, b) => a.date.localeCompare(b.date));

/* ===================== التنقل والنوافذ ===================== */
const VIEW_TITLES = { home: 'الرئيسية', plan: 'خطة الـ 30 يوماً', nutrition: 'التغذية', progress: 'التقدّم', settings: 'الإعدادات' };
const VIEW_SUBS = { home: 'تحدي 30 يوماً لحرق دهون البطن', plan: 'تمارين منزلية • 30 دقيقة يومياً', nutrition: 'السعرات • الوجبات • الماء', progress: 'الوزن • محيط البطن • الالتزام', settings: 'الصوت • النسخ الاحتياطي' };
let currentView = 'home';

function showView(v) {
  currentView = v;
  $$('.view').forEach(el => el.classList.toggle('active', el.id === `view-${v}`));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('#pageTitle').textContent = VIEW_TITLES[v];
  $('#pageSub').textContent = VIEW_SUBS[v];
  renderView(v);
  window.scrollTo({ top: 0 });
}
function renderView(v) {
  ({ home: renderHome, plan: renderPlan, nutrition: renderNutrition, progress: renderProgress, settings: renderSettings })[v]();
}
function renderAll() { renderView(currentView); updateInstallUI(); }

/* سجل المتصفح: زر الرجوع في أندرويد يغلق النوافذ بدلاً من الخروج */
let ignorePop = false;
const overlay = {
  open(kind) {
    if (history.state && history.state.ov) history.replaceState({ ov: kind }, '');
    else history.pushState({ ov: kind }, '');
  },
  close() {
    if (history.state && history.state.ov) { ignorePop = true; history.back(); }
  }
};
window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; return; }
  if (!$('#modal').hidden) { hideModal(); return; }
  if (!$('#player').hidden) {
    if (P.active && !P.finished) {
      if (confirm('إنهاء التمرين الحالي؟ لن يُحتسب هذا اليوم.')) closePlayer();
      else history.pushState({ ov: 'player' }, '');
    } else closePlayer();
  }
});

function openModal(html) {
  const m = $('#modal');
  $('#modalBody').innerHTML = html;
  if (m.hidden) {
    m.hidden = false;
    document.body.classList.add('no-scroll');
    overlay.open('modal');
  }
  $('#modalBody').scrollTop = 0;
}
function hideModal() {
  $('#modal').hidden = true;
  $('#modalBody').innerHTML = '';
  if ($('#player').hidden) document.body.classList.remove('no-scroll');
}
function closeModal() { if (!$('#modal').hidden) { hideModal(); overlay.close(); } }

/* ===================== الرئيسية ===================== */
function renderHome() {
  const el = $('#view-home');
  const cur = currentDayNum();
  const doneCount = Object.keys(S.plan.completed).length;
  const tk = todayKey();
  const todayAct = S.activity[tk];
  const nut = calcNutrition(S.profile);
  const eaten = sumMeals(tk);
  const water = S.water[tk] || 0;
  const st = streakInfo();
  const ms = sortedMeasurements();
  const lastW = [...ms].reverse().find(m => m.weight);
  const lastWaist = [...ms].reverse().find(m => m.waist);
  const tip = TIPS[Math.floor(parseKey(tk).getTime() / 86400000) % TIPS.length];

  let hero;
  if (cur > 30) {
    hero = `<div class="hero type-core">
      <div class="hero-top"><span class="chip type-core">${icon('trophy')} اكتمل التحدي</span></div>
      <h2>مبروك! أنهيت 30 يوماً كاملة 🎉</h2>
      <p>استمر بنفس النمط، ويمكنك إعادة بدء الخطة من الإعدادات لدورة جديدة.</p>
      <div class="hero-actions"><button class="btn primary big" data-act="nav" data-view="progress">${icon('scale')} شاهد تقدّمك</button></div>
    </div>`;
  } else {
    const d = getDay(cur);
    const ti = TYPE_INFO[d.type];
    const sampleEx = d.type === 'rest' ? 'child_pose' : d.circuit[0];
    hero = `<div class="hero type-${d.type}">
      <div class="hero-top"><span class="chip type-${d.type}">${icon(ti.icon)} ${ti.short}</span><span class="muted small">اليوم <b class="num">${cur}</b> من 30</span></div>
      <div class="hero-body">
        <div style="flex:1;min-width:0">
          <h2>${d.title}</h2>
          <p>${ti.desc}</p>
          <div class="hero-meta">
            <span class="chip">${icon('clock')} ${d.type === 'rest' ? '10 د (اختياري)' : '30 دقيقة'}</span>
            ${d.type === 'rest' ? '' : `<span class="chip">${icon('flame')} ${d.work}ث / ${d.rest}ث</span>`}
          </div>
        </div>
        ${figureSVG(sampleEx)}
      </div>
      ${todayAct ? `<div class="done-note">${icon('check')} أنجزت نشاط اليوم، أحسنت! يمكنك المتابعة غداً.</div>` : ''}
      <div class="hero-actions">
        <button class="btn primary big" data-act="start-day" data-day="${cur}">${icon('play')} ${d.type === 'rest' ? 'جلسة الاستشفاء' : 'ابدأ التمرين'}</button>
        <button class="btn" data-act="open-day" data-day="${cur}">التفاصيل</button>
      </div>
      ${d.type === 'rest' ? `<button class="btn ghost block" style="margin-top:8px;position:relative;z-index:1" data-act="mark-rest" data-day="${cur}">${icon('check')} سجّل يوم الراحة كمنجز</button>` : ''}
    </div>`;
  }

  const kcalStat = nut
    ? `<div class="stat"><div class="s-icon">${icon('food')}</div><b class="num">${Math.max(0, nut.target - eaten.kcal)}</b><span>سعرة متبقية من ${nut.target}</span></div>`
    : `<button class="stat" data-act="go-calc" style="text-align:right"><div class="s-icon">${icon('calc')}</div><b style="font-size:1rem">احسب سعراتك</b><span>اضغط لفتح الحاسبة</span></button>`;

  el.innerHTML = `
    ${deferredPrompt ? `<div class="card install-banner">${icon('phone')}<p>ثبّت التطبيق على هاتفك ليعمل بدون إنترنت كتطبيق حقيقي.</p><button class="btn primary" data-act="install">تثبيت</button></div>` : ''}
    ${hero}
    <div class="card">
      <div class="card-title"><h3>${icon('calendar')} تقدّم الخطة</h3><span class="muted small num">${doneCount}/30</span></div>
      <div class="plan-progress"><div class="bar"><i style="width:${(doneCount / 30) * 100}%"></i></div><b class="num">${Math.round((doneCount / 30) * 100)}%</b></div>
    </div>
    <div class="stats-grid">
      <div class="stat fire"><div class="s-icon">${icon('flame')}</div><b class="num">${st.cur}</b><span>يوم التزام متتالي</span></div>
      ${kcalStat}
      <div class="stat blue"><div class="s-icon">${icon('drop')}</div><button class="s-act" data-act="water" data-d="1" aria-label="إضافة كوب ماء">${icon('plus')}</button><b class="num">${water}/${S.settings.waterGoal}</b><span>أكواب ماء اليوم</span></div>
      <div class="stat violet"><div class="s-icon">${icon('scale')}</div><b class="num">${lastW ? lastW.weight + ' كغ' : '—'}</b><span>${lastWaist ? 'محيط البطن ' + lastWaist.waist + ' سم' : 'سجّل قياساتك'}</span></div>
    </div>
    <div class="card tip-card">
      <div class="t-icon">${icon('book')}</div>
      <div><h4>نصيحة اليوم: ${tip.t}</h4><p>${tip.d}</p></div>
    </div>`;
}

/* ===================== الخطة والمكتبة ===================== */
const PLAN_UI = { tab: 'plan' };
const segBtn = (act, v, label, cur) => `<button class="seg-btn ${v === cur ? 'active' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;

function renderPlan() {
  const el = $('#view-plan');
  el.innerHTML = `<div class="seg">${segBtn('plan-tab', 'plan', 'خطة 30 يوماً', PLAN_UI.tab)}${segBtn('plan-tab', 'lib', 'مكتبة التمارين', PLAN_UI.tab)}</div>
    ${PLAN_UI.tab === 'plan' ? planGridHTML() : libraryHTML()}`;
}
function planGridHTML() {
  const cur = currentDayNum();
  const weeks = [[1, 7], [8, 14], [15, 21], [22, 28], [29, 30]];
  let html = `<div class="legend">${['cardio', 'core', 'mix', 'rest'].map(t => `<span class="chip type-${t}">${icon(TYPE_INFO[t].icon)} ${TYPE_INFO[t].short}</span>`).join('')}</div>`;
  weeks.forEach(([a, b], wi) => {
    const lv = LEVELS[Math.min(4, wi + 1)];
    html += `<div class="week"><div class="week-head"><h4>${wi === 4 ? 'الختام' : 'الأسبوع ' + (wi + 1)}</h4><span>${lv.label} • ${lv.work}ث تمرين / ${lv.rest}ث راحة</span></div><div class="days-grid">`;
    for (let n = a; n <= b; n++) {
      const t = DAY_TYPES[n - 1];
      const done = !!S.plan.completed[n];
      html += `<button class="day-card type-${t} ${done ? 'done' : ''} ${n === cur ? 'current' : ''}" data-act="open-day" data-day="${n}" aria-label="اليوم ${n}">
        ${done ? `<span class="dcheck">${icon('check')}</span>` : ''}
        <span class="dnum num">${n}</span>${icon(TYPE_INFO[t].icon)}
      </button>`;
    }
    html += '</div></div>';
  });
  html += `<div class="card">
    <div class="card-title"><h3>${icon('info')} كيف تعمل الخطة؟</h3></div>
    <p class="muted small" style="margin-bottom:10px">كل يوم تدريبي = إحماء 5 دقائق + 20 دقيقة أساسية (5 تمارين × 4 جولات) + إطالة 5 دقائق. تزداد الشدة أسبوعياً بزيادة وقت العمل وتقليل الراحة.</p>
    <div class="level-row">${[1, 2, 3, 4].map(w => `<div class="level"><b>أ${w}: ${LEVELS[w].label}</b><span class="num">${LEVELS[w].work}/${LEVELS[w].rest} ث</span></div>`).join('')}</div>
  </div>`;
  return html;
}
function exRowHTML(id, extra = '', day = null) {
  const ex = EX[id];
  return `<button class="ex-row" data-act="open-ex" data-id="${id}" ${day ? `data-day="${day}"` : ''}>
    ${figureSVG(id, { static: true })}
    <div class="ex-txt"><b>${ex.ar}</b><span class="en">${ex.en}</span></div>
    ${extra ? `<span class="dur">${extra}</span>` : icon('chevL', 'chev')}
  </button>`;
}
function libraryHTML() {
  return Object.entries(CATS).map(([cat, name]) => {
    const ids = Object.keys(EX).filter(id => EX[id].cat === cat);
    return `<h3 class="section-title">${name} <span class="muted small">(${ids.length})</span></h3>${ids.map(id => exRowHTML(id)).join('')}`;
  }).join('');
}
function dayModalHTML(n) {
  const d = getDay(n);
  const ti = TYPE_INFO[d.type];
  const done = S.plan.completed[n];
  let html = `<div class="sheet-title">
    <span class="chip type-${d.type}">${icon(ti.icon)} ${ti.name}</span>
    <h2>اليوم ${n}: ${d.title}</h2>
    <p>${d.type === 'rest' ? ti.desc : `الأسبوع ${d.week} • المستوى: ${LEVELS[d.week].label} • ${d.work} ث تمرين / ${d.rest} ث راحة`}</p>
    ${done ? `<div class="done-note" style="margin-top:8px">${icon('check')} تم إنجازه في ${fmtDate(done)}</div>` : ''}
  </div>`;
  if (d.type === 'rest') {
    html += `<div class="block-head" style="--c:var(--violet)"><h4><i class="dot"></i> جلسة الاستشفاء الخفيفة</h4><span>10 دقائق • اختياري</span></div>
      ${RECOVERY.map(([id, t]) => exRowHTML(id, t + 'ث', n)).join('')}
      <div class="safety" style="background:var(--violet-soft);border-color:rgba(167,139,250,.3)"><b style="color:var(--violet)">${icon('heart')} نصيحة يوم الراحة</b>امشِ 20–30 دقيقة بهدوء، اشرب الماء جيداً، ونَم مبكراً. سجّل اليوم كمنجز للحفاظ على سلسلة الالتزام.</div>
      <div class="sheet-footer">
        <button class="btn primary big" data-act="start-day" data-day="${n}">${icon('play')} ابدأ الجلسة</button>
        <button class="btn big" data-act="mark-rest" data-day="${n}">${icon('check')} منجز</button>
      </div>`;
    return html;
  }
  html += `<div class="block-head" style="--c:var(--fire)"><h4><i class="dot"></i> الإحماء</h4><span>5 دقائق</span></div>
    ${d.warmup.map(id => exRowHTML(id, '60ث', n)).join('')}
    <div class="block-head" style="--c:var(--accent)"><h4><i class="dot"></i> التمارين الأساسية</h4><span>20 دقيقة • ${ROUNDS} جولات</span></div>
    ${d.circuit.map(id => exRowHTML(id, `${d.work}ث ×${ROUNDS}`, n)).join('')}
    <div class="block-head" style="--c:var(--blue)"><h4><i class="dot"></i> الإطالة والتهدئة</h4><span>5 دقائق</span></div>
    ${COOLDOWN.map(id => exRowHTML(id, '60ث', n)).join('')}
    <div class="sheet-footer"><button class="btn primary big" data-act="start-day" data-day="${n}">${icon('play')} ابدأ تمرين اليوم ${n}</button></div>`;
  return html;
}
function exDetailHTML(id) {
  const ex = EX[id];
  return `<div class="ex-detail-fig">${figureSVG(id)}</div>
    <div class="ex-names"><h2>${ex.ar}</h2><div class="en" style="font-size:1rem">${ex.en}</div></div>
    <dl class="name-table">
      <dt>الاسم بالعربية</dt><dd>${ex.ar}</dd>
      <dt>الاسم بالإنجليزية</dt><dd class="en" style="color:var(--text)">${ex.en}</dd>
      <dt>العضلات المستهدفة</dt><dd>${ex.muscles}</dd>
      <dt>التصنيف</dt><dd>${CATS[ex.cat]}</dd>
    </dl>
    <h4 style="margin:0 2px 8px;font-weight:800">طريقة الأداء</h4>
    <ol class="steps">${ex.steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <div class="safety"><b>${icon('alert')} لتجنّب الإصابة</b><ul>${ex.tips.map(t => `<li>${t}</li>`).join('')}</ul></div>
    <a class="btn yt block" href="${ytUrl(id)}" target="_blank" rel="noopener">${icon('youtube')} شاهد الطريقة على يوتيوب</a>`;
}
function exModalHTML(id, backDay) {
  return `<div class="sheet-title">${backDay ? `<button class="btn ghost" style="padding:6px 10px" data-act="open-day" data-day="${backDay}">${icon('chevR')} رجوع لليوم ${backDay}</button>` : `<span class="chip">${CATS[EX[id].cat]}</span>`}</div>${exDetailHTML(id)}`;
}

/* ===================== مشغل التمرين ===================== */
const P = { active: false, finished: false, day: null, segs: [], i: 0, running: false, endAt: 0, remainMs: 0, timer: null, lastSec: null, wake: null, total: 0 };
const RING_C = 2 * Math.PI * 54;

function startWorkout(n) {
  const d = getDay(n);
  P.day = d;
  P.segs = buildSegments(d);
  P.total = P.segs.reduce((a, s) => a + s.dur, 0);
  P.active = true;
  P.finished = false;
  initAudio();
  hideModal();
  $('#player').hidden = false;
  document.body.classList.add('no-scroll');
  overlay.open('player');
  $('#plDone').hidden = true;
  $('#plMain').hidden = false;
  $('#plHow').hidden = true;
  updateSoundBtn();
  loadSeg(0, true);
  requestWake();
}
function loadSeg(i, autoplay) {
  clearInterval(P.timer);
  P.i = i;
  const seg = P.segs[i];
  P.remainMs = seg.dur * 1000;
  P.lastSec = null;
  renderSeg();
  announce(seg);
  if (autoplay) play();
  else { P.running = false; updatePlayBtn(); updateTimeUI(); figPause(true); }
}
function play() {
  P.running = true;
  P.endAt = Date.now() + P.remainMs;
  clearInterval(P.timer);
  P.timer = setInterval(tick, 100);
  updatePlayBtn();
  figPause(false);
  updateTimeUI();
}
function pause() {
  if (!P.running) return;
  P.remainMs = Math.max(0, P.endAt - Date.now());
  P.running = false;
  clearInterval(P.timer);
  updatePlayBtn();
  figPause(true);
  updateTimeUI();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
function tick() {
  const rem = Math.max(0, P.endAt - Date.now());
  P.remainMs = rem;
  const sec = Math.ceil(rem / 1000);
  if (sec !== P.lastSec) {
    P.lastSec = sec;
    if (sec <= 3 && sec >= 1) { sfx.tick(); vibrate(40); }
  }
  updateTimeUI();
  if (rem <= 0) { clearInterval(P.timer); nextSeg(true); }
}
function nextSeg(auto) {
  if (P.i >= P.segs.length - 1) { finishWorkout(); return; }
  loadSeg(P.i + 1, auto ? true : P.running);
}
function prevSeg() { loadSeg(Math.max(0, P.i - 1), P.running); }
function restartSeg() { loadSeg(P.i, P.running); }

function renderSeg() {
  const seg = P.segs[P.i];
  const isRest = seg.kind === 'rest';
  const ex = seg.id ? EX[seg.id] : null;
  $('#player').classList.toggle('is-rest', isRest);
  let phase = PHASES[seg.phase];
  if (seg.phase === 'main') phase += ` • الجولة ${seg.round}/${ROUNDS}`;
  $('#plPhase').textContent = phase;
  const workSegs = P.segs.filter(s => s.kind === 'work');
  const workIdx = P.segs.slice(0, P.i + 1).filter(s => s.kind === 'work').length;
  $('#plCount').textContent = `تمرين ${Math.max(1, workIdx)} من ${workSegs.length} • اليوم ${P.day.n}`;
  $('#plFigure').innerHTML = ex ? figureSVG(seg.id, { cls: isRest ? 'rest' : '' }) : '';
  $('#plKindTag').textContent = isRest ? (seg.phase === 'prep' ? 'استعد – التمرين الأول' : 'راحة – التالي') : 'تمرين';
  $('#plNameAr').textContent = ex ? ex.ar : 'راحة';
  $('#plNameEn').textContent = ex ? ex.en : '';
  $('#plSub').textContent = isRest ? 'راحة' : 'ثانية';
  let nextWork = null;
  for (let j = P.i + 1; j < P.segs.length; j++) { if (P.segs[j].kind === 'work' && P.segs[j].id !== seg.id) { nextWork = P.segs[j]; break; } }
  $('#plNext').innerHTML = isRest ? `تنفّس بعمق واشرب رشفة ماء 💧` : (nextWork ? `التالي: <b>${EX[nextWork.id].ar}</b>` : 'آخر تمرين! 💪');
  const yt = $('#plYt');
  if (ex) { yt.href = ytUrl(seg.id); yt.hidden = false; } else yt.hidden = true;
  $('#plHow').innerHTML = ex ? `<div class="card" style="margin:0"><div class="muted small" style="margin-bottom:8px">${ex.muscles}</div><ol class="steps">${ex.steps.map(s => `<li>${s}</li>`).join('')}</ol><div class="safety" style="margin:0"><b>${icon('alert')} لتجنّب الإصابة</b><ul>${ex.tips.map(t => `<li>${t}</li>`).join('')}</ul></div></div>` : '';
  updateTimeUI();
}
function updateTimeUI() {
  const seg = P.segs[P.i];
  if (!seg) return;
  const sec = Math.ceil(P.remainMs / 1000);
  $('#plTime').textContent = fmtTime(sec);
  $('.pl-time').classList.toggle('warn', sec <= 3 && seg.kind === 'work');
  const frac = clamp(P.remainMs / (seg.dur * 1000), 0, 1);
  $('#plRing').style.strokeDashoffset = (RING_C * (1 - frac)).toFixed(2);
  const elapsedBefore = P.segs.slice(0, P.i).reduce((a, s) => a + s.dur, 0);
  const elapsed = elapsedBefore + (seg.dur - P.remainMs / 1000);
  $('#plBar').style.width = `${clamp((elapsed / P.total) * 100, 0, 100)}%`;
}
function updatePlayBtn() { $('#plPlayBtn').innerHTML = icon(P.running ? 'pause' : 'play'); }
function updateSoundBtn() { $('#plSoundBtn').innerHTML = icon(S.settings.sound || S.settings.voice ? 'volume' : 'mute'); }
function figPause(paused) {
  const svg = $('#plFigure svg');
  if (svg && svg.pauseAnimations) { try { paused ? svg.pauseAnimations() : svg.unpauseAnimations(); } catch (e) { /* تجاهل */ } }
}
function announce(seg) {
  const ex = seg.id ? EX[seg.id] : null;
  if (seg.phase === 'prep') {
    speak(`استعد. أول تمرين: ${ex ? ex.ar : ''}`, `Get ready. First exercise: ${ex ? ex.en : ''}`);
    return;
  }
  if (seg.kind === 'rest') {
    sfx.rest(); vibrate([80, 60, 80]);
    speak(`راحة. التالي: ${ex ? ex.ar : ''}`, `Rest. Next: ${ex ? ex.en : ''}`);
  } else {
    sfx.start(); vibrate(200);
    const prev = P.segs[P.i - 1];
    const phaseIntro = (!prev || prev.phase !== seg.phase) && seg.phase !== 'main' ? `${PHASES[seg.phase]}. ` : '';
    speak(`${phaseIntro}${ex.ar}`, ex.en);
  }
}
function finishWorkout() {
  clearInterval(P.timer);
  P.running = false;
  P.finished = true;
  releaseWake();
  const d = P.day;
  const minutes = Math.round(P.total / 60);
  const met = TYPE_INFO[d.type].met;
  const kcal = Math.round((met * 3.5 * bodyWeight() / 200) * minutes);
  const tk = todayKey();
  S.plan.completed[d.n] = tk;
  addActivity(tk, { type: d.type === 'rest' ? 'rest' : 'workout', day: d.n, kcal, min: minutes });
  save();
  const st = streakInfo();
  sfx.finish(); vibrate([100, 80, 100, 80, 300]);
  speak('أحسنت! انتهى التمرين', 'Great job! Workout complete');
  $('#player').classList.remove('is-rest');
  $('#plMain').hidden = true;
  $('#plPhase').textContent = 'اكتمل!';
  $('#plBar').style.width = '100%';
  const done = $('#plDone');
  done.hidden = false;
  done.innerHTML = `<div class="trophy">${icon('trophy')}</div>
    <h2>أحسنت! أنهيت اليوم ${d.n}</h2>
    <p>${d.n === 30 ? 'لقد أكملت تحدّي الـ 30 يوماً بالكامل! فخور بك 🎉' : 'خطوة جديدة نحو بطن مسطّح. نراك غداً!'}</p>
    <div class="stats-grid">
      <div class="stat"><div class="s-icon">${icon('clock')}</div><b class="num">${minutes}</b><span>دقيقة</span></div>
      <div class="stat fire"><div class="s-icon">${icon('flame')}</div><b class="num">~${kcal}</b><span>سعرة (تقديري)</span></div>
      <div class="stat blue"><div class="s-icon">${icon('bolt')}</div><b class="num">${st.cur}</b><span>يوم متتالي</span></div>
    </div>
    <button class="btn primary big block" style="max-width:420px" data-act="pl-done">${icon('check')} العودة للرئيسية</button>`;
}
function requestClosePlayer() {
  if (P.active && !P.finished && !confirm('إنهاء التمرين الحالي؟ لن يُحتسب هذا اليوم.')) return;
  closePlayer();
  overlay.close();
}
function closePlayer() {
  clearInterval(P.timer);
  P.running = false;
  P.active = false;
  releaseWake();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  $('#player').hidden = true;
  $('#plFigure').innerHTML = '';
  document.body.classList.remove('no-scroll');
  renderAll();
}

/* ---------- الصوت (Web Audio + Web Speech) ---------- */
let AC = null;
function initAudio() {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { AC = null; }
}
function tone(freq, dur, when = 0, type = 'sine', vol = 0.25, freqEnd = null) {
  if (!S.settings.sound || !AC) return;
  try {
    const t = AC.currentTime + when;
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(AC.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  } catch (e) { /* تجاهل */ }
}
function whistle(when, dur) {
  if (!S.settings.sound || !AC) return;
  try {
    const t = AC.currentTime + when;
    const o = AC.createOscillator(), lfo = AC.createOscillator(), lg = AC.createGain(), g = AC.createGain();
    o.type = 'square'; o.frequency.value = 2300;
    lfo.frequency.value = 28; lg.gain.value = 140;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
    g.gain.setValueAtTime(0.13, t + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(AC.destination);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  } catch (e) { /* تجاهل */ }
}
const sfx = {
  tick() { tone(880, 0.12, 0, 'square', 0.12); },
  start() { whistle(0, 0.18); whistle(0.24, 0.45); },
  rest() { tone(660, 0.22, 0, 'triangle', 0.28); tone(440, 0.4, 0.22, 'triangle', 0.28); },
  finish() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, i * 0.16, 'triangle', 0.28)); tone(1047, 0.8, 0.7, 'triangle', 0.22); }
};
let voices = [];
function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function speak(ar, en) {
  if (!S.settings.voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const arV = voices.find(v => /^ar/i.test(v.lang));
    const u = new SpeechSynthesisUtterance(arV || !en ? ar : en);
    if (arV) { u.voice = arV; u.lang = arV.lang; }
    else if (en) { const enV = voices.find(v => /^en/i.test(v.lang)); if (enV) u.voice = enV; u.lang = 'en-US'; }
    else u.lang = 'ar-SA';
    u.rate = 1;
    setTimeout(() => speechSynthesis.speak(u), S.settings.sound ? 650 : 0);
  } catch (e) { /* تجاهل */ }
}

/* ---------- إبقاء الشاشة مضاءة ---------- */
async function requestWake() {
  if (!S.settings.wakeLock || !('wakeLock' in navigator)) return;
  try { P.wake = await navigator.wakeLock.request('screen'); } catch (e) { P.wake = null; }
}
function releaseWake() { try { if (P.wake) P.wake.release(); } catch (e) { /* تجاهل */ } P.wake = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (P.active && !P.finished) requestWake();
    else if ($('#modal').hidden) renderView(currentView);
  }
});

/* ===================== صفحة التغذية ===================== */
const NUT = { tab: 'today', date: todayKey() };
const MEAL_UI = { tab: 'preset', type: defaultMealType(), mult: 1, filter: 'all', q: '' };

function renderNutrition() {
  const el = $('#view-nutrition');
  el.innerHTML = `<div class="seg">${segBtn('nut-tab', 'today', 'متتبّع اليوم', NUT.tab)}${segBtn('nut-tab', 'calc', 'الحاسبة', NUT.tab)}${segBtn('nut-tab', 'tips', 'نصائح', NUT.tab)}</div>
    ${NUT.tab === 'today' ? nutTodayHTML() : NUT.tab === 'calc' ? nutCalcHTML() : nutTipsHTML()}`;
}
function nutTodayHTML() {
  const k = NUT.date;
  const isToday = k === todayKey();
  const res = calcNutrition(S.profile);
  const tot = sumMeals(k);
  const meals = dayMeals(k);
  const water = S.water[k] || 0;
  const goal = +S.settings.waterGoal;

  let kcalCard;
  if (res) {
    const pct = (tot.kcal / res.target) * 100;
    const rem = res.target - tot.kcal;
    const pp = (tot.p / res.protein) * 100;
    kcalCard = `<div class="card">
      <div class="kcal-big">
        <div class="k-left"><b class="num ${rem < 0 ? 'up' : ''}">${Math.abs(rem)}</b><span> ${rem < 0 ? 'سعرة زيادة عن الهدف' : 'سعرة متبقية'}</span></div>
        <div class="k-right">المأكول <b class="num">${tot.kcal}</b><br>الهدف <b class="num">${res.target}</b></div>
      </div>
      <div class="bar ${pct > 100 ? 'over' : ''}"><i style="width:${clamp(pct, 0, 100)}%"></i></div>
      <div class="macro-line"><span>البروتين</span><span><b class="num">${round1(tot.p)}</b> / ${res.protein} غ</span></div>
      <div class="bar blue"><i style="width:${clamp(pp, 0, 100)}%"></i></div>
    </div>`;
  } else {
    kcalCard = `<div class="card"><div class="card-title"><h3>${icon('calc')} حدّد هدفك أولاً</h3></div>
      <p class="muted small" style="margin-bottom:12px">أدخل وزنك وطولك وعمرك في الحاسبة لنحسب سعراتك اليومية واحتياجك من البروتين. المأكول اليوم: <b class="num">${tot.kcal}</b> سعرة.</p>
      <button class="btn primary block" data-act="nut-tab" data-v="calc">فتح الحاسبة</button></div>`;
  }

  const groups = Object.entries(MEAL_TYPES).map(([t, name]) => {
    const items = meals.filter(m => m.type === t);
    if (!items.length) return '';
    const sum = items.reduce((a, m) => a + (+m.kcal || 0), 0);
    return `<div class="meal-group"><h4><span>${name}</span><span class="num">${sum} سعرة</span></h4>
      ${items.map(m => `<div class="meal-item"><div class="mi-txt"><b>${esc(m.name)}</b><span>بروتين ${round1(+m.protein || 0)} غ</span></div><span class="mi-k num">${m.kcal}</span>
      <button class="icon-btn" data-act="meal-del" data-id="${m.id}" aria-label="حذف">${icon('trash')}</button></div>`).join('')}</div>`;
  }).join('');

  const glasses = Array.from({ length: Math.max(goal, water) }, (_, i) => `<i class="glass ${i < water ? 'full' : ''} ${i >= goal ? 'extra' : ''}"></i>`).join('');

  return `<div class="date-nav">
      <button class="icon-btn" data-act="nut-date" data-d="-1" aria-label="اليوم السابق">${icon('chevR')}</button>
      <div class="d-label">${isToday ? 'اليوم' : fmtDate(k)}<small>${fmtDateLong(k)}</small></div>
      <button class="icon-btn" data-act="nut-date" data-d="1" ${isToday ? 'disabled' : ''} aria-label="اليوم التالي">${icon('chevL')}</button>
    </div>
    ${kcalCard}
    <div class="card">
      <div class="card-title"><h3>${icon('food')} وجبات ${isToday ? 'اليوم' : 'هذا اليوم'}</h3><button class="btn primary" style="padding:8px 12px" data-act="meal-open">${icon('plus')} إضافة</button></div>
      ${groups || `<div class="empty">لم تسجّل أي وجبة بعد.<br>اضغط «إضافة» واختر من الوجبات المقترحة أو أضف وجبتك.</div>`}
    </div>
    <div class="card">
      <div class="card-title"><h3>${icon('drop')} متتبّع الماء</h3><span class="muted small">الهدف ${goal} أكواب (${round1(goal * 0.25)} لتر)</span></div>
      <div class="glasses">${glasses}</div>
      <div class="water-ctrl">
        <button class="icon-btn" data-act="water" data-d="-1" data-date="${k}" aria-label="إنقاص كوب">${icon('minus')}</button>
        <div class="w-count"><b class="num">${water}</b><span>كوب (${round1(water * 0.25)} لتر)</span></div>
        <button class="icon-btn plus" data-act="water" data-d="1" data-date="${k}" aria-label="إضافة كوب">${icon('plus')}</button>
      </div>
    </div>`;
}
function nutCalcHTML() {
  const p = S.profile;
  const res = calcNutrition(p);
  const opt = (v, l, cur) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${l}</option>`;
  return `<form class="card form" data-form="profile">
      <div class="card-title"><h3>${icon('calc')} حاسبة السعرات (BMR & TDEE)</h3></div>
      <div class="row2">
        <label>الجنس<select name="sex">${opt('male', 'ذكر', p.sex)}${opt('female', 'أنثى', p.sex)}</select></label>
        <label>العمر (سنة)<input name="age" type="number" inputmode="numeric" min="14" max="90" value="${esc(p.age)}" required></label>
      </div>
      <div class="row2">
        <label>الطول (سم)<input name="height" type="number" inputmode="decimal" min="120" max="230" step="0.5" value="${esc(p.height)}" required></label>
        <label>الوزن (كغ)<input name="weight" type="number" inputmode="decimal" min="35" max="300" step="0.1" value="${esc(p.weight)}" required></label>
      </div>
      <label>مستوى النشاط<select name="activity">${ACTIVITY.map(a => opt(a.v, a.l, p.activity)).join('')}</select></label>
      <button class="btn primary block big" type="submit">${icon('calc')} احسب وحفظ</button>
    </form>
    ${res ? `<div class="card">
      <div class="card-title"><h3>${icon('target')} نتائجك</h3></div>
      <div class="res-grid">
        <div class="res hl"><span>السعرات اليومية لإنقاص الوزن (عجز آمن)</span><b class="num">${res.target}</b> <small>سعرة/يوم</small></div>
        <div class="res"><span>الأيض الأساسي BMR</span><b class="num">${res.bmr}</b> <small>سعرة</small></div>
        <div class="res"><span>الاحتياج اليومي TDEE</span><b class="num">${res.tdee}</b> <small>سعرة</small></div>
        <div class="res hl2"><span>البروتين اليومي</span><b class="num">${res.protein}</b> <small>غرام</small></div>
        <div class="res"><span>العجز اليومي</span><b class="num">${res.deficit}</b> <small>سعرة</small></div>
        <div class="res"><span>الدهون الصحية</span><b class="num">${res.fat}</b> <small>غرام</small></div>
        <div class="res"><span>الكربوهيدرات</span><b class="num">${res.carbs}</b> <small>غرام</small></div>
        <div class="res"><span>مؤشر كتلة الجسم</span><b class="num">${res.bmi}</b> <small>${bmiLabel(res.bmi)}</small></div>
        <div class="res"><span>نزول متوقّع</span><b class="num">~${res.weekly}</b> <small>كغ/أسبوع</small></div>
      </div>
      <div class="note">${icon('info')}<span>معادلة Mifflin-St Jeor. العجز = 20% من احتياجك بحد أقصى 500 سعرة، ولا ينزل الهدف عن ${p.sex === 'female' ? 1200 : 1500} سعرة. البروتين 1.6 غ/كغ (يُحسب على وزن مرجعي عند ارتفاع مؤشر الكتلة). الماء المقترح ≈ ${res.water} لتر يومياً. هذه تقديرات؛ استشر طبيباً إن كانت لديك حالة صحية.</span></div>
    </div>` : ''}`;
}
function nutTipsHTML() {
  return `<div class="card tip-card" style="margin-bottom:14px"><div class="t-icon">${icon('book')}</div><div><h4>دليل تقليل دهون البطن</h4><p>نصائح عملية مختصرة. اضغط على أي نصيحة لعرض التفاصيل.</p></div></div>
    <div class="tips-list">${TIPS.map((t, i) => `<details ${i === 0 ? 'open' : ''}><summary><span class="n num">${i + 1}</span>${t.t}</summary><p>${t.d}</p></details>`).join('')}</div>`;
}
function mealModalHTML() {
  const typeSel = `<div class="meal-opts">
      <label>أضِف إلى<select data-meal="type">${Object.entries(MEAL_TYPES).map(([v, l]) => `<option value="${v}" ${v === MEAL_UI.type ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>الكمية<select data-meal="mult">${[0.5, 1, 1.5, 2].map(m => `<option value="${m}" ${m === MEAL_UI.mult ? 'selected' : ''}>× ${m}</option>`).join('')}</select></label>
    </div>`;
  let body = '';
  if (MEAL_UI.tab === 'preset') {
    body = `<div class="search">${icon('search')}<input type="search" placeholder="ابحث عن وجبة..." data-meal="q" value="${esc(MEAL_UI.q)}"></div>
      <div class="filters">${[['all', 'الكل'], ...Object.entries(MEAL_TYPES)].map(([v, l]) => `<span class="chip ${MEAL_UI.filter === v ? 'active' : ''}" data-act="meal-filter" data-v="${v}">${l}</span>`).join('')}</div>
      <div id="presetList">${presetListHTML()}</div>`;
  } else if (MEAL_UI.tab === 'custom') {
    body = `<form class="form" data-form="custom-meal">
      <label>اسم الوجبة<input name="name" required maxlength="60" placeholder="مثال: سندويش دجاج"></label>
      <div class="row2">
        <label>السعرات<input name="kcal" type="number" inputmode="numeric" min="0" max="5000" required></label>
        <label>البروتين (غ)<input name="protein" type="number" inputmode="decimal" min="0" max="300" step="0.5" placeholder="اختياري"></label>
      </div>
      <label class="check-row"><input type="checkbox" name="fav" checked> احفظها في «وجباتي» لاستخدامها لاحقاً</label>
      <button class="btn primary block big" type="submit">${icon('plus')} إضافة الوجبة</button>
    </form>`;
  } else {
    body = S.customMeals.length
      ? S.customMeals.map((m, i) => `<div class="meal-item add"><div class="mi-txt"><b>${esc(m.name)}</b><span>${m.kcal} سعرة • بروتين ${round1(+m.protein || 0)} غ</span></div>
        <button class="icon-btn" style="background:transparent;color:var(--muted);border:1px solid var(--line)" data-act="my-del" data-i="${i}" aria-label="حذف">${icon('trash')}</button>
        <button class="icon-btn" data-act="my-add" data-i="${i}" aria-label="إضافة">${icon('plus')}</button></div>`).join('')
      : '<div class="empty">لا توجد وجبات محفوظة بعد. أضِف وجبة مخصّصة وفعّل خيار الحفظ.</div>';
  }
  return `<div class="sheet-title"><h2>إضافة وجبة</h2><p>${NUT.date === todayKey() ? 'إلى سجل اليوم' : 'إلى سجل ' + fmtDate(NUT.date)}</p></div>
    <div class="seg">${segBtn('meal-tab', 'preset', 'مقترحة', MEAL_UI.tab)}${segBtn('meal-tab', 'custom', 'مخصّصة', MEAL_UI.tab)}${segBtn('meal-tab', 'mine', 'وجباتي', MEAL_UI.tab)}</div>
    ${MEAL_UI.tab !== 'custom' ? typeSel : `<div class="meal-opts" style="grid-template-columns:1fr">${typeSel.match(/<label>أضِف إلى[\s\S]*?<\/label>/)[0]}</div>`}
    ${body}`;
}
function presetListHTML() {
  const q = MEAL_UI.q.trim();
  const list = PRESET_MEALS.map((m, i) => ({ ...m, i }))
    .filter(m => MEAL_UI.filter === 'all' || m.t === MEAL_UI.filter)
    .filter(m => !q || m.name.includes(q) || m.portion.includes(q));
  if (!list.length) return '<div class="empty">لا توجد نتائج. جرّب الإضافة المخصّصة.</div>';
  return list.map(m => `<div class="meal-item add"><div class="mi-txt"><b>${m.name}</b><span>${m.portion} • بروتين ${round1(m.p * MEAL_UI.mult)} غ</span></div>
    <span class="mi-k num">${Math.round(m.kcal * MEAL_UI.mult)}</span>
    <button class="icon-btn" data-act="preset-add" data-i="${m.i}" aria-label="إضافة">${icon('plus')}</button></div>`).join('');
}
function addMeal({ name, kcal, protein, type, mult = 1 }) {
  const k = NUT.date;
  if (!S.meals[k]) S.meals[k] = [];
  S.meals[k].push({ id: uid(), name, kcal: Math.round(kcal * mult), protein: round1((+protein || 0) * mult), type: type || MEAL_UI.type });
  save();
  vibrate(20);
  toast(`تمت إضافة «${name}» ✓`);
  renderView(currentView);
}

/* ===================== صفحة التقدم ===================== */
const CAL = { y: new Date().getFullYear(), m: new Date().getMonth() };
let chartObj = null;

function renderProgress() {
  const el = $('#view-progress');
  const st = streakInfo();
  const doneCount = Object.keys(S.plan.completed).length;
  const totalKcal = Object.values(S.activity).reduce((a, x) => a + (x.kcal || 0), 0);
  const ms = sortedMeasurements();
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat fire"><div class="s-icon">${icon('flame')}</div><b class="num">${st.cur}</b><span>أيام متتالية (Streak)</span></div>
      <div class="stat"><div class="s-icon">${icon('trophy')}</div><b class="num">${st.best}</b><span>أفضل سلسلة</span></div>
      <div class="stat blue"><div class="s-icon">${icon('check')}</div><b class="num">${doneCount}/30</b><span>أيام الخطة المنجزة</span></div>
      <div class="stat violet"><div class="s-icon">${icon('bolt')}</div><b class="num">${totalKcal}</b><span>سعرة محروقة (تقديري)</span></div>
    </div>
    <div class="card">${calendarHTML()}</div>
    <form class="card form" data-form="measure">
      <div class="card-title"><h3>${icon('tape')} تسجيل القياسات الأسبوعية</h3></div>
      <label>التاريخ<input type="date" name="date" value="${todayKey()}" max="${todayKey()}" required></label>
      <div class="row2">
        <label>الوزن (كغ)<input name="weight" type="number" inputmode="decimal" min="30" max="300" step="0.1" placeholder="مثال: 82.5"></label>
        <label>محيط البطن (سم)<input name="waist" type="number" inputmode="decimal" min="40" max="250" step="0.5" placeholder="مثال: 96"></label>
      </div>
      <button class="btn primary block" type="submit">${icon('plus')} حفظ القياس</button>
      <div class="note">${icon('info')}<span>قِس محيط البطن عند مستوى السرّة، صباحاً قبل الأكل، والشريط موازٍ للأرض دون شدّ.</span></div>
    </form>
    <div class="card">
      <div class="card-title"><h3>${icon('scale')} تطوّر الوزن ومحيط البطن</h3></div>
      ${summaryHTML(ms)}
      <div class="chart-box" id="chartBox"><canvas id="progChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title"><h3>${icon('list')} سجل القياسات</h3><span class="muted small">${ms.length} قياس</span></div>
      ${ms.length ? [...ms].reverse().map(m => `<div class="hist-row"><span class="h-date">${fmtDate(m.date)} <span class="muted small">${parseKey(m.date).getFullYear()}</span></span>
        <span class="h-val num">${m.weight ? m.weight + ' كغ' : '—'}</span><span class="h-val num">${m.waist ? m.waist + ' سم' : '—'}</span>
        <button class="icon-btn" data-act="m-del" data-date="${m.date}" aria-label="حذف">${icon('trash')}</button></div>`).join('') : '<div class="empty">لا توجد قياسات بعد.</div>'}
    </div>`;
  drawChart(ms);
}
function summaryHTML(ms) {
  const ws = ms.filter(m => m.weight), wa = ms.filter(m => m.waist);
  if (!ws.length && !wa.length) return '';
  const diff = (arr, key) => arr.length > 1 ? round1(arr[arr.length - 1][key] - arr[0][key]) : 0;
  const dW = diff(ws, 'weight'), dWa = diff(wa, 'waist');
  const cls = v => v > 0 ? 'up' : v < 0 ? 'down' : '';
  const sign = v => `<bdi dir="ltr">${v > 0 ? '+' + v : String(v)}</bdi>`;
  let whtr = '';
  const h = +S.profile.height;
  if (h && wa.length) {
    const r = round1((wa[wa.length - 1].waist / h) * 100) / 100;
    const lbl = r < 0.5 ? ['ممتاز – ضمن النطاق الصحي', 'down'] : r < 0.6 ? ['مرتفع – استمر بالخطة', 'up'] : ['مرتفع جداً – الأولوية لخفض الدهون', 'up'];
    whtr = `<div class="whtr">${icon('tape')}<div style="flex:1">نسبة الخصر للطول <span class="muted small">(الهدف أقل من 0.5)</span><br><span class="${lbl[1]} small">${lbl[0]}</span></div><b class="num">${r.toFixed(2)}</b></div>`;
  }
  return `<div class="summary-row">
      <div class="res"><span>الوزن الحالي</span><b class="num">${ws.length ? ws[ws.length - 1].weight : '—'}</b></div>
      <div class="res"><span>تغيّر الوزن</span><b class="num ${cls(dW)}">${ws.length > 1 ? sign(dW) + ' كغ' : '—'}</b></div>
      <div class="res"><span>تغيّر البطن</span><b class="num ${cls(dWa)}">${wa.length > 1 ? sign(dWa) + ' سم' : '—'}</b></div>
    </div>${whtr}`;
}
function drawChart(ms) {
  const box = $('#chartBox');
  if (!box) return;
  if (chartObj) { chartObj.destroy(); chartObj = null; }
  if (!ms.length) { box.innerHTML = '<div class="empty">سجّل أول قياس ليظهر الرسم البياني هنا 📈</div>'; box.style.height = 'auto'; return; }
  if (!window.Chart) { box.innerHTML = '<div class="empty">تعذّر تحميل مكتبة الرسوم البيانية. افتح التطبيق مرة واحدة مع اتصال بالإنترنت ليتم حفظها للعمل دون اتصال.</div>'; box.style.height = 'auto'; return; }
  const ctx = $('#progChart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 250);
  grad.addColorStop(0, 'rgba(182,255,59,.28)');
  grad.addColorStop(1, 'rgba(182,255,59,0)');
  Chart.defaults.font.family = 'Cairo, system-ui, sans-serif';
  Chart.defaults.color = '#8b98a9';
  chartObj = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ms.map(m => fmtDate(m.date)),
      datasets: [
        { label: 'الوزن (كغ)', data: ms.map(m => m.weight ? +m.weight : null), borderColor: '#b6ff3b', backgroundColor: grad, fill: true, tension: 0.35, yAxisID: 'y', spanGaps: true, pointRadius: 4, pointBackgroundColor: '#b6ff3b', borderWidth: 3 },
        { label: 'محيط البطن (سم)', data: ms.map(m => m.waist ? +m.waist : null), borderColor: '#38d6ff', backgroundColor: 'transparent', tension: 0.35, yAxisID: 'y1', spanGaps: true, pointRadius: 4, pointBackgroundColor: '#38d6ff', borderWidth: 3, borderDash: [6, 4] }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { rtl: true, labels: { color: '#c9d3df', usePointStyle: true, boxWidth: 8 } },
        tooltip: { rtl: true, backgroundColor: '#1a2330', borderColor: 'rgba(255,255,255,.12)', borderWidth: 1, padding: 10 }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' } },
        y: { position: 'left', grid: { color: 'rgba(255,255,255,.05)' }, title: { display: true, text: 'كغ' } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'سم' } }
      }
    }
  });
}
function calendarHTML() {
  const { y, m } = CAL;
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const offset = (first.getDay() + 1) % 7;
  const tk = todayKey();
  const now = new Date();
  const isCurMonth = y === now.getFullYear() && m === now.getMonth();
  let cells = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map(d => `<div class="dh">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += '<div></div>';
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`;
    const a = S.activity[k];
    let cls = '';
    if (a) cls = a.types.includes('workout') ? 'w' : 'r';
    if (k === tk) cls += ' today';
    if (k > tk) cls += ' future';
    cells += `<div class="cal-cell ${cls}">${d}</div>`;
  }
  return `<div class="cal-head">
      <button class="icon-btn" data-act="cal" data-d="-1" aria-label="الشهر السابق">${icon('chevR')}</button>
      <b>${icon('calendar')} ${AR_MONTHS[m]} ${y}</b>
      <button class="icon-btn" data-act="cal" data-d="1" ${isCurMonth ? 'disabled' : ''} aria-label="الشهر التالي">${icon('chevL')}</button>
    </div>
    <div class="cal-grid">${cells}</div>
    <div class="cal-legend"><span><i style="background:var(--accent)"></i>يوم تمرين</span><span><i style="background:var(--violet)"></i>يوم راحة</span><span><i style="box-shadow:inset 0 0 0 2px var(--blue)"></i>اليوم</span></div>`;
}

/* ===================== الإعدادات ===================== */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; renderAll(); });
window.addEventListener('appinstalled', () => { deferredPrompt = null; toast('تم تثبيت التطبيق ✓'); renderAll(); });
function updateInstallUI() { const b = $('#installTop'); if (b) b.hidden = !deferredPrompt; }

function renderSettings() {
  const el = $('#view-settings');
  const sw = (key, title, sub) => `<label class="set-row"><div class="sr-txt"><b>${title}</b><span>${sub}</span></div>
    <span class="switch"><input type="checkbox" data-set="${key}" ${S.settings[key] ? 'checked' : ''}><i></i></span></label>`;
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  el.innerHTML = `
    <div class="card">
      <div class="card-title"><h3>${icon('volume')} الصوت والتنبيهات</h3></div>
      ${sw('sound', 'صافرات البداية والنهاية', 'تنبيهات صوتية وعدّ تنازلي (Web Audio)')}
      ${sw('voice', 'نطق اسم التمرين', 'قراءة اسم التمرين صوتياً (Web Speech)')}
      ${sw('vibrate', 'الاهتزاز', 'اهتزاز عند تغيير التمرين')}
      ${sw('wakeLock', 'إبقاء الشاشة مضاءة', 'أثناء التمرين فقط')}
      <div class="set-row"><div class="sr-txt"><b>هدف الماء اليومي</b><span>عدد الأكواب (250 مل)</span></div>
        <select data-set="waterGoal">${[8, 9, 10].map(v => `<option value="${v}" ${+S.settings.waterGoal === v ? 'selected' : ''}>${v} أكواب</option>`).join('')}</select></div>
      <button class="btn block" style="margin-top:10px" data-act="test-voice">${icon('volume')} تجربة الصوت</button>
    </div>
    <div class="card">
      <div class="card-title"><h3>${icon('download')} النسخ الاحتياطي</h3></div>
      <p class="muted small" style="margin-bottom:12px">كل بياناتك محفوظة على هاتفك فقط. صدّر نسخة احتياطية (JSON) بانتظام لتجنّب فقدانها عند مسح بيانات المتصفح أو تغيير الهاتف.</p>
      <div class="btn-col">
        <button class="btn primary" data-act="export">${icon('download')} تصدير البيانات (JSON)</button>
        <button class="btn" data-act="import">${icon('upload')} استيراد نسخة احتياطية</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><h3>${icon('phone')} تثبيت التطبيق</h3></div>
      ${standalone ? `<p class="muted small">${icon('check')} التطبيق مثبّت ويعمل كتطبيق مستقل.</p>`
        : deferredPrompt ? `<button class="btn primary block" data-act="install">${icon('download')} تثبيت على الهاتف</button>`
        : '<p class="muted small">من متصفح Chrome اضغط على القائمة ⋮ ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p>'}
    </div>
    <div class="card">
      <div class="card-title"><h3>${icon('refresh')} إعادة الضبط</h3></div>
      <div class="btn-col">
        <button class="btn" data-act="reset-plan">${icon('refresh')} إعادة بدء خطة الـ 30 يوماً</button>
        <button class="btn danger" data-act="reset-all">${icon('trash')} حذف جميع البيانات</button>
      </div>
    </div>
    <div class="card about">
      <div class="card-title"><h3>${icon('info')} حول التطبيق</h3><span class="muted small">الإصدار 1.0</span></div>
      <p>لياقتي 30: خطة منزلية للمبتدئين بدون معدات، 30 دقيقة يومياً، لحرق الدهون وشدّ البطن. يعمل بالكامل دون إنترنت بعد أول تشغيل.</p>
      <p>⚠️ هذا التطبيق للإرشاد العام ولا يغني عن استشارة الطبيب. توقّف فوراً عند الشعور بألم في الصدر أو دوار، واستشر طبيبك قبل البدء إن كانت لديك أمراض قلب أو ضغط أو سكري أو إصابات.</p>
    </div>`;
}
function exportData() {
  const blob = new Blob([JSON.stringify({ app: 'fit30', exportedAt: new Date().toISOString(), data: S }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fit30-backup-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('تم تصدير النسخة الاحتياطية ✓');
}
function importData(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const parsed = JSON.parse(r.result);
      const data = parsed && parsed.data ? parsed.data : parsed;
      if (!data || typeof data !== 'object' || !('plan' in data || 'meals' in data || 'measurements' in data)) throw new Error('bad');
      if (!confirm('سيتم استبدال بياناتك الحالية بالنسخة المستوردة. متابعة؟')) return;
      S = mergeState(data);
      save();
      toast('تم استيراد البيانات بنجاح ✓');
      renderAll();
    } catch (e) { toast('الملف غير صالح أو تالف'); }
  };
  r.readAsText(file);
}

/* ===================== الأحداث ===================== */
const ACTIONS = {
  nav: t => showView(t.dataset.view),
  'go-calc': () => { NUT.tab = 'calc'; showView('nutrition'); },
  'start-day': t => startWorkout(+t.dataset.day),
  'open-day': t => openModal(dayModalHTML(+t.dataset.day)),
  'open-ex': t => openModal(exModalHTML(t.dataset.id, t.dataset.day ? +t.dataset.day : null)),
  'modal-close': () => closeModal(),
  'mark-rest': t => { closeModal(); markRestDone(+t.dataset.day); },
  'plan-tab': t => { PLAN_UI.tab = t.dataset.v; renderPlan(); },
  'nut-tab': t => { NUT.tab = t.dataset.v; renderNutrition(); },
  'nut-date': t => { const nd = addDays(NUT.date, +t.dataset.d); if (nd > todayKey()) return; NUT.date = nd; renderNutrition(); },
  water: t => changeWater(+t.dataset.d, t.dataset.date || todayKey()),
  'meal-open': () => { MEAL_UI.type = NUT.date === todayKey() ? defaultMealType() : MEAL_UI.type; MEAL_UI.q = ''; openModal(mealModalHTML()); },
  'meal-tab': t => { MEAL_UI.tab = t.dataset.v; openModal(mealModalHTML()); },
  'meal-filter': t => { MEAL_UI.filter = t.dataset.v; openModal(mealModalHTML()); },
  'preset-add': t => { const m = PRESET_MEALS[+t.dataset.i]; addMeal({ name: m.name, kcal: m.kcal, protein: m.p, mult: MEAL_UI.mult }); },
  'my-add': t => { const m = S.customMeals[+t.dataset.i]; if (m) addMeal({ name: m.name, kcal: m.kcal, protein: m.protein, mult: MEAL_UI.mult }); },
  'my-del': t => { S.customMeals.splice(+t.dataset.i, 1); save(); openModal(mealModalHTML()); },
  'meal-del': t => {
    const list = S.meals[NUT.date] || [];
    S.meals[NUT.date] = list.filter(m => m.id !== t.dataset.id);
    if (!S.meals[NUT.date].length) delete S.meals[NUT.date];
    save(); renderNutrition();
  },
  'm-del': t => {
    if (!confirm('حذف هذا القياس؟')) return;
    S.measurements = S.measurements.filter(m => m.date !== t.dataset.date);
    save(); renderProgress();
  },
  cal: t => {
    let m = CAL.m + +t.dataset.d, y = CAL.y;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    CAL.m = m; CAL.y = y; renderProgress();
  },
  export: exportData,
  import: () => $('#importFile').click(),
  'reset-plan': () => { if (confirm('إعادة بدء الخطة من اليوم 1؟ (سجل الالتزام والقياسات يبقى محفوظاً)')) { S.plan.completed = {}; save(); toast('تمت إعادة بدء الخطة'); renderAll(); } },
  'reset-all': () => { if (confirm('حذف جميع البيانات نهائياً؟ ننصح بتصدير نسخة احتياطية أولاً.') && confirm('تأكيد أخير: حذف كل شيء؟')) { S = DEFAULT_STATE(); save(); toast('تم حذف جميع البيانات'); renderAll(); } },
  install: async () => {
    if (!deferredPrompt) { toast('من قائمة Chrome ⋮ اختر «تثبيت التطبيق»'); return; }
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) { /* تجاهل */ }
    deferredPrompt = null;
    renderAll();
  },
  'test-voice': () => { initAudio(); sfx.start(); speak('القرفصاء بوزن الجسم', 'Bodyweight Squat'); },
  'pl-play': () => { initAudio(); P.running ? pause() : play(); },
  'pl-next': () => nextSeg(false),
  'pl-prev': () => prevSeg(),
  'pl-restart': () => restartSeg(),
  'pl-close': () => requestClosePlayer(),
  'pl-how': () => { const h = $('#plHow'); h.hidden = !h.hidden; if (!h.hidden) h.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
  'pl-sound': () => {
    const on = !(S.settings.sound || S.settings.voice);
    S.settings.sound = on; S.settings.voice = on; save(); updateSoundBtn();
    if (!on && 'speechSynthesis' in window) speechSynthesis.cancel();
    toast(on ? 'الصوت مفعّل' : 'الصوت متوقف');
  },
  'pl-done': () => { closePlayer(); overlay.close(); showView('home'); }
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const fn = ACTIONS[t.dataset.act];
  if (fn) { e.preventDefault(); fn(t, e); }
});

document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(f).entries());
  const kind = f.dataset.form;
  if (kind === 'profile') {
    S.profile = { sex: fd.sex, age: +fd.age, height: +fd.height, weight: +fd.weight, activity: +fd.activity };
    save(); toast('تم الحساب والحفظ ✓'); renderNutrition();
  } else if (kind === 'custom-meal') {
    const name = (fd.name || '').trim();
    const kcal = +fd.kcal;
    if (!name || !(kcal >= 0)) { toast('أدخل اسم الوجبة والسعرات'); return; }
    const protein = +fd.protein || 0;
    if (fd.fav && !S.customMeals.some(m => m.name === name && +m.kcal === kcal)) S.customMeals.push({ name, kcal, protein });
    addMeal({ name, kcal, protein });
    f.reset();
  } else if (kind === 'measure') {
    const w = fd.weight ? round1(+fd.weight) : null;
    const wa = fd.waist ? round1(+fd.waist) : null;
    if (!w && !wa) { toast('أدخل الوزن أو محيط البطن'); return; }
    const date = fd.date || todayKey();
    const existing = S.measurements.find(m => m.date === date);
    if (existing) { if (w) existing.weight = w; if (wa) existing.waist = wa; }
    else S.measurements.push({ date, weight: w, waist: wa });
    const latestW = sortedMeasurements().filter(m => m.weight).pop();
    if (latestW) S.profile.weight = latestW.weight;
    save(); vibrate(30); toast('تم حفظ القياس ✓'); renderProgress();
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.set) {
    S.settings[t.dataset.set] = t.type === 'checkbox' ? t.checked : +t.value;
    save();
    if (t.dataset.set === 'waterGoal') toast(`هدف الماء: ${t.value} أكواب`);
  } else if (t.dataset.meal === 'type') {
    MEAL_UI.type = t.value;
  } else if (t.dataset.meal === 'mult') {
    MEAL_UI.mult = +t.value;
    const pl = $('#presetList'); if (pl) pl.innerHTML = presetListHTML();
  } else if (t.id === 'importFile' && t.files && t.files[0]) {
    importData(t.files[0]);
    t.value = '';
  }
});
document.addEventListener('input', e => {
  if (e.target.dataset.meal === 'q') {
    MEAL_UI.q = e.target.value;
    const pl = $('#presetList'); if (pl) pl.innerHTML = presetListHTML();
  }
});

/* ===================== التشغيل ===================== */
function init() {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  showView('home');
  updateInstallUI();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
init();
