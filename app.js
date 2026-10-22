/* ==========================================================================
   Coffee Journey — app logic (vanilla JS, no build step)
   ========================================================================== */
(() => {
  'use strict';

  /* ===== Constants ===== */

  const STORAGE_KEY = 'coffeeJourney.v1';
  const DATA_VERSION = 1;

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
    { id: 'dog', emoji: '🐶', label: '강아지' },
    { id: 'chick', emoji: '🐥', label: '병아리' }
  ];
  const DEFAULT_TASTE = 3;
  const DEFAULT_OVERALL = 7;

  // Lucide-style inline icons (24x24, stroke based)
  const ICONS = {
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
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

  function uid() {
    return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function toNum(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const roundHalf = (n) => Math.round(n * 2) / 2;
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

  function average(values) {
    return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
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
    return { version: DATA_VERSION, customTags: [], records: [] };
  }

  function scoreOr(value, max, fallback) {
    const n = Number(value);
    return value !== null && value !== '' && Number.isFinite(n) ? clamp(roundHalf(n), 0, max) : fallback;
  }

  function normalizeRatings(src) {
    const out = {};
    RATERS.forEach(({ id }) => {
      const r = (src && typeof src[id] === 'object' && src[id]) || {};
      const entry = {};
      TASTE_ITEMS.forEach(({ key }) => { entry[key] = scoreOr(r[key], 5, DEFAULT_TASTE); });
      entry.overall = scoreOr(r.overall, 10, DEFAULT_OVERALL);
      out[id] = entry;
    });
    return out;
  }

  function normalizeRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const str = (v) => (typeof v === 'string' ? v.trim() : '');
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
      date: isISODate(raw.date) ? raw.date : createdAt.slice(0, 10),
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

  // Accepts the stored/exported shape ({ records, customTags }) or a bare array of records.
  function normalizeData(raw) {
    const src = Array.isArray(raw) ? { records: raw } : raw;
    if (!src || typeof src !== 'object' || !Array.isArray(src.records)) return null;
    const records = src.records.map(normalizeRecord).filter(Boolean);
    const customTags = Array.isArray(src.customTags)
      ? uniqueTags(src.customTags).filter((t) => !DEFAULT_TAGS.includes(t))
      : [];
    return { version: DATA_VERSION, customTags, records };
  }

  function migrate(raw) {
    // v1 is the first schema. Future versions transform `raw` here before normalizing.
    return normalizeData(raw);
  }

  function sampleRecords() {
    return [
      {
        id: 'sample_1',
        createdAt: '2026-10-18T01:00:00.000Z',
        date: '2026-10-18',
        name: '에티오피아 예가체프 G1 코체레',
        roastery: '달빛 로스터스',
        origin: '에티오피아 예가체프',
        variety: '에어룸',
        roastLevel: 'Light',
        decaf: false,
        grams: 200,
        price: 19000,
        flavorTags: ['자스민', '시트러스', '홍차', '베리'],
        ratings: {
          dog: { acidity: 4.5, sweetness: 3.5, body: 2.5, bitterness: 1.5, aftertaste: 4, overall: 9 },
          chick: { acidity: 4, sweetness: 4, body: 3, bitterness: 2, aftertaste: 3.5, overall: 8.5 }
        },
        memo: '꽃향기 가득한 아침용 커피 🌼',
        notes: '핸드드립 15g / 240ml / 92℃.\n식으면서 자스민 향이 더 진해지고, 레몬 같은 산미가 깔끔하게 마무리돼요.'
      },
      {
        id: 'sample_2',
        createdAt: '2026-10-12T11:00:00.000Z',
        date: '2026-10-12',
        name: '콜롬비아 우일라 디카페인',
        roastery: '숲속 커피랩',
        origin: '콜롬비아 우일라',
        variety: '카스티요',
        roastLevel: 'Medium',
        decaf: true,
        grams: 250,
        price: 17500,
        flavorTags: ['카라멜', '초콜릿', '견과류'],
        ratings: {
          dog: { acidity: 2.5, sweetness: 4, body: 3.5, bitterness: 2.5, aftertaste: 3.5, overall: 7.5 },
          chick: { acidity: 2, sweetness: 4.5, body: 4, bitterness: 2, aftertaste: 3.5, overall: 8 }
        },
        memo: '밤에도 부담 없는 고소달달 디카페인 🌙',
        notes: '라떼로 마셨을 때 특히 좋았어요. 카라멜 같은 단맛이 우유와 잘 어울려요.'
      },
      {
        id: 'sample_3',
        createdAt: '2026-10-05T02:00:00.000Z',
        date: '2026-10-05',
        name: '케냐 AA 키리냐가',
        roastery: '모모 로스터리',
        origin: '케냐 키리냐가',
        variety: 'SL28, SL34',
        roastLevel: 'Medium-Light',
        decaf: false,
        grams: 200,
        price: 21000,
        flavorTags: ['베리', '산미', '블랙커런트', '흑설탕'],
        ratings: {
          dog: { acidity: 5, sweetness: 3, body: 3.5, bitterness: 2, aftertaste: 4, overall: 8.5 },
          chick: { acidity: 4.5, sweetness: 3.5, body: 3, bitterness: 2.5, aftertaste: 4, overall: 7.5 }
        },
        memo: '쥬시한 산미가 톡 터지는 케냐 🍇',
        notes: '산미가 강해서 병아리는 살짝 부담스러워했지만, 흑설탕 같은 단맛과 균형이 좋았어요.'
      }
    ].map(normalizeRecord);
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
      // Storage blocked (e.g. some private modes): run with samples in memory only.
      state.data = { ...emptyData(), customTags: ['블랙커런트'], records: sampleRecords() };
      toast('이 브라우저에서는 데이터가 저장되지 않아요', 'error');
      return;
    }

    if (raw === null) {
      // First visit only: seed sample records.
      state.data = { ...emptyData(), customTags: ['블랙커런트'], records: sampleRecords() };
      save();
      return;
    }

    try {
      const data = migrate(JSON.parse(raw));
      if (!data) throw new Error('Invalid data shape');
      state.data = data;
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
    editingId: null,
    formReady: false,
    formTags: new Set(),
    pendingImport: null
  };

  const views = {};

  function findRecord(id) {
    return state.data.records.find((r) => r.id === id) || null;
  }

  function getVisibleRecords() {
    const q = state.query.trim().toLowerCase();
    const byLatest = (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    const list = state.data.records.filter((r) =>
      !q || r.name.toLowerCase().includes(q) || r.roastery.toLowerCase().includes(q));
    return list.sort(state.sort === 'rating'
      ? (a, b) => avgOverall(b) - avgOverall(a) || byLatest(a, b)
      : byLatest);
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
          <div class="segmented" role="group" aria-label="정렬">
            <button type="button" data-action="sort" data-sort="latest">최신순</button>
            <button type="button" data-action="sort" data-sort="rating">평점순</button>
          </div>
        </div>
      </div>
      <div class="record-list" id="record-list"></div>`;
  }

  function emptyHTML(emoji, title, desc, withButton) {
    return `
      <div class="empty">
        <div class="empty-emoji" aria-hidden="true">${emoji}</div>
        <p class="empty-title">${title}</p>
        <p>${desc}</p>
        ${withButton ? `<button type="button" class="btn btn-primary" data-action="go-form">${icon('plus')} 첫 기록 남기기</button>` : ''}
      </div>`;
  }

  function cardHTML(r, i) {
    const tags = r.flavorTags.slice(0, 3);
    const score = formatScore(avgOverall(r));
    return `
      <article class="card record-card" role="button" tabindex="0" data-action="open-detail" data-id="${escapeHTML(r.id)}" style="--i:${Math.min(i, 10)}">
        <div class="card-top">
          <span>${formatDate(r.date)}</span>
          ${r.roastLevel ? `<span class="badge">${r.roastLevel}</span>` : ''}
          ${r.decaf ? '<span class="badge badge-decaf">디카페인</span>' : ''}
        </div>
        <div class="card-main">
          <div>
            <h3 class="card-title">${escapeHTML(r.name)}</h3>
            ${r.roastery ? `<p class="card-roastery">${escapeHTML(r.roastery)}</p>` : ''}
          </div>
          <div class="score-badge" aria-label="종합 점수 ${score}점"><strong>${score}</strong><span>/ 10</span></div>
        </div>
        <div class="card-raters">
          ${RATERS.map((rt) => `<span>${rt.emoji} ${formatScore(r.ratings[rt.id].overall)}</span>`).join('')}
        </div>
        ${tags.length ? `<div class="tag-row">${tags.map((t) => `<span class="tag">#${escapeHTML(t)}</span>`).join('')}</div>` : ''}
      </article>`;
  }

  function renderList() {
    const total = state.data.records.length;
    const list = getVisibleRecords();

    $('#list-count').innerHTML = state.query
      ? `검색 결과 <strong>${list.length}</strong>개`
      : `총 <strong>${total}</strong>개의 기록`;
    $$('[data-sort]', views.list).forEach((btn) => {
      const on = btn.dataset.sort === state.sort;
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    $('[data-action="clear-search"]', views.list).hidden = !state.query;

    const box = $('#record-list');
    if (!total) {
      box.innerHTML = emptyHTML('☕', '아직 기록이 없어요', '오늘 마신 커피의 첫 기록을 남겨보세요', true);
    } else if (!list.length) {
      box.innerHTML = emptyHTML('🔍', '검색 결과가 없어요', `"${escapeHTML(state.query)}"와 일치하는 원두가 없어요`, false);
    } else {
      box.innerHTML = list.map(cardHTML).join('');
    }
  }

  /* ===== Render: form ===== */

  function sliderHTML(raterId, key, label, en, value, max, isOverall) {
    const id = `r-${raterId}-${key}`;
    return `
      <div class="slider-row${isOverall ? ' overall' : ''}">
        <div class="slider-head">
          <label class="slider-name" for="${id}">${label}${en ? ` <small>${en}</small>` : ''}</label>
          <output class="slider-value" for="${id}" id="${id}-out"></output>
        </div>
        <input class="range${isOverall ? ' range-overall' : ''}" type="range" id="${id}" data-rater="${raterId}" data-key="${key}" min="0" max="${max}" step="0.5" value="${value}">
      </div>`;
  }

  function updateRange(input) {
    const value = Number(input.value);
    const max = Number(input.max);
    input.style.setProperty('--fill', `${(value / max) * 100}%`);
    const out = document.getElementById(`${input.id}-out`);
    if (out) out.innerHTML = `${value.toFixed(1)}<small> / ${max}</small>`;
  }

  function renderForm(record) {
    const v = record || {
      name: '', roastery: '', origin: '', variety: '', roastLevel: '', decaf: false,
      grams: null, price: null, date: todayISO(), flavorTags: [],
      ratings: normalizeRatings(null), memo: '', notes: ''
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
            <input class="input" id="f-roastery" type="text" maxlength="40" placeholder="예) 달빛 로스터스" value="${escapeHTML(v.roastery)}">
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
            <div class="segmented" role="group" aria-labelledby="caffeine-label">
              <button type="button" class="${v.decaf ? '' : 'selected'}" data-action="decaf" data-value="false" aria-pressed="${!v.decaf}">☕ 카페인</button>
              <button type="button" class="${v.decaf ? 'selected' : ''}" data-action="decaf" data-value="true" aria-pressed="${v.decaf}">🌙 디카페인</button>
            </div>
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
          ${RATERS.map((rt) => `
            <div class="rater-panel" data-panel="${rt.id}" role="tabpanel" aria-label="${rt.label} 평가">
              ${TASTE_ITEMS.map((item) => sliderHTML(rt.id, item.key, item.label, item.en, v.ratings[rt.id][item.key], 5, false)).join('')}
              ${sliderHTML(rt.id, 'overall', `${rt.emoji} 종합 점수`, '', v.ratings[rt.id].overall, 10, true)}
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
    updatePricePerGram();
    $$('.range', views.form).forEach(updateRange);
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

  function updatePricePerGram() {
    const ppg = calcPricePerGram(toNum($('#f-price').value), toNum($('#f-grams').value));
    $('#f-ppg').textContent = ppg === null ? '-' : formatWon(ppg, 1);
  }

  function setNameError(show) {
    $('#f-name').classList.toggle('invalid', show);
    $('#f-name').setAttribute('aria-invalid', String(show));
    $('#f-name-error').hidden = !show;
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
    const nameInput = $('#f-name');
    const name = nameInput.value.trim();
    if (!name) {
      setNameError(true);
      nameInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
      nameInput.focus({ preventScroll: true });
      toast('원두 이름은 꼭 입력해 주세요', 'error');
      return;
    }

    const ratings = {};
    RATERS.forEach(({ id }) => {
      ratings[id] = {};
      $$(`.range[data-rater="${id}"]`, form).forEach((input) => {
        ratings[id][input.dataset.key] = Number(input.value);
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
      date: $('#f-date').value || todayISO(),
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
              <div class="bar" role="img" aria-label="${rt.label} ${formatScore(value)}점"><div class="bar-fill ${rt.id}" style="--w:${width}%"></div></div>
              <span class="val">${formatScore(value)}</span>
            </div>`;
        }).join('')}
      </div>`).join('');
  }

  function legendHTML() {
    return `<div class="compare-legend">${RATERS.map((rt) => `<span><i class="legend-dot ${rt.id}"></i>${rt.label}</span>`).join('')}</div>`;
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

    const tasteRows = TASTE_ITEMS.map((item) => ({
      label: `${item.label} <small class="muted">${item.en}</small>`,
      max: 5,
      values: Object.fromEntries(RATERS.map((rt) => [rt.id, r.ratings[rt.id][item.key]]))
    }));

    openSheet(`
      <div class="detail-head">
        <div class="card-top">
          <span>${formatDate(r.date)}</span>
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
        <h3 class="section-title">⭐ 맛 평가 ${legendHTML()}</h3>
        ${compareRowsHTML(tasteRows)}
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
    const ppgAvg = average(records.map((r) => r.pricePerGram).filter((v) => v !== null));

    const tagCounts = new Map();
    records.forEach((r) => r.flavorTags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const roastRows = [...ROAST_LEVELS, '']
      .map((level) => ({ name: level || '미지정', count: records.filter((r) => r.roastLevel === level).length }))
      .filter((row) => row.count > 0);

    const tasteRows = TASTE_ITEMS.map((item) => ({
      label: `${item.label} <small class="muted">${item.en}</small>`,
      max: 5,
      values: Object.fromEntries(RATERS.map((rt) => [rt.id, average(records.map((r) => r.ratings[rt.id][item.key]))]))
    }));

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
        <h3 class="section-title">👅 맛 프로필 평균 ${total ? legendHTML() : ''}</h3>
        ${total ? compareRowsHTML(tasteRows) : noData}
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
          <button type="button" class="btn btn-ghost full" data-action="restore-samples">${icon('rotate')} 샘플 기록 다시 넣기</button>
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
    toast(`${state.data.records.length}개의 기록을 내보냈어요`);
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
      if (!data.records.length) {
        toast('불러올 수 있는 기록이 없어요', 'error');
        return;
      }
      openSheet(`
        <div class="detail-head"><h2 class="detail-title" id="sheet-title">데이터 불러오기</h2></div>
        <p class="sheet-text">파일에서 <strong>${data.records.length}개</strong>의 기록을 찾았어요. 어떻게 불러올까요?</p>
        <div class="sheet-stack">
          <button type="button" class="btn btn-primary btn-block" data-action="import-merge">병합하기 · 기존 기록 유지</button>
          <button type="button" class="btn btn-danger btn-block" data-action="import-replace">덮어쓰기 · 기존 기록 모두 교체</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="close-sheet">취소</button>
        </div>`);
      state.pendingImport = data;
    };
    reader.onerror = () => toast('파일을 읽지 못했어요', 'error');
    reader.readAsText(file);
  }

  function applyImport(mode) {
    const incoming = state.pendingImport;
    if (!incoming) return;

    if (mode === 'replace') {
      state.data = incoming;
    } else {
      const byId = new Map(state.data.records.map((r) => [r.id, r]));
      incoming.records.forEach((r) => {
        const current = byId.get(r.id);
        if (!current || r.updatedAt > current.updatedAt) byId.set(r.id, r);
      });
      state.data.records = [...byId.values()];
      state.data.customTags = uniqueTags([...state.data.customTags, ...incoming.customTags]);
    }

    state.editingId = null;
    state.formReady = false;
    save();
    closeSheet();
    refresh();
    toast(mode === 'replace' ? '데이터를 덮어썼어요' : `${incoming.records.length}개의 기록을 병합했어요`);
  }

  function restoreSamples() {
    const ids = new Set(state.data.records.map((r) => r.id));
    const missing = sampleRecords().filter((r) => !ids.has(r.id));
    if (!missing.length) {
      toast('샘플 기록이 이미 모두 있어요');
      return;
    }
    state.data.records.push(...missing);
    state.data.customTags = uniqueTags([...state.data.customTags, '블랙커런트']);
    save();
    refresh();
    toast(`샘플 기록 ${missing.length}개를 넣었어요`);
  }

  function resetAll() {
    if (!confirm('모든 기록과 추가한 태그를 삭제할까요?')) return;
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
    if (name === 'stats') renderStats();
    // Keep an unsaved new-record draft; leaving an edit discards it.
    if (name === 'form' && (state.editingId || !state.formReady)) openForm(null);
    setView(name);
  }

  /* ===== Events ===== */

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
      } else if (action === 'open-detail') {
        renderDetail(el.dataset.id);
      } else if (action === 'go-form') {
        navigate('form');
      }
    });
    views.list.addEventListener('keydown', (e) => {
      const card = e.target.closest('.record-card');
      if (card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        renderDetail(card.dataset.id);
      }
    });

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
        $$('[data-action="decaf"]', views.form).forEach((btn) => {
          const on = btn === el;
          btn.classList.toggle('selected', on);
          btn.setAttribute('aria-pressed', String(on));
        });
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
      } else if (action === 'cancel-edit') {
        state.editingId = null;
        state.formReady = false;
        navigate('list');
      }
    });
    views.form.addEventListener('input', (e) => {
      const t = e.target;
      if (t.classList.contains('range')) updateRange(t);
      else if (t.id === 'f-grams' || t.id === 'f-price') updatePricePerGram();
      else if (t.id === 'f-name' && t.value.trim()) setNameError(false);
    });
    views.form.addEventListener('keydown', (e) => {
      // Enter on a single-line input must not submit the form by accident.
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.isComposing) return;
      e.preventDefault();
      if (e.target.id === 'f-new-tag') addCustomTag();
      else e.target.blur();
    });

    // Stats view
    views.stats.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const { action } = el.dataset;
      if (action === 'export') exportData();
      else if (action === 'import') $('#import-file').click();
      else if (action === 'restore-samples') restoreSamples();
      else if (action === 'reset') resetAll();
    });

    $('#import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) readImportFile(file);
      e.target.value = '';
    });

    // Sheet
    $('#sheet').addEventListener('click', (e) => {
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
      } else if (action === 'import-merge') {
        applyImport('merge');
      } else if (action === 'import-replace') {
        applyImport('replace');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSheet();
    });
  }

  /* ===== Init ===== */

  function init() {
    views.list = $('#view-list');
    views.form = $('#view-form');
    views.stats = $('#view-stats');

    $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });

    load();
    initListView();
    bindEvents();
    renderList();
    renderStats();
    setView('list');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
