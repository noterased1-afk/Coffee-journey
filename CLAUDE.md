# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code에게 프로젝트 맥락과 규칙을 알려줍니다.

## 프로젝트 개요

**Coffee Journey ☕** — 두 명의 평가자(🐶 강쥐, 🐥 공쥬)가 함께 쓰는 모바일 커피 테이스팅 기록 웹앱.
원두 정보, 향미 평가, 기록 목록, 위시리스트, 통계를 관리한다. 기본은 `localStorage` 저장이고, 공유 코드로 연결하면 Firebase Firestore를 통해 두 폰이 실시간 동기화된다.
GitHub Pages(`main` 브랜치 루트)로 정적 배포한다.

## 기술 스택 & 제약

- **순수 HTML / CSS / Vanilla JavaScript만 사용.** React, Vue, jQuery, Tailwind 등 프레임워크·빌드 도구 금지.
- 외부 의존성 최소화. 아이콘은 `app.js`의 `ICONS` 맵에 Lucide 스타일 인라인 SVG로 직접 정의해 쓴다.
- 유일한 외부 라이브러리는 Firebase compat SDK(`firebase-app-compat`, `firebase-firestore-compat`, 버전 고정, gstatic CDN)이며,
  공유 코드로 연결된 폰에서만 동적으로 로드한다. 연결 전이나 `FIREBASE_CONFIG`가 `null`이면 로드하지 않고 로컬 전용으로 동작한다.
- 빌드 단계 없음: `index.html`을 브라우저에서 바로 열거나(`file://`) 정적 서버로 띄우면 즉시 동작해야 한다.
- ES 모듈(`type="module"`)은 `file://`에서 CORS 문제가 생기므로 쓰지 않는다. 일반 `<script defer>`로 로드한다.
- 최신 모바일 브라우저(iOS Safari, Android Chrome) 기준. 트랜스파일 없이 동작하는 ES2020 문법까지 사용.

## 파일 구조

```
/
├── index.html   # 마크업: 헤더(+ 버튼, 동기화 점), 4개 화면, 하단 네비 3탭, 바텀시트, 토스트
├── style.css    # 디자인 토큰(:root 변수), 레이아웃, 컴포넌트, 애니메이션
├── app.js       # 상태 관리, 저장소, 렌더링, 이벤트 핸들링
├── .gitignore
└── CLAUDE.md
```

- 파일을 더 쪼개지 않는다. 세 파일로 "바로 실행 가능한 단일 파이프라인"을 유지한다.
- 인라인 `onclick=""` 대신 `data-action` 속성 + `addEventListener`(이벤트 위임)를 사용한다.
  인라인 `style`은 CSS 변수 전달(`--i`, `--w` 등)에만 쓴다.

## 실행 & 배포

```bash
# 그냥 열기
open index.html            # 또는 브라우저로 드래그

# 로컬 서버 (모바일 기기 테스트 시)
python3 -m http.server 8000
```

- 테스트 프레임워크는 없다. 변경 후에는 브라우저 DevTools 모바일 에뮬레이션(375×812 등)에서 직접 확인한다.
- 배포: `main` 브랜치에 push하면 GitHub Pages가 루트(`/`)를 그대로 서빙한다. 별도 빌드/워크플로 없음.
  모든 경로는 상대 경로(`./style.css`)로 작성해 하위 경로(`/<repo>/`) 배포에서도 동작하게 한다.

## 기능 명세

### 1. 원두 정보
| 필드 | 키 | 비고 |
|---|---|---|
| 원두 이름 | `name` | **필수**. 비어 있으면 저장 차단 + 인라인 에러 |
| 로스터리(브랜드) | `roastery` | |
| 원산지 / 품종 | `origin`, `variety` | |
| 로스팅 포인트 | `roastLevel` | `Light`, `Medium-Light`, `Medium`, `Medium-Dark`, `Dark` 중 하나 또는 `''`(저장값은 영문). 화면에는 `ROAST_LABELS`의 한글(라이트·라이트 미디엄·미디엄·미디엄 다크·다크)로 표시. 칩으로 선택, 다시 탭하면 해제 |
| 카페인 구분 | `decaf` | `false`=카페인, `true`=디카페인. 세그먼트 토글 |
| 총 그램수(g) | `grams` | 숫자 또는 `null` |
| 총 가격(원) | `price` | 숫자 또는 `null` |
| 그램 당 가격(원) | `pricePerGram` | **저장한다.** 저장 시 `price / grams`로 계산(소수 1자리 반올림), 둘 중 하나라도 없으면 `null`. 입력 중에도 실시간 미리보기 |
| 시음 일자 | `date` | `YYYY-MM-DD` 또는 `''`(미기록). 새 기록 기본값은 오늘. 카드의 "작성 일자"로 표시, 비어 있으면 생략 |

### 2. 향미 & 평가
- **플레이버 노트**: 기본 태그(산미, 자스민, 시트러스, 베리, 초콜릿, 견과류, 카라멜, 꿀, 플로럴, 스톤프루트, 홍차, 흑설탕)를 칩으로 토글 선택. 사용자 정의 태그 추가 가능(Enter/추가 버튼, 중복·공백 무시). 추가한 태그는 `customTags`에 저장되어 다음 작성 시에도 칩 목록에 남는다.
- **맛 항목 5점 평점**: 산미 Acidity, 단맛 Sweetness, 바디감 Body, 쓴맛 Bitterness, 후미 Aftertaste.
  - 평가자 2명 각각 입력: 🐶 강쥐(`dog`), 🐥 공쥬(`chick`). 폼에서는 평가자 탭으로 전환. (id는 그대로, 표시 이름만 `RATERS`에서 관리)
  - 입력 UI는 터치 친화 슬라이더(0–5, 0.5 단위). 현재 값을 숫자로 함께 표시.
- **종합 점수**: 평가자별 10점 만점(**0.1 단위**). 카드/정렬에는 두 평가자의 **평균**을 사용.
- **빈 점수**: 모든 점수(맛 5항목, 종합)는 `null`(빈칸)일 수 있다. 새 기록은 전부 빈칸으로 시작하고, 슬라이더를 움직이거나 탭하면 값이 기록되며 "비우기"로 다시 빈칸이 된다. 평균·통계는 `null`을 제외하고 계산하고, 표시는 `-`. 평점순 정렬에서 점수 없는 기록은 맨 뒤.
- **메모**: 한 줄 메모(`memo`)와 상세 테이스팅 소감(`notes`, textarea). 평가자 공용.

### 3. 기록 리스트
- 카드만 보고도 핵심 정보가 다 보이게 한다(참고 디자인: 정보 pill + 이모지):
  시음 일자(있으면) → 원두 이름 + ⚡ 카페인/🌙 디카페인 pill → 로스터리 pill → 🔥 로스팅(단계별 색) · ⚖️ 용량 · 💰 가격 · ₩/g(파란색) pill → 한 줄 메모 → 태그 최대 3개 → 하단에 🐶/🐥 종합 점수와 수정·삭제 아이콘 버튼.
- 카드 아무 곳이나 탭하면 바텀시트로 상세 보기(제목 버튼의 `::after`가 카드 전체를 덮는 stretched-link 방식, 하단 버튼만 그 위에 올라감). 시트 안에서도 **수정 / 삭제**(삭제는 confirm).
- 검색: 원두 이름·로스터리 부분 일치, 대소문자 무시, 입력 즉시 필터.
- 필터(필터 버튼으로 패널 열기, 그룹별 단일 선택·다시 탭하면 해제, 검색·정렬과 함께 적용):
  - 브랜드: 기록에 있는 `roastery` 값으로 칩 자동 생성
  - 종류: 카페인 / 디카페인
  - 로스팅 정도: 5단계 + 미지정
- 정렬: 최신순(기본, 날짜 있는 기록 먼저 `date` 내림차순 → `createdAt` 내림차순) / 평점순(평균 종합 점수).
- 결과가 없을 때 빈 상태(empty state) 표시.

### 4. 위시리스트 탭
- 궁금한 원두를 따로 기록. 항목: 원두 이름(필수), 브랜드(`roastery`), 종류(`decaf`), 용량(`grams`), 가격(`price`), 그램 당 가격(`pricePerGram`, 저장), 메모(`notes`).
- 카드 목록(최근 추가순) + "담기" 버튼. 추가·수정·삭제는 바텀시트 폼에서.

### 5. 실시간 동기화 (공유 코드)
- 통계/설정 탭에서 "새 코드 만들기"(24자, `xxxx-xxxx-…`) → "연결하기". 다른 폰은 "링크 보내기"로 받은 `#join=<코드>` 링크를 열면 바로 연결 절차가 시작된다.
- 이미 데이터가 있는 공간에 연결하면 "공유 기록으로 시작하기(추천) / 이 폰 기록도 합치기"를 고른다.
- Firestore 구조: `journeys/{code}`(`customTags`), `journeys/{code}/records/{id}`, `journeys/{code}/wishlist/{id}`. 문서 id = 기록 id(`safeId()`로 `[A-Za-z0-9_-]`만 허용).
- 동작 원리: 모든 변경은 `save()` → `saveLocal()` + `pushChanges()`. `pushChanges()`는 `sync.remote`(서버에 있다고 알려진 상태, `coffeeJourney.syncBase`에 보관)와 현재 데이터를 비교해 바뀐 문서만 set/delete 한다. `onSnapshot`으로 받은 서버 데이터가 로컬 데이터를 대체한다(문서 단위 last-write-wins).
- 다른 폰의 변경이 오면 목록·위시·통계를 애니메이션 없이 다시 그리고, 열려 있는 상세 시트도 갱신한다. 작성 중인 폼과 입력 중인 설정 탭은 건드리지 않는다.
- 오프라인: Firestore 오프라인 캐시(`enablePersistence`)가 쓰기를 대기시켰다가 재연결 시 전송. 헤더의 점 색으로 상태 표시(초록=동기화 중, 주황=오프라인, 빨강=오류).
- 보안 규칙: 코드 길이 20자 이상인 경로만 읽기/쓰기, `journeys` 컬렉션 목록 조회는 금지(코드를 모르면 접근 불가).

### 6. 통계 / 설정 탭
- 통계: 총 기록 수, 평균 종합 점수(전체·🐶·🐥), 평균 그램 당 가격, 맛 프로필 평균(🐶 vs 🐥), 플레이버 태그 Top 5, 로스팅 포인트 분포. 차트 라이브러리 없이 CSS 막대로 그린다.
- 데이터 관리:
  - **Export**: 전체 데이터를 `coffee-journey-YYYYMMDD.json`으로 다운로드(`Blob` + `a[download]`).
  - **Import**: `<input type="file" accept="application/json">`. 검증 후 바텀시트에서 "병합 / 덮어쓰기" 선택. 잘못된 파일은 토스트로 에러 안내, 기존 데이터 보존.
  - 기본 기록 다시 넣기(빠진 seed 기록·위시만 추가), 전체 초기화(기록·위시·태그, confirm 2단계).

## 데이터 모델 & 저장

```js
// localStorage key
const STORAGE_KEY = 'coffeeJourney.v1';

// 저장 형태
{
  version: 2,   // localStorage 캐시. 동기화 중엔 Firestore가 원본
  customTags: ['밀크초콜릿', ...],
  records: [{
    id: 'r_lx3k9a_4f2',             // uid()
    createdAt: '2026-10-22T08:30:00.000Z',
    updatedAt: '2026-10-22T08:30:00.000Z',
    date: '2026-10-22',
    name: '에티오피아 예가체프 G1',
    roastery: '',
    origin: '', variety: '',
    roastLevel: 'Light',
    decaf: false,
    grams: 200, price: 18000, pricePerGram: 90,
    flavorTags: ['자스민', '시트러스'],
    ratings: {
      dog:   { acidity: 4, sweetness: 3.5, body: 3, bitterness: 2, aftertaste: 4, overall: 8.5 },
      chick: { acidity: null, sweetness: null, body: null, bitterness: null, aftertaste: null, overall: 8.7 }
    },
    memo: '',
    notes: ''
  }],
  wishlist: [{
    id: 'w_lx3k9a_4f2', createdAt, updatedAt,
    name: '벨벳 화이트', roastery: '빈브라더스', decaf: false,
    grams: 200, price: 18000, pricePerGram: 90,
    notes: ''
  }]
}
```

- 모든 변경(생성·수정·삭제·import) 직후 자동 저장. 읽기/쓰기는 `try/catch`로 감싸고 실패 시 토스트로 알린다.
- 저장·import되는 모든 기록/위시는 `normalizeRecord()`/`normalizeWish()`를 거쳐 기본값을 채우고 `pricePerGram`을 다시 계산한다. 없는 값은 지어내지 않고 빈칸(`''`/`null`)으로 둔다.
- **기본 데이터**: `seedData()`에 두 사람의 기존 테이스팅 노트(기록 11개, id `seed_01`~)와 위시 1개(`seed_wish_01`)가 들어 있다. **첫 방문**(키가 없을 때)에만 넣는다. 사용자가 모두 삭제한 뒤 새로고침해도 다시 생기면 안 된다.
- **v1 → v2 마이그레이션**: 예전 데모 기록(id `sample_*`)과 쓰이지 않는 `블랙커런트` 태그를 지우고, seed 기록·위시를 추가한다. 사용자가 직접 쓴 기록은 그대로 둔다.
- 저장된 JSON이 깨져 있으면 원본을 `coffeeJourney.v1.corrupt` 키에 백업한 뒤 빈 상태로 시작한다.
- 스키마를 바꾸면 `version`을 올리고 `migrate()`에서 이전 데이터를 변환한다. 기존 사용자 데이터를 절대 버리지 않는다.
- 동기화 관련 키: `coffeeJourney.sync`(`{ code }`), `coffeeJourney.syncBase`(서버 기준 상태).
- 사용자 입력을 DOM에 넣을 때는 `escapeHTML()`을 거친다(import 데이터 포함, `innerHTML`에 원본 문자열 직접 삽입 금지).

## 앱 구조 (app.js)

IIFE 하나 안에서 섹션 주석으로 구분한다:

1. **Constants** — 저장 키, `FIREBASE_CONFIG`·SDK URL·동기화 키, `ROAST_LABELS`, 로스팅 포인트·기본 태그·맛 항목 목록, 평가자 정의, 점수 스케일(`TASTE_SCALE`, `OVERALL_SCALE`), `ICONS`
2. **Utils** — `escapeHTML`, `uid`, `toNum`, `formatDate`, `formatWon`, `calcPricePerGram`, `avgOverall`, `toast`
3. **Storage** — `load()`, `save()`, `migrate()`, `normalizeRecord()`, `normalizeWish()`, `seedData()`
4. **State** — `state = { data, view, query, sort, filters, filterOpen, editingId, formReady, formTags, detailId, pendingImport, quietRender }`
4-1. **Sync** — `sync` 객체, `linkSync()`, `resumeSync()`, `pushChanges()`, `applyRemote()`, `unlinkSync()`
5. **Render** — `renderList()`/`renderFilters()`, `renderForm()`, `renderDetail(id)`, `renderWish()`/`openWishForm(id)`, `renderStats()`
6. **Sheet** — 바텀시트 열기/닫기(포커스 복귀, ESC·배경 탭 닫기)
7. **Events** — 컨테이너 단위 이벤트 위임(`data-action`)
8. **Init** — `DOMContentLoaded`에서 로드 → 렌더

## 디자인 시스템

`style.css` 최상단 `:root`에 토큰으로 정의하고, 하드코딩 색상 대신 변수를 쓴다.

```css
:root {
  --bg: #FAF6EF;            /* 크림/아이보리 메인 배경 */
  --bg-soft: #F3EBDD;
  --primary: #3E2723;       /* 에스프레소 브라운 */
  --primary-2: #4A3525;
  --secondary: #C87D55;     /* 앰버/코랄 브라운 */
  --text: #2C2C2C;
  --text-muted: #7A6E66;
  --card: #FFFFFF;
  --border: #EADFD0;
  --radius: 16px;
  --header-h: 56px;
  --nav-h: 64px;
}
```

- 톤: 따뜻하고 아기자기한 감성. 둥근 모서리, 부드러운 그림자, 이모지(☕🐶🐥) 포인트 사용.
- 🐶 강쥐 색 `--dog`, 🐥 공쥬 색 `--chick`으로 비교 막대를 구분한다.
- 로스팅 색은 옅은 색 → 짙은 색: `--roast-light-*` → `--roast-ml-*` → `--roast-m-*` → `--roast-md-*` → `--roast-d-*`(bg/fg 쌍). `.roast-<level>` 클래스가 `--roast-bg`/`--roast-fg`를 설정하고 pill·칩·통계 막대가 함께 쓴다.
- 정보 pill: 기본 `--pill-bg`, 카페인·₩/g는 `--caffeine-*`(파랑), 디카페인은 `--decaf-*`(초록).
- 폰트: 시스템 폰트 스택(`-apple-system, 'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', sans-serif`).

### 레이아웃
- 모바일 퍼스트. 앱 컨테이너 `max-width: 480px; margin: 0 auto;` 로 중앙 정렬, 데스크톱에서는 바깥 배경을 살짝 어둡게 해 "폰 화면" 느낌.
- **상단 고정 헤더**: 왼쪽 "Coffee Journey ☕" 타이틀, 오른쪽 동기화 상태 점 + **새 기록(⊕) 버튼**.
- **하단 고정 네비게이션** 3탭: [기록 목록] [위시리스트] [통계/설정]. 새 기록은 헤더 버튼으로만 연다. 활성 탭은 `--primary` 강조.
- 고정 바는 480px 컨테이너 폭에 맞추고, 본문에 헤더/네비 높이만큼 padding.
- iOS 노치/홈 인디케이터 대응: `viewport-fit=cover` + `env(safe-area-inset-*)`.
- 가로 스크롤이 생기지 않도록 한다.

### 모바일 터치 UX 규칙
- 터치 타깃 최소 **44×44px**. 칩·버튼 사이 간격 8px 이상.
- 입력 폰트 크기 **16px 이상**(iOS 자동 확대 방지).
- 숫자 입력은 `inputmode="numeric"` / `"decimal"`.
- 슬라이더: 커스텀 스타일한 `<input type="range">`, thumb 28px, 채움 색은 `--secondary`(`--fill` 변수로 갱신). `touch-action: pan-y`로 세로 스크롤과 충돌 방지.
- `-webkit-tap-highlight-color: transparent` + `:active` 시 살짝 눌림(scale 0.97) 피드백.
- hover 스타일은 `@media (hover: hover)` 안에서만.

### 애니메이션
- 탭 전환 fade/slide, 카드 등장 stagger, 바텀시트 slide-up, 토스트 fade.
- `transform`/`opacity`만 애니메이션. 지속시간 150–300ms, `ease-out` 계열.
- `@media (prefers-reduced-motion: reduce)`에서 애니메이션 최소화.

## 코딩 컨벤션

- UI 문구는 한국어, 코드 식별자·주석은 영어.
- `const`/`let`만 사용, `var` 금지. 2칸 들여쓰기, 세미콜론 사용, 작은따옴표.
- `alert()` 대신 토스트, 삭제/초기화 확인은 `confirm()` 허용.
- 접근성: 아이콘 버튼에 `aria-label`, 바텀시트는 `role="dialog"` + `aria-modal`, ESC/배경 탭으로 닫기, 포커스 복귀.

## 변경 시 확인 체크리스트

- [ ] 375px 폭에서 가로 스크롤·잘림 없음, 480px 이상에서 중앙 정렬 유지
- [ ] 원두 이름 없이 저장 불가, 그램 당 가격 실시간 미리보기 + 저장(0/빈 값이면 `null`, 표시 `-`)
- [ ] 새로고침 후 데이터 유지, 첫 방문에만 seed 생성, v1 데이터는 마이그레이션 후 사용자 기록 보존
- [ ] 검색 + 필터(브랜드·종류·로스팅) + 정렬이 함께 올바르게 동작
- [ ] 빈 점수는 `null`로 저장되고 `-`로 표시, 평균에서 제외
- [ ] Export → Import 왕복 시 데이터 동일, 잘못된 JSON은 기존 데이터 보존
- [ ] 동기화: 두 기기에서 추가·수정·삭제·위시·태그가 서로 반영, 새로고침 후에도 연결 유지 (실제 Firebase 없이 테스트할 땐 gstatic SDK를 가짜 Firestore로 대체)
- [ ] 콘솔 에러 없음
