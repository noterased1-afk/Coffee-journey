/* ==========================================================================
   Coffee Journey — app logic (vanilla JS, no build step)
   ========================================================================== */
(() => {
  'use strict';

  /* ===== Constants ===== */

  const STORAGE_KEY = 'coffeeJourney.v1';
  const DATA_VERSION = 2;

  const ROAST_LEVELS = ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark'];
  const DEFAULT_TAGS = ['산미', '자스민', '시트러스', '베리', '초콜릿', '견과류', '카라멜', '꿀', '플로럴', '스톤프루트', '홍차', '흑설탕'];
  const TASTE_ITEMS = [
    { key: 'acidity', label: '산미', en: 'Acidity' },
    { key: 'sweetness', label: '단맛', en: 'Sweetness' },
    { key: 'body', label: '바디감', en: 'Body' },
    { key: 'bitterness', label: '쓴맛', en: 'Bitterness' },
    { key: 'aftertaste', label: '후미', en: 'Aftertaste' }
  ];
  const RATERS = [
    { id: 'dog', emoji: '🐶', label: '강쥐' },
    { id: 'chick', emoji: '🐥', label: '공쥬' }
  ];
  // Taste items use a 5-point scale in 0.5 steps; the overall score uses 10 points in 0.1 steps.
  const TASTE_SCALE = { max: 5, step: 0.5 };
  const OVERALL_SCALE = { max: 10, step: 0.1 };

  // Lucide-style inline icons (24x24, stroke based)
  const ICONS = {
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>'
  };

  /* ===== Utils ===== */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function icon(name) {
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  function escapeHTML(value) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, (ch) => map[ch]);
  }

  function uid(prefix = 'r') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  function toNum(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const pad = (n) => String(n).padStart(2, '0');

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function isISODate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function isTimestamp(value) {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value));
  }

  function formatDate(iso) {
    if (!isISODate(iso)) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const day = '일월화수목금토'[new Date(y, m - 1, d).getDay()];
    return `${y}.${pad(m)}.${pad(d)} (${day})`;
  }

  function formatNumber(n, digits = 0) {
    return n.toLocaleString('ko-KR', { maximumFractionDigits: digits });
  }

  function formatWon(n, digits = 0) {
    return n === null || n === undefined ? '-' : `${formatNumber(n, digits)}원`;
  }

  function formatScore(n) {
    return n === null || n === undefined ? '-' : (Math.round(n * 10) / 10).toFixed(1);
  }

  function calcPricePerGram(price, grams) {
    if (price === null || !grams) return null;
    return Math.round((price / grams) * 10) / 10;
  }

  // Averages only the scores that were actually given (blank scores are null).
  function average(values) {
    const nums = values.filter((v) => typeof v === 'number');
    return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : null;
  }

  function avgOverall(record) {
    return average(RATERS.map(({ id }) => record.ratings[id].overall));
  }

  function uniqueTags(list) {
    return Array.from(new Set(list.filter((t) => typeof t === 'string').map((t) => t.trim()).filter(Boolean)));
  }

  let toastTimer = null;
  function toast(message, type = '') {
    const el = $('#toast');
    el.textContent = message;
    el.className = `toast show ${type}`.trim();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 2400);
  }

  /* ===== Storage ===== */

  function emptyData() {
    return { version: DATA_VERSION, customTags: [], records: [], wishlist: [] };
  }

  function scoreOrNull(value, scale) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return clamp(Number((Math.round(n / scale.step) * scale.step).toFixed(1)), 0, scale.max);
  }

  function blankRatings() {
    return normalizeRatings(null);
  }

  function normalizeRatings(src) {
    const out = {};
    RATERS.forEach(({ id }) => {
      const r = (src && typeof src[id] === 'object' && src[id]) || {};
      const entry = {};
      TASTE_ITEMS.forEach(({ key }) => { entry[key] = scoreOrNull(r[key], TASTE_SCALE); });
      entry.overall = scoreOrNull(r.overall, OVERALL_SCALE);
      out[id] = entry;
    });
    return out;
  }

  const str = (v) => (typeof v === 'string' ? v.trim() : '');

  function normalizeRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = str(raw.name);
    if (!name) return null;

    const now = new Date().toISOString();
    const createdAt = isTimestamp(raw.createdAt) ? raw.createdAt : now;
    const grams = toNum(raw.grams);
    const price = toNum(raw.price);

    return {
      id: str(raw.id) || uid(),
      createdAt,
      updatedAt: isTimestamp(raw.updatedAt) ? raw.updatedAt : createdAt,
      date: isISODate(raw.date) ? raw.date : '',
      name,
      roastery: str(raw.roastery),
      origin: str(raw.origin),
      variety: str(raw.variety),
      roastLevel: ROAST_LEVELS.includes(raw.roastLevel) ? raw.roastLevel : '',
      decaf: raw.decaf === true,
      grams,
      price,
      pricePerGram: calcPricePerGram(price, grams),
      flavorTags: Array.isArray(raw.flavorTags) ? uniqueTags(raw.flavorTags) : [],
      ratings: normalizeRatings(raw.ratings),
      memo: str(raw.memo),
      notes: str(raw.notes)
    };
  }

  function normalizeWish(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = str(raw.name);
    if (!name) return null;

    const now = new Date().toISOString();
    const createdAt = isTimestamp(raw.createdAt) ? raw.createdAt : now;
    const grams = toNum(raw.grams);
    const price = toNum(raw.price);

    return {
      id: str(raw.id) || uid('w'),
      createdAt,
      updatedAt: isTimestamp(raw.updatedAt) ? raw.updatedAt : createdAt,
      name,
      roastery: str(raw.roastery),
      decaf: raw.decaf === true,
      grams,
      price,
      pricePerGram: calcPricePerGram(price, grams),
      notes: str(raw.notes)
    };
  }

  // Accepts the stored/exported shape ({ records, wishlist, customTags }) or a bare array of records.
  function normalizeData(raw) {
    const src = Array.isArray(raw) ? { records: raw } : raw;
    if (!src || typeof src !== 'object' || !Array.isArray(src.records)) return null;
    return {
      version: DATA_VERSION,
      customTags: Array.isArray(src.customTags)
        ? uniqueTags(src.customTags).filter((t) => !DEFAULT_TAGS.includes(t))
        : [],
      records: src.records.map(normalizeRecord).filter(Boolean),
      wishlist: Array.isArray(src.wishlist) ? src.wishlist.map(normalizeWish).filter(Boolean) : []
    };
  }

  function addMissing(target, items) {
    const ids = new Set(target.map((item) => item.id));
    const missing = items.filter((item) => !ids.has(item.id));
    target.push(...missing);
    return missing.length;
  }

  function migrate(raw) {
    const version = raw && !Array.isArray(raw) && Number(raw.version) ? Number(raw.version) : 1;
    const data = normalizeData(raw);
    if (!data || version >= DATA_VERSION) return data;

    // v1 -> v2: drop the demo records (ids `sample_*`) and add the seed journal + wishlist.
    data.records = data.records.filter((r) => !r.id.startsWith('sample_'));
    const used = new Set(data.records.flatMap((r) => r.flavorTags));
    data.customTags = data.customTags.filter((t) => t !== '블랙커런트' || used.has(t));
    const seed = seedData();
    addMissing(data.records, seed.records);
    addMissing(data.wishlist, seed.wishlist);
    data.customTags = uniqueTags([...data.customTags, ...seed.customTags]);
    return data;
  }

  // The couple's existing tasting notes, used as the starting data.
  function seedData() {
    const base = Date.parse('2026-10-23T00:00:00.000Z');
    // Listed newest-first; createdAt descends so "최신순" keeps this order.
    const at = (i) => new Date(base - i * 60000).toISOString();
    const scores = (chick, dog) => ({ chick: { overall: chick }, dog: { overall: dog } });

    const records = [
      {
        name: '쓰리 아프리카스', roastery: '블루보틀', roastLevel: 'Medium', grams: 250, price: 22500,
        memo: '과일의 향미, 밝은 뉘앙스, 깊은 단맛', flavorTags: ['과일향', '밝은 뉘앙스', '단맛'],
        ratings: scores(8.7, 8.5)
      },
      {
        name: '베란다 블렌드', roastery: '스타벅스', roastLevel: 'Medium-Light', grams: 250, price: 18000,
        memo: '밀크초콜릿, 균형잡힌 맛', flavorTags: ['밀크초콜릿', '균형감'],
        ratings: scores(7.5, 7.8)
      },
      {
        name: "과테말라 우에우에테낭고 '윅속'", roastery: '히치커피', roastLevel: 'Medium-Dark', grams: 500, price: 22000,
        memo: '오렌지필 같은 산미가 강함', notes: '크리미한 느낌의 견과류 (캐슈넛, 마카다미아)',
        flavorTags: ['오렌지필', '산미', '크리미', '견과류', '캐슈넛', '마카다미아'],
        ratings: scores(6.5, 6.5)
      },
      {
        name: '코스타리카 라 펠라 케냐', roastery: '모모스커피', roastLevel: 'Light', grams: 200, price: 17000,
        memo: '쥬시하고 균형잡힌 기분좋은 산미', flavorTags: ['쥬시', '균형감', '산미'],
        ratings: scores(7.2, 7.9)
      },
      {
        name: '별다방 블렌드', roastery: '스타벅스', roastLevel: 'Medium', grams: 250, price: 20000,
        memo: '구수, 바디감 있고 그 외 별다른 특색은 잘 모르겠음', flavorTags: ['구수함', '바디감'],
        ratings: scores(6.3, 5.5)
      },
      {
        name: '빈투바 블렌드', roastery: '향초', origin: '과테말라 100%', roastLevel: 'Medium-Dark', grams: 400, price: 20000,
        notes: '🐥 공쥬: hot으로 마시면 7점',
        ratings: scores(6, 5.8)
      },
      {
        name: '부쿠 아벨 내추럴', roastery: '향초', origin: '에티오피아 100%', roastLevel: 'Medium-Dark', grams: 400, price: 24000,
        memo: '꽃향같은 산미, 긴 여운, 나쁘지 않은 바디감', flavorTags: ['꽃향', '산미', '긴 여운', '바디감'],
        ratings: scores(8.2, 8.1)
      },
      {
        name: '코스타리카 따라주 산타 테레사 내추럴', roastery: '블루보틀', grams: 250
      },
      {
        name: '디카페인 하우스블렌드', roastery: '스타벅스', roastLevel: 'Medium-Dark', decaf: true, grams: 250, price: 20000,
        memo: '탄 맛이 너무 강함', notes: '로스팅: 미디엄(다크)', flavorTags: ['탄맛'],
        ratings: scores(4, 3.5)
      },
      {
        name: '디카페인 블렌드', roastery: '히치커피', roastLevel: 'Medium-Dark', decaf: true, grams: 500, price: 21000,
        memo: '별다방 블렌드의 디카페인 버전',
        ratings: scores(5, 6.1)
      },
      {
        name: '디카페인 꿈결 블렌드', roastery: '향초', roastLevel: 'Medium-Dark', decaf: true, grams: 200, price: 11000,
        memo: '산미 전혀 없는 부드러운 코코아맛',
        notes: '아이스보단 핫(레귤러)으로, 존재감있는 디저트랑\n🐥 공쥬: hot으로 마시면 6.5점',
        flavorTags: ['코코아', '부드러움'],
        ratings: scores(5.5, null)
      }
    ].map((r, i) => normalizeRecord({ ...r, id: `seed_${pad(i + 1)}`, createdAt: at(i) }));

    const wishlist = [
      {
        id: 'seed_wish_01',
        createdAt: at(0),
        name: '벨벳 화이트',
        roastery: '빈브라더스',
        grams: 200,
        price: 18000,
        notes: "블루보틀 '쓰리 아프리카스'의 가장 강력한 대항마입니다. 자스민 같은 꽃 향과 자몽, 오렌지의 시트러스한 산미가 일품입니다.\n쓰리 아프리카스처럼 화사한 에티오피아 계열의 블렌딩"
      }
    ].map(normalizeWish);

    const customTags = uniqueTags(records.flatMap((r) => r.flavorTags)).filter((t) => !DEFAULT_TAGS.includes(t));
    return { customTags, records, wishlist };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      return true;
    } catch (err) {
      toast('저장에 실패했어요. 저장 공간을 확인해 주세요', 'error');
      return false;
    }
  }

  function load() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      // Storage blocked (e.g. some private modes): run with the seed data in memory only.
      state.data = { ...emptyData(), ...seedData() };
      toast('이 브라우저에서는 데이터가 저장되지 않아요', 'error');
      return;
    }

    if (raw === null) {
      // First visit only: start with the seed journal.
      state.data = { ...emptyData(), ...seedData() };
      save();
      return;
    }

    try {
      const data = migrate(JSON.parse(raw));
      if (!data) throw new Error('Invalid data shape');
      state.data = data;
      save();
    } catch (err) {
      try { localStorage.setItem(`${STORAGE_KEY}.corrupt`, raw); } catch (e) { /* ignore */ }
      state.data = emptyData();
      save();
      toast('저장된 데이터를 읽지 못해 백업 후 새로 시작해요', 'error');
    }
  }

  /* ===== State ===== */

  const state = {
    data: emptyData(),
    view: 'list',
    query: '',
    sort: 'latest',
    filters: { roastery: '', caffeine: '', roast: '' },
    filterOpen: false,
    editingId: null,
    formReady: false,
    formTags: new Set(),
    pendingImport: null
  };

  const views = {};

  function findRecord(id) {
    return state.data.records.find((r) => r.id === id) || null;
  }

  function findWish(id) {
    return state.data.wishlist.find((w) => w.id === id) || null;
  }

  function activeFilterCount() {
    return Object.values(state.filters).filter(Boolean).length;
  }

  function matchesFilters(r) {
    const f = state.filters;
    if (f.roastery && r.roastery !== f.roastery) return false;
    if (f.caffeine && r.decaf !== (f.caffeine === 'decaf')) return false;
    if (f.roast && r.roastLevel !== (f.roast === 'none' ? '' : f.roast)) return false;
    return true;
  }

  function getVisibleRecords() {
    const q = state.query.trim().toLowerCase();
    // Dated records first (newest date on top), then by creation time.
    const byLatest = (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    const byRating = (a, b) => {
      const sa = avgOverall(a);
      const sb = avgOverall(b);
      if (sa === null || sb === null) return (sa === null) - (sb === null) || byLatest(a, b);
      return sb - sa || byLatest(a, b);
    };
    const list = state.data.records.filter((r) =>
      (!q || r.name.toLowerCase().includes(q) || r.roastery.toLowerCase().includes(q)) && matchesFilters(r));
    return list.sort(state.sort === 'rating' ? byRating : byLatest);
  }

  /* ===== Render: list ===== */

  function initListView() {
    views.list.innerHTML = `
      <div class="list-toolbar">
        <div class="search-box">
          ${icon('search')}
          <input type="search" id="search-input" placeholder="원두 이름이나 로스터리 검색" autocomplete="off" enterkeyhint="search" aria-label="원두 이름 검색">
          <button type="button" class="icon-btn search-clear" data-action="clear-search" aria-label="검색어 지우기" hidden>${icon('x')}</button>
        </div>
        <div class="list-meta">
          <p class="list-count" id="list-count"></p>
          <div class="list-controls">
            <button type="button" class="filter-toggle" data-action="toggle-filter" aria-expanded="false" aria-controls="filter-panel">
              ${icon('filter')} 필터<span class="filter-badge" id="filter-badge" hidden></span>
            </button>
            <div class="segmented" role="group" aria-label="정렬">
              <button type="button" data-action="sort" data-sort="latest">최신순</button>
              <button type="button" data-action="sort" data-sort="rating">평점순</button>
            </div>
          </div>
        </div>
        <div class="filter-panel card" id="filter-panel" hidden>
          <div class="filter-group">
            <p class="filter-label">브랜드</p>
            <div class="chip-group" id="filter-roastery"></div>
          </div>
          <div class="filter-group">
            <p class="filter-label">종류</p>
            <div class="chip-group" id="filter-caffeine"></div>
          </div>
          <div class="filter-group">
            <p class="filter-label">로스팅 정도</p>
            <div class="chip-group" id="filter-roast"></div>
          </div>
          <button type="button" class="btn btn-ghost btn-block" data-action="reset-filters">${icon('rotate')} 필터 초기화</button>
        </div>
      </div>
      <div class="record-list" id="record-list"></div>`;
  }

  function emptyHTML(emoji, title, desc, buttonHTML = '') {
    return `
      <div class="empty">
        <div class="empty-emoji" aria-hidden="true">${emoji}</div>
        <p class="empty-title">${title}</p>
        <p>${desc}</p>
        ${buttonHTML}
      </div>`;
  }

  function cardHTML(r, i) {
    const tags = r.flavorTags.slice(0, 3);
    const score = formatScore(avgOverall(r));
    return `
      <article class="card record-card" role="button" tabindex="0" data-action="open-detail" data-id="${escapeHTML(r.id)}" style="--i:${Math.min(i, 10)}">
        <div class="card-top">
          ${r.date ? `<span>${formatDate(r.date)}</span>` : ''}
          ${r.roastLevel ? `<span class="badge">${r.roastLevel}</span>` : ''}
          ${r.decaf ? '<span class="badge badge-decaf">디카페인</span>' : ''}
        </div>
        <div class="card-main">
          <div>
            <h3 class="card-title">${escapeHTML(r.name)}</h3>
            ${r.roastery ? `<p class="card-roastery">${escapeHTML(r.roastery)}</p>` : ''}
          </div>
          <div class="score-badge${score === '-' ? ' is-empty' : ''}" aria-label="종합 점수 ${score === '-' ? '없음' : `${score}점`}"><strong>${score}</strong><span>/ 10</span></div>
        </div>
        <div class="card-raters">
          ${RATERS.map((rt) => `<span>${rt.emoji} ${formatScore(r.ratings[rt.id].overall)}</span>`).join('')}
        </div>
        ${tags.length ? `<div class="tag-row">${tags.map((t) => `<span class="tag">#${escapeHTML(t)}</span>`).join('')}</div>` : ''}
      </article>`;
  }

  function filterChipHTML(group, value, label) {
    const on = state.filters[group] === value;
    return `<button type="button" class="chip chip-sm${on ? ' selected' : ''}" data-action="filter" data-group="${group}" data-value="${escapeHTML(value)}" aria-pressed="${on}">${escapeHTML(label)}</button>`;
  }

  function renderFilters() {
    const f = state.filters;
    const brands = uniqueTags(state.data.records.map((r) => r.roastery)).sort((a, b) => a.localeCompare(b, 'ko'));
    if (f.roastery && !brands.includes(f.roastery)) brands.push(f.roastery);

    $('#filter-roastery').innerHTML = brands.length
      ? brands.map((b) => filterChipHTML('roastery', b, b)).join('')
      : '<p class="muted">브랜드를 입력한 기록이 없어요</p>';
    $('#filter-caffeine').innerHTML = filterChipHTML('caffeine', 'caffeine', '☕ 카페인') + filterChipHTML('caffeine', 'decaf', '🌙 디카페인');
    $('#filter-roast').innerHTML = ROAST_LEVELS.map((l) => filterChipHTML('roast', l, l)).join('') + filterChipHTML('roast', 'none', '미지정');

    const count = activeFilterCount();
    const toggle = $('[data-action="toggle-filter"]', views.list);
    toggle.classList.toggle('has-active', count > 0);
    toggle.setAttribute('aria-expanded', String(state.filterOpen));
    $('#filter-badge').hidden = !count;
    $('#filter-badge').textContent = count;
    $('#filter-panel').hidden = !state.filterOpen;
  }

  function renderList() {
    const total = state.data.records.length;
    const list = getVisibleRecords();
    const narrowed = Boolean(state.query.trim()) || activeFilterCount() > 0;

    $('#list-count').innerHTML = narrowed
      ? `<strong>${list.length}</strong> / ${total}개`
      : `총 <strong>${total}</strong>개의 기록`;
    $$('[data-sort]', views.list).forEach((btn) => {
      const on = btn.dataset.sort === state.sort;
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    $('[data-action="clear-search"]', views.list).hidden = !state.query;
    renderFilters();

    const box = $('#record-list');
    if (!total) {
      box.innerHTML = emptyHTML('☕', '아직 기록이 없어요', '오늘 마신 커피의 첫 기록을 남겨보세요',
        `<button type="button" class="btn btn-primary" data-action="go-form">${icon('plus')} 첫 기록 남기기</button>`);
    } else if (!list.length) {
      box.innerHTML = emptyHTML('🔍', '조건에 맞는 기록이 없어요', '검색어나 필터를 바꿔보세요',
        activeFilterCount() ? `<button type="button" class="btn btn-ghost" data-action="reset-filters">${icon('rotate')} 필터 초기화</button>` : '');
    } else {
      box.innerHTML = list.map(cardHTML).join('');
    }
  }

  /* ===== Render: form ===== */

  function sliderHTML(raterId, key, label, en, value, scale, isOverall) {
    const id = `r-${raterId}-${key}`;
    const empty = value === null;
    return `
      <div class="slider-row${isOverall ? ' overall' : ''}${empty ? ' is-empty' : ''}">
        <div class="slider-head">
          <label class="slider-name" for="${id}">${label}${en ? ` <small>${en}</small>` : ''}</label>
          <div class="slider-side">
            <button type="button" class="slider-clear" data-action="clear-score" data-target="${id}" aria-label="${label} 점수 비우기">비우기</button>
            <output class="slider-value" for="${id}" id="${id}-out"></output>
          </div>
        </div>
        <input class="range${isOverall ? ' range-overall' : ''}" type="range" id="${id}" data-rater="${raterId}" data-key="${key}" min="0" max="${scale.max}" step="${scale.step}" value="${empty ? scale.max / 2 : value}">
      </div>`;
  }

  function updateRange(input) {
    const row = input.closest('.slider-row');
    const empty = row.classList.contains('is-empty');
    const value = Number(input.value);
    const max = Number(input.max);
    input.style.setProperty('--fill', empty ? '0%' : `${(value / max) * 100}%`);
    const out = document.getElementById(`${input.id}-out`);
    if (out) out.innerHTML = empty ? `–<small> / ${max}</small>` : `${value.toFixed(1)}<small> / ${max}</small>`;
  }

  function setScoreEmpty(input, empty) {
    const row = input.closest('.slider-row');
    row.classList.toggle('is-empty', empty);
    if (empty) input.value = Number(input.max) / 2;
    updateRange(input);
  }

  function renderForm(record) {
    const v = record || {
      name: '', roastery: '', origin: '', variety: '', roastLevel: '', decaf: false,
      grams: null, price: null, date: todayISO(), flavorTags: [],
      ratings: blankRatings(), memo: '', notes: ''
    };
    const numValue = (n) => (n === null ? '' : String(n));
    state.formTags = new Set(v.flavorTags);

    views.form.innerHTML = `
      <form id="record-form" novalidate autocomplete="off">
        <div class="form-head"><h2>${record ? '기록 수정 ✏️' : '새 기록 작성 ✍️'}</h2></div>

        <section class="card section">
          <h3 class="section-title">🫘 원두 정보</h3>
          <div class="field">
            <label class="field-label" for="f-name">원두 이름 <span class="required">*</span></label>
            <input class="input" id="f-name" type="text" maxlength="60" placeholder="예) 에티오피아 예가체프 G1" value="${escapeHTML(v.name)}" aria-required="true" aria-describedby="f-name-error">
            <p class="field-error" id="f-name-error" hidden>원두 이름을 입력해 주세요</p>
          </div>
          <div class="field">
            <label class="field-label" for="f-roastery">로스터리 (브랜드)</label>
            <input class="input" id="f-roastery" type="text" maxlength="40" placeholder="예) 블루보틀" value="${escapeHTML(v.roastery)}">
          </div>
          <div class="field field-row">
            <div>
              <label class="field-label" for="f-origin">원산지</label>
              <input class="input" id="f-origin" type="text" maxlength="40" placeholder="예) 에티오피아" value="${escapeHTML(v.origin)}">
            </div>
            <div>
              <label class="field-label" for="f-variety">품종</label>
              <input class="input" id="f-variety" type="text" maxlength="40" placeholder="예) 게이샤" value="${escapeHTML(v.variety)}">
            </div>
          </div>
          <div class="field">
            <span class="field-label" id="roast-label">로스팅 포인트</span>
            <div class="chip-group" role="group" aria-labelledby="roast-label">
              ${ROAST_LEVELS.map((level) => {
                const on = level === v.roastLevel;
                return `<button type="button" class="chip${on ? ' selected' : ''}" data-action="roast" data-value="${level}" aria-pressed="${on}">${level}</button>`;
              }).join('')}
            </div>
          </div>
          <div class="field">
            <span class="field-label" id="caffeine-label">카페인 구분</span>
            ${caffeineToggleHTML(v.decaf, 'caffeine-label')}
          </div>
          <div class="field field-row">
            <div>
              <label class="field-label" for="f-grams">총 용량</label>
              <div class="input-unit">
                <input class="input" id="f-grams" type="number" inputmode="decimal" min="0" step="any" placeholder="200" value="${numValue(v.grams)}">
                <span>g</span>
              </div>
            </div>
            <div>
              <label class="field-label" for="f-price">총 가격</label>
              <div class="input-unit">
                <input class="input" id="f-price" type="number" inputmode="numeric" min="0" step="1" placeholder="18000" value="${numValue(v.price)}">
                <span>원</span>
              </div>
            </div>
          </div>
          <div class="field">
            <div class="ppg-box"><span>그램 당 가격</span><strong id="f-ppg">-</strong></div>
          </div>
          <div class="field">
            <label class="field-label" for="f-date">시음 일자</label>
            <input class="input" id="f-date" type="date" value="${escapeHTML(v.date)}">
          </div>
        </section>

        <section class="card section">
          <h3 class="section-title">🌸 플레이버 노트 <span class="section-sub" id="tag-count"></span></h3>
          <div class="chip-group" id="tag-chips"></div>
          <div class="tag-add">
            <input class="input" id="f-new-tag" type="text" maxlength="15" placeholder="직접 추가 (예: 블랙커런트)" enterkeyhint="done" aria-label="플레이버 태그 직접 추가">
            <button type="button" class="btn btn-ghost" data-action="add-tag">${icon('plus')} 추가</button>
          </div>
        </section>

        <section class="card section">
          <h3 class="section-title">⭐ 맛 평가</h3>
          <div class="segmented rater-switch" role="tablist" aria-label="평가자">
            ${RATERS.map((rt) => `<button type="button" role="tab" data-action="rater" data-rater="${rt.id}">${rt.emoji} ${rt.label}</button>`).join('')}
          </div>
          <p class="muted form-hint">슬라이더를 움직이면 점수가 기록돼요. 손대지 않은 항목은 빈칸으로 저장돼요.</p>
          ${RATERS.map((rt) => `
            <div class="rater-panel" data-panel="${rt.id}" role="tabpanel" aria-label="${rt.label} 평가">
              ${TASTE_ITEMS.map((item) => sliderHTML(rt.id, item.key, item.label, item.en, v.ratings[rt.id][item.key], TASTE_SCALE, false)).join('')}
              ${sliderHTML(rt.id, 'overall', `${rt.emoji} 종합 점수`, '', v.ratings[rt.id].overall, OVERALL_SCALE, true)}
            </div>`).join('')}
        </section>

        <section class="card section">
          <h3 class="section-title">📝 메모</h3>
          <div class="field">
            <label class="field-label" for="f-memo">한 줄 메모</label>
            <input class="input" id="f-memo" type="text" maxlength="80" placeholder="예) 아침에 마시기 좋은 산뜻한 커피" value="${escapeHTML(v.memo)}">
          </div>
          <div class="field">
            <label class="field-label" for="f-notes">상세 테이스팅 소감</label>
            <textarea class="textarea" id="f-notes" maxlength="2000" placeholder="향, 맛의 변화, 추출 레시피 등을 자유롭게 적어보세요">${escapeHTML(v.notes)}</textarea>
          </div>
        </section>

        <div class="form-actions${record ? '' : ' single'}">
          ${record ? '<button type="button" class="btn btn-ghost" data-action="cancel-edit">취소</button>' : ''}
          <button type="submit" class="btn btn-primary">${icon('check')} ${record ? '수정 완료' : '기록 저장'}</button>
        </div>
      </form>`;

    renderTagChips();
    setActiveRater('dog');
    updatePricePerGram('f');
    $$('.range', views.form).forEach(updateRange);
  }

  function caffeineToggleHTML(decaf, labelledBy) {
    return `
      <div class="segmented" role="group" aria-labelledby="${labelledBy}">
        <button type="button" class="${decaf ? '' : 'selected'}" data-action="decaf" data-value="false" aria-pressed="${!decaf}">☕ 카페인</button>
        <button type="button" class="${decaf ? 'selected' : ''}" data-action="decaf" data-value="true" aria-pressed="${decaf}">🌙 디카페인</button>
      </div>`;
  }

  function selectSegment(el) {
    $$('button', el.parentElement).forEach((btn) => {
      const on = btn === el;
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  function renderTagChips() {
    const all = uniqueTags([...DEFAULT_TAGS, ...state.data.customTags, ...state.formTags]);
    $('#tag-chips').innerHTML = all.map((tag) => {
      const on = state.formTags.has(tag);
      return `<button type="button" class="chip${on ? ' selected' : ''}" data-action="tag" data-tag="${escapeHTML(tag)}" aria-pressed="${on}">#${escapeHTML(tag)}</button>`;
    }).join('');
    updateTagCount();
  }

  function updateTagCount() {
    $('#tag-count').textContent = state.formTags.size ? `${state.formTags.size}개 선택` : '';
  }

  function setActiveRater(raterId) {
    $$('[data-action="rater"]', views.form).forEach((btn) => {
      const on = btn.dataset.rater === raterId;
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-selected', String(on));
    });
    $$('.rater-panel', views.form).forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.panel === raterId);
    });
  }

  // prefix: 'f' for the record form, 'w' for the wishlist form.
  function updatePricePerGram(prefix) {
    const ppg = calcPricePerGram(toNum($(`#${prefix}-price`).value), toNum($(`#${prefix}-grams`).value));
    $(`#${prefix}-ppg`).textContent = ppg === null ? '-' : formatWon(ppg, 1);
  }

  function setFieldError(inputId, show) {
    const input = document.getElementById(inputId);
    input.classList.toggle('invalid', show);
    input.setAttribute('aria-invalid', String(show));
    document.getElementById(`${inputId}-error`).hidden = !show;
  }

  function requireName(inputId) {
    const input = document.getElementById(inputId);
    const name = input.value.trim();
    if (!name) {
      setFieldError(inputId, true);
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
      input.focus({ preventScroll: true });
      toast('원두 이름은 꼭 입력해 주세요', 'error');
    }
    return name;
  }

  function addCustomTag() {
    const input = $('#f-new-tag');
    const tag = input.value.trim().replace(/^#+/, '').replace(/\s+/g, ' ');
    if (!tag) {
      input.focus();
      return;
    }
    const known = DEFAULT_TAGS.includes(tag) || state.data.customTags.includes(tag);
    if (!known) {
      state.data.customTags.push(tag);
      save();
    }
    state.formTags.add(tag);
    renderTagChips();
    input.value = '';
    toast(known ? `#${tag} 태그를 선택했어요` : `#${tag} 태그를 추가했어요`);
  }

  function openForm(id) {
    const record = id ? findRecord(id) : null;
    state.editingId = record ? record.id : null;
    renderForm(record);
    state.formReady = !record;
  }

  function submitForm() {
    const form = $('#record-form');
    const name = requireName('f-name');
    if (!name) return;

    const ratings = {};
    RATERS.forEach(({ id }) => {
      ratings[id] = {};
      $$(`.range[data-rater="${id}"]`, form).forEach((input) => {
        const empty = input.closest('.slider-row').classList.contains('is-empty');
        ratings[id][input.dataset.key] = empty ? null : Number(input.value);
      });
    });

    const existing = state.editingId ? findRecord(state.editingId) : null;
    const roastBtn = $('[data-action="roast"].selected', form);
    const decafBtn = $('[data-action="decaf"].selected', form);
    const now = new Date().toISOString();

    const record = normalizeRecord({
      id: existing ? existing.id : uid(),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      date: $('#f-date').value,
      name,
      roastery: $('#f-roastery').value,
      origin: $('#f-origin').value,
      variety: $('#f-variety').value,
      roastLevel: roastBtn ? roastBtn.dataset.value : '',
      decaf: decafBtn ? decafBtn.dataset.value === 'true' : false,
      grams: toNum($('#f-grams').value),
      price: toNum($('#f-price').value),
      flavorTags: [...state.formTags],
      ratings,
      memo: $('#f-memo').value,
      notes: $('#f-notes').value
    });

    if (existing) {
      const index = state.data.records.findIndex((r) => r.id === existing.id);
      state.data.records[index] = record;
    } else {
      state.data.records.unshift(record);
    }

    if (save()) toast(existing ? '기록을 수정했어요 ✨' : '새 기록을 저장했어요 ☕');
    state.editingId = null;
    state.formReady = false;
    state.query = '';
    $('#search-input').value = '';
    navigate('list');
  }

  /* ===== Render: detail sheet ===== */

  function compareRowsHTML(rows) {
    return rows.map(({ label, values, max }) => `
      <div class="compare-row">
        <p class="compare-label">${label}</p>
        ${RATERS.map((rt) => {
          const value = values[rt.id];
          const width = value === null ? 0 : (value / max) * 100;
          return `
            <div class="bar-line">
              <span aria-hidden="true">${rt.emoji}</span>
              <div class="bar" role="img" aria-label="${rt.label} ${value === null ? '점수 없음' : `${formatScore(value)}점`}"><div class="bar-fill ${rt.id}" style="--w:${width}%"></div></div>
              <span class="val">${formatScore(value)}</span>
            </div>`;
        }).join('')}
      </div>`).join('');
  }

  function legendHTML() {
    return `<div class="compare-legend">${RATERS.map((rt) => `<span><i class="legend-dot ${rt.id}"></i>${rt.label}</span>`).join('')}</div>`;
  }

  function tasteRowsFor(getValue) {
    return TASTE_ITEMS.map((item) => ({
      label: `${item.label} <small class="muted">${item.en}</small>`,
      max: TASTE_SCALE.max,
      values: Object.fromEntries(RATERS.map((rt) => [rt.id, getValue(rt.id, item.key)]))
    }));
  }

  function hasAnyValue(rows) {
    return rows.some((row) => RATERS.some((rt) => row.values[rt.id] !== null));
  }

  function renderDetail(id) {
    const r = findRecord(id);
    if (!r) return;

    const info = [
      ['로스터리', r.roastery],
      ['원산지', r.origin],
      ['품종', r.variety],
      ['로스팅 포인트', r.roastLevel],
      ['카페인', r.decaf ? '디카페인 🌙' : '카페인 ☕'],
      ['총 용량', r.grams === null ? '' : `${formatNumber(r.grams, 1)}g`],
      ['총 가격', r.price === null ? '' : formatWon(r.price)],
      ['그램 당 가격', r.pricePerGram === null ? '' : formatWon(r.pricePerGram, 1)]
    ];
    const tasteRows = tasteRowsFor((rater, key) => r.ratings[rater][key]);

    openSheet(`
      <div class="detail-head">
        <div class="card-top">
          ${r.date ? `<span>${formatDate(r.date)}</span>` : ''}
          ${r.decaf ? '<span class="badge badge-decaf">디카페인</span>' : ''}
        </div>
        <h2 class="detail-title" id="sheet-title">${escapeHTML(r.name)}</h2>
      </div>

      <div class="score-hero">
        <div class="score-tile main">
          <p class="score-tile-label">종합 평균</p>
          <p class="score-tile-value">${formatScore(avgOverall(r))}<small> / 10</small></p>
        </div>
        ${RATERS.map((rt) => `
          <div class="score-tile">
            <p class="score-tile-label">${rt.emoji} ${rt.label}</p>
            <p class="score-tile-value">${formatScore(r.ratings[rt.id].overall)}</p>
          </div>`).join('')}
      </div>

      ${r.memo ? `<p class="memo-quote section">“${escapeHTML(r.memo)}”</p>` : ''}

      <section class="card section">
        <h3 class="section-title">🫘 원두 정보</h3>
        <dl class="info-grid">
          ${info.map(([label, value]) => `
            <div class="info-item"><dt>${label}</dt><dd>${value ? escapeHTML(value) : '-'}</dd></div>`).join('')}
        </dl>
      </section>

      ${r.flavorTags.length ? `
        <section class="card section">
          <h3 class="section-title">🌸 플레이버 노트</h3>
          <div class="tag-row">${r.flavorTags.map((t) => `<span class="tag">#${escapeHTML(t)}</span>`).join('')}</div>
        </section>` : ''}

      <section class="card section">
        <h3 class="section-title">⭐ 맛 평가 ${hasAnyValue(tasteRows) ? legendHTML() : ''}</h3>
        ${hasAnyValue(tasteRows) ? compareRowsHTML(tasteRows) : '<p class="muted">아직 맛 항목 평가가 없어요</p>'}
      </section>

      ${r.notes ? `
        <section class="card section">
          <h3 class="section-title">📝 테이스팅 소감</h3>
          <p class="notes-text">${escapeHTML(r.notes)}</p>
        </section>` : ''}

      <div class="sheet-actions">
        <button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHTML(r.id)}">${icon('trash')} 삭제</button>
        <button type="button" class="btn btn-primary" data-action="edit" data-id="${escapeHTML(r.id)}">${icon('pencil')} 수정</button>
      </div>`);
  }

  /* ===== Render: wishlist ===== */

  function wishCardHTML(w, i) {
    const price = [
      w.grams === null ? '' : `${formatNumber(w.grams, 1)}g`,
      w.price === null ? '' : formatWon(w.price),
      w.pricePerGram === null ? '' : `<strong>${formatNumber(w.pricePerGram, 1)}원/g</strong>`
    ].filter(Boolean);
    return `
      <article class="card record-card wish-card" role="button" tabindex="0" data-action="edit-wish" data-id="${escapeHTML(w.id)}" style="--i:${Math.min(i, 10)}">
        <div class="card-top">
          ${w.decaf ? '<span class="badge badge-decaf">디카페인</span>' : '<span class="badge">카페인</span>'}
        </div>
        <h3 class="card-title">${escapeHTML(w.name)}</h3>
        ${w.roastery ? `<p class="card-roastery">${escapeHTML(w.roastery)}</p>` : ''}
        ${price.length ? `<p class="wish-price">${price.join(' · ')}</p>` : ''}
        ${w.notes ? `<p class="wish-notes">${escapeHTML(w.notes)}</p>` : ''}
      </article>`;
  }

  function renderWish() {
    const list = [...state.data.wishlist].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    views.wish.innerHTML = `
      <div class="wish-head">
        <div>
          <h2 class="wish-title">위시리스트 🤍</h2>
          <p class="list-count">궁금한 원두 <strong>${list.length}</strong>개</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-action="add-wish">${icon('plus')} 담기</button>
      </div>
      <div class="record-list">
        ${list.length
          ? list.map(wishCardHTML).join('')
          : emptyHTML('🤍', '궁금한 원두를 담아두세요', '다음에 마셔보고 싶은 원두를 기록해 두면 잊지 않아요')}
      </div>`;
  }

  function openWishForm(id) {
    const w = id ? findWish(id) : null;
    const v = w || { name: '', roastery: '', decaf: false, grams: null, price: null, notes: '' };
    const numValue = (n) => (n === null ? '' : String(n));

    openSheet(`
      <div class="detail-head"><h2 class="detail-title" id="sheet-title">${w ? '위시 수정' : '궁금한 원두 담기'} 🤍</h2></div>
      <form id="wish-form" novalidate autocomplete="off" data-id="${w ? escapeHTML(w.id) : ''}">
        <section class="card section">
          <div class="field">
            <label class="field-label" for="w-name">원두 이름 <span class="required">*</span></label>
            <input class="input" id="w-name" type="text" maxlength="60" placeholder="예) 벨벳 화이트" value="${escapeHTML(v.name)}" aria-required="true" aria-describedby="w-name-error">
            <p class="field-error" id="w-name-error" hidden>원두 이름을 입력해 주세요</p>
          </div>
          <div class="field">
            <label class="field-label" for="w-roastery">브랜드 (로스터리)</label>
            <input class="input" id="w-roastery" type="text" maxlength="40" placeholder="예) 빈브라더스" value="${escapeHTML(v.roastery)}">
          </div>
          <div class="field">
            <span class="field-label" id="w-caffeine-label">종류</span>
            ${caffeineToggleHTML(v.decaf, 'w-caffeine-label')}
          </div>
          <div class="field field-row">
            <div>
              <label class="field-label" for="w-grams">용량</label>
              <div class="input-unit">
                <input class="input" id="w-grams" type="number" inputmode="decimal" min="0" step="any" placeholder="200" value="${numValue(v.grams)}">
                <span>g</span>
              </div>
            </div>
            <div>
              <label class="field-label" for="w-price">가격</label>
              <div class="input-unit">
                <input class="input" id="w-price" type="number" inputmode="numeric" min="0" step="1" placeholder="18000" value="${numValue(v.price)}">
                <span>원</span>
              </div>
            </div>
          </div>
          <div class="field">
            <div class="ppg-box"><span>그램 당 가격</span><strong id="w-ppg">-</strong></div>
          </div>
          <div class="field">
            <label class="field-label" for="w-notes">메모 (특징, 궁금한 점)</label>
            <textarea class="textarea" id="w-notes" maxlength="1000" placeholder="예) 자스민 같은 꽃 향, 시트러스한 산미">${escapeHTML(v.notes)}</textarea>
          </div>
        </section>
        <div class="sheet-actions${w ? '' : ' single'}">
          ${w ? `<button type="button" class="btn btn-danger" data-action="delete-wish" data-id="${escapeHTML(w.id)}">${icon('trash')} 삭제</button>` : ''}
          <button type="submit" class="btn btn-primary">${icon('check')} 저장</button>
        </div>
      </form>`);
    updatePricePerGram('w');
  }

  function submitWish(form) {
    const name = requireName('w-name');
    if (!name) return;

    const existing = form.dataset.id ? findWish(form.dataset.id) : null;
    const decafBtn = $('[data-action="decaf"].selected', form);
    const now = new Date().toISOString();
    const item = normalizeWish({
      id: existing ? existing.id : uid('w'),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      name,
      roastery: $('#w-roastery').value,
      decaf: decafBtn ? decafBtn.dataset.value === 'true' : false,
      grams: toNum($('#w-grams').value),
      price: toNum($('#w-price').value),
      notes: $('#w-notes').value
    });

    if (existing) {
      const index = state.data.wishlist.findIndex((w) => w.id === existing.id);
      state.data.wishlist[index] = item;
    } else {
      state.data.wishlist.unshift(item);
    }
    if (save()) toast(existing ? '위시를 수정했어요 ✨' : '위시리스트에 담았어요 🤍');
    closeSheet();
    renderWish();
  }

  function deleteWish(id) {
    const w = findWish(id);
    if (!w || !confirm(`'${w.name}'을(를) 위시리스트에서 삭제할까요?`)) return;
    state.data.wishlist = state.data.wishlist.filter((item) => item.id !== id);
    save();
    closeSheet();
    renderWish();
    toast('위시를 삭제했어요');
  }

  /* ===== Render: stats ===== */

  function rankRowsHTML(rows) {
    const max = Math.max(...rows.map((r) => r.count), 1);
    return rows.map(({ name, count }) => `
      <div class="rank-row">
        <span class="name">${escapeHTML(name)}</span>
        <div class="bar"><div class="bar-fill primary" style="--w:${(count / max) * 100}%"></div></div>
        <span class="val">${count}</span>
      </div>`).join('');
  }

  function renderStats() {
    const records = state.data.records;
    const total = records.length;
    const overallAvg = average(records.map(avgOverall));
    const raterAvg = Object.fromEntries(RATERS.map((rt) => [rt.id, average(records.map((r) => r.ratings[rt.id].overall))]));
    const ppgAvg = average(records.map((r) => r.pricePerGram));

    const tagCounts = new Map();
    records.forEach((r) => r.flavorTags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const roastRows = [...ROAST_LEVELS, '']
      .map((level) => ({ name: level || '미지정', count: records.filter((r) => r.roastLevel === level).length }))
      .filter((row) => row.count > 0);

    const tasteRows = tasteRowsFor((rater, key) => average(records.map((r) => r.ratings[rater][key])));
    const noData = '<p class="muted">기록이 쌓이면 여기에 통계가 보여요 ☕</p>';

    views.stats.innerHTML = `
      <div class="stat-tiles">
        <div class="card stat-tile">
          <p class="stat-tile-label">총 기록</p>
          <p class="stat-tile-value">${total}<small> 개</small></p>
        </div>
        <div class="card stat-tile">
          <p class="stat-tile-label">평균 종합 점수</p>
          <p class="stat-tile-value">${formatScore(overallAvg)}<small> / 10</small></p>
        </div>
        ${RATERS.map((rt) => `
          <div class="card stat-tile">
            <p class="stat-tile-label">${rt.emoji} ${rt.label} 평균</p>
            <p class="stat-tile-value">${formatScore(raterAvg[rt.id])}</p>
          </div>`).join('')}
        <div class="card stat-tile full">
          <p class="stat-tile-label">평균 그램 당 가격</p>
          <p class="stat-tile-value">${ppgAvg === null ? '-' : formatNumber(ppgAvg, 1)}<small> 원/g</small></p>
        </div>
      </div>

      <section class="card section">
        <h3 class="section-title">👅 맛 프로필 평균 ${hasAnyValue(tasteRows) ? legendHTML() : ''}</h3>
        ${hasAnyValue(tasteRows) ? compareRowsHTML(tasteRows) : '<p class="muted">맛 항목을 평가하면 여기에 평균이 보여요</p>'}
      </section>

      <section class="card section">
        <h3 class="section-title">🌸 자주 느낀 플레이버 Top 5</h3>
        ${topTags.length ? rankRowsHTML(topTags) : noData}
      </section>

      <section class="card section">
        <h3 class="section-title">🔥 로스팅 포인트 분포</h3>
        ${roastRows.length ? rankRowsHTML(roastRows) : noData}
      </section>

      <section class="card section">
        <h3 class="section-title">💾 데이터 관리</h3>
        <p class="muted" style="margin-bottom:12px">데이터는 이 브라우저에만 저장돼요. 기기를 바꾸거나 방문 기록을 지우기 전에 내보내기로 백업해 주세요.</p>
        <div class="data-actions">
          <button type="button" class="btn btn-primary" data-action="export">${icon('download')} 내보내기</button>
          <button type="button" class="btn btn-secondary" data-action="import">${icon('upload')} 불러오기</button>
          <button type="button" class="btn btn-ghost full" data-action="restore-seed">${icon('rotate')} 기본 기록 다시 넣기</button>
          <button type="button" class="btn btn-danger full" data-action="reset">${icon('trash')} 전체 데이터 초기화</button>
        </div>
      </section>

      <p class="app-footer">Coffee Journey ☕ · 🐶 & 🐥의 커피 여행</p>`;
  }

  /* ===== Sheet ===== */

  let lastFocus = null;
  let sheetTimer = null;

  function openSheet(html) {
    const backdrop = $('#sheet');
    const sheet = $('.sheet', backdrop);
    clearTimeout(sheetTimer);
    $('#sheet-body').innerHTML = html;
    if (backdrop.hidden) lastFocus = document.activeElement;
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    sheet.scrollTop = 0;
    // Two frames so the closed state is painted before the transition starts.
    requestAnimationFrame(() => requestAnimationFrame(() => backdrop.classList.add('open')));
    sheet.focus({ preventScroll: true });
  }

  function closeSheet() {
    const backdrop = $('#sheet');
    if (backdrop.hidden) return;
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    state.pendingImport = null;
    sheetTimer = setTimeout(() => {
      backdrop.hidden = true;
      $('#sheet-body').innerHTML = '';
    }, 300);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  /* ===== Data management ===== */

  function refresh() {
    renderList();
    renderWish();
    renderStats();
  }

  function deleteRecord(id) {
    const r = findRecord(id);
    if (!r || !confirm(`'${r.name}' 기록을 삭제할까요?`)) return;
    state.data.records = state.data.records.filter((rec) => rec.id !== id);
    if (state.editingId === id) {
      state.editingId = null;
      state.formReady = false;
    }
    save();
    closeSheet();
    refresh();
    toast('기록을 삭제했어요');
  }

  function exportData() {
    const payload = { app: 'coffee-journey', exportedAt: new Date().toISOString(), ...state.data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coffee-journey-${todayISO().replace(/-/g, '')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`기록 ${state.data.records.length}개, 위시 ${state.data.wishlist.length}개를 내보냈어요`);
  }

  function readImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        toast('JSON 파일을 읽을 수 없어요', 'error');
        return;
      }
      const data = normalizeData(parsed);
      if (!data) {
        toast('Coffee Journey 데이터 형식이 아니에요', 'error');
        return;
      }
      if (!data.records.length && !data.wishlist.length) {
        toast('불러올 수 있는 기록이 없어요', 'error');
        return;
      }
      openSheet(`
        <div class="detail-head"><h2 class="detail-title" id="sheet-title">데이터 불러오기</h2></div>
        <p class="sheet-text">파일에서 기록 <strong>${data.records.length}개</strong>, 위시 <strong>${data.wishlist.length}개</strong>를 찾았어요. 어떻게 불러올까요?</p>
        <div class="sheet-stack">
          <button type="button" class="btn btn-primary btn-block" data-action="import-merge">병합하기 · 기존 데이터 유지</button>
          <button type="button" class="btn btn-danger btn-block" data-action="import-replace">덮어쓰기 · 기존 데이터 모두 교체</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="close-sheet">취소</button>
        </div>`);
      state.pendingImport = data;
    };
    reader.onerror = () => toast('파일을 읽지 못했어요', 'error');
    reader.readAsText(file);
  }

  function mergeById(current, incoming) {
    const byId = new Map(current.map((item) => [item.id, item]));
    incoming.forEach((item) => {
      const existing = byId.get(item.id);
      if (!existing || item.updatedAt > existing.updatedAt) byId.set(item.id, item);
    });
    return [...byId.values()];
  }

  function applyImport(mode) {
    const incoming = state.pendingImport;
    if (!incoming) return;

    if (mode === 'replace') {
      state.data = incoming;
    } else {
      state.data.records = mergeById(state.data.records, incoming.records);
      state.data.wishlist = mergeById(state.data.wishlist, incoming.wishlist);
      state.data.customTags = uniqueTags([...state.data.customTags, ...incoming.customTags]);
    }

    state.editingId = null;
    state.formReady = false;
    save();
    closeSheet();
    refresh();
    toast(mode === 'replace' ? '데이터를 덮어썼어요' : '데이터를 병합했어요');
  }

  function restoreSeed() {
    const seed = seedData();
    const added = addMissing(state.data.records, seed.records) + addMissing(state.data.wishlist, seed.wishlist);
    if (!added) {
      toast('기본 기록이 이미 모두 있어요');
      return;
    }
    state.data.customTags = uniqueTags([...state.data.customTags, ...seed.customTags]);
    save();
    refresh();
    toast(`기본 기록 ${added}개를 넣었어요`);
  }

  function resetAll() {
    if (!confirm('모든 기록, 위시리스트, 추가한 태그를 삭제할까요?')) return;
    if (!confirm('정말 삭제할까요? 되돌릴 수 없어요. (먼저 내보내기로 백업하는 걸 추천해요)')) return;
    state.data = emptyData();
    state.editingId = null;
    state.formReady = false;
    save();
    refresh();
    toast('모든 데이터를 초기화했어요');
  }

  /* ===== Navigation ===== */

  function setView(name) {
    state.view = name;
    $$('.view').forEach((view) => view.classList.toggle('active', view.dataset.view === name));
    $$('.nav-btn').forEach((btn) => {
      const on = btn.dataset.nav === name;
      btn.classList.toggle('active', on);
      if (on) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }

  function navigate(name) {
    if (name === 'list') renderList();
    if (name === 'wish') renderWish();
    if (name === 'stats') renderStats();
    // Keep an unsaved new-record draft; leaving an edit discards it.
    if (name === 'form' && (state.editingId || !state.formReady)) openForm(null);
    setView(name);
  }

  /* ===== Events ===== */

  function openCardOnKey(e, handler) {
    const card = e.target.closest('.record-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handler(card.dataset.id);
    }
  }

  // Enter on a single-line input must not submit a form by accident.
  function preventEnterSubmit(e, onTagInput) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.isComposing) return;
    e.preventDefault();
    if (onTagInput && e.target.id === 'f-new-tag') onTagInput();
    else e.target.blur();
  }

  function bindEvents() {
    $$('.nav-btn').forEach((btn) => btn.addEventListener('click', () => navigate(btn.dataset.nav)));

    // List view
    views.list.addEventListener('input', (e) => {
      if (e.target.id !== 'search-input') return;
      state.query = e.target.value;
      renderList();
    });
    views.list.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const { action } = el.dataset;
      if (action === 'clear-search') {
        state.query = '';
        $('#search-input').value = '';
        renderList();
        $('#search-input').focus();
      } else if (action === 'sort') {
        state.sort = el.dataset.sort;
        renderList();
      } else if (action === 'toggle-filter') {
        state.filterOpen = !state.filterOpen;
        renderFilters();
      } else if (action === 'filter') {
        const { group, value } = el.dataset;
        state.filters[group] = state.filters[group] === value ? '' : value;
        renderList();
      } else if (action === 'reset-filters') {
        state.filters = { roastery: '', caffeine: '', roast: '' };
        renderList();
      } else if (action === 'open-detail') {
        renderDetail(el.dataset.id);
      } else if (action === 'go-form') {
        navigate('form');
      }
    });
    views.list.addEventListener('keydown', (e) => openCardOnKey(e, renderDetail));

    // Form view
    views.form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitForm();
    });
    views.form.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const { action } = el.dataset;
      if (action === 'roast') {
        const turnOn = !el.classList.contains('selected');
        $$('[data-action="roast"]', views.form).forEach((btn) => {
          btn.classList.remove('selected');
          btn.setAttribute('aria-pressed', 'false');
        });
        el.classList.toggle('selected', turnOn);
        el.setAttribute('aria-pressed', String(turnOn));
      } else if (action === 'decaf') {
        selectSegment(el);
      } else if (action === 'tag') {
        const { tag } = el.dataset;
        const on = !state.formTags.has(tag);
        if (on) state.formTags.add(tag);
        else state.formTags.delete(tag);
        el.classList.toggle('selected', on);
        el.setAttribute('aria-pressed', String(on));
        updateTagCount();
      } else if (action === 'add-tag') {
        addCustomTag();
      } else if (action === 'rater') {
        setActiveRater(el.dataset.rater);
      } else if (action === 'clear-score') {
        setScoreEmpty(document.getElementById(el.dataset.target), true);
      } else if (action === 'cancel-edit') {
        state.editingId = null;
        state.formReady = false;
        navigate('list');
      }
    });
    views.form.addEventListener('input', (e) => {
      const t = e.target;
      if (t.classList.contains('range')) setScoreEmpty(t, false);
      else if (t.id === 'f-grams' || t.id === 'f-price') updatePricePerGram('f');
      else if (t.id === 'f-name' && t.value.trim()) setFieldError('f-name', false);
    });
    // A tap on the thumb without moving fires no `input`; pointerup still marks the score as given.
    // (A vertical scroll that starts on the slider ends in pointercancel, not pointerup.)
    views.form.addEventListener('pointerup', (e) => {
      const t = e.target;
      if (t.classList.contains('range') && t.closest('.slider-row').classList.contains('is-empty')) setScoreEmpty(t, false);
    });
    views.form.addEventListener('keydown', (e) => preventEnterSubmit(e, addCustomTag));

    // Wishlist view
    views.wish.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      if (el.dataset.action === 'add-wish') openWishForm(null);
      else if (el.dataset.action === 'edit-wish') openWishForm(el.dataset.id);
    });
    views.wish.addEventListener('keydown', (e) => openCardOnKey(e, openWishForm));

    // Stats view
    views.stats.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const { action } = el.dataset;
      if (action === 'export') exportData();
      else if (action === 'import') $('#import-file').click();
      else if (action === 'restore-seed') restoreSeed();
      else if (action === 'reset') resetAll();
    });

    $('#import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) readImportFile(file);
      e.target.value = '';
    });

    // Sheet
    const sheet = $('#sheet');
    sheet.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        closeSheet();
        return;
      }
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const { action, id } = el.dataset;
      if (action === 'close-sheet') {
        closeSheet();
      } else if (action === 'edit') {
        closeSheet();
        openForm(id);
        setView('form');
      } else if (action === 'delete') {
        deleteRecord(id);
      } else if (action === 'decaf') {
        selectSegment(el);
      } else if (action === 'delete-wish') {
        deleteWish(id);
      } else if (action === 'import-merge') {
        applyImport('merge');
      } else if (action === 'import-replace') {
        applyImport('replace');
      }
    });
    sheet.addEventListener('submit', (e) => {
      e.preventDefault();
      if (e.target.id === 'wish-form') submitWish(e.target);
    });
    sheet.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'w-grams' || t.id === 'w-price') updatePricePerGram('w');
      else if (t.id === 'w-name' && t.value.trim()) setFieldError('w-name', false);
    });
    sheet.addEventListener('keydown', (e) => preventEnterSubmit(e, null));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSheet();
    });
  }

  /* ===== Init ===== */

  function init() {
    views.list = $('#view-list');
    views.form = $('#view-form');
    views.wish = $('#view-wish');
    views.stats = $('#view-stats');

    $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });

    load();
    initListView();
    bindEvents();
    refresh();
    setView('list');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
