# TRIP (mobile) — Expo React Native 앱

`../README.md`의 디자인 레퍼런스를 실제 앱으로 이식한 프로젝트입니다.
스택: **Expo SDK 54 · React Native 0.81 · expo-router · Supabase**.

(SDK는 원래 57로 시작했으나, App Store의 Expo Go 앱이 아직 SDK 57을 지원하지
않아 — 심사 대기 중 — 개발 중 실기기 테스트를 위해 54로 다운그레이드했습니다.)

## 지금 상태

- ✅ 온보딩 3단계 (지역/관심사) + 이메일 로그인/회원가입
- ✅ 5개 탭: Explore / Themes / Feed / Buddy / My — Supabase 연결 시 실데이터, 미연결 시 목업 데이터로 자동 폴백
- ✅ 상세 화면: Place(외국인 적합도·번역 시트) / Theme(walk·guide) / Post(댓글 작성 포함) / Buddy(참여) / Creator / 여정 플래너(편집+공유) / Compose(실제 글/버디 작성) / Settings
- ✅ 라이트/다크 + 4가지 액센트 테마, Fraunces + Plus Jakarta Sans 폰트
- ✅ Supabase 백엔드: 인증, 장소/테마/포스트/버디 CRUD, 저장·업보트·참여·팔로우·여정 동기화
- ✅ **App Store 심사 필수 항목**: 신고(Report)·차단(Block) UI, 셀프 계정 삭제, 개인정보처리방침·이용약관·커뮤니티 가이드라인 게시(Settings에서 링크)
- ✅ 앱 아이콘/스플래시/적응형 아이콘 에셋 생성 완료
- ✅ iOS 번들 빌드 검증 완료 (`expo export` 통과)
- ⏳ 실제 장소 사진은 아직 플레이스홀더(스와치 그라디언트) — 실사진 소싱 필요
- ⏳ EAS 빌드/제출은 사용자의 Apple Developer 계정 필요 (아래 참고)

## 실행 (개발)

```bash
cd mobile
cp .env.example .env      # Supabase 값 입력 (없어도 목업 데이터로 실행됨)
npm start                 # 터널 모드가 필요하면: npm start -- --tunnel
```

QR/링크를 아이폰의 **Expo Go** 앱으로 열면 됩니다 (Expo Go는 SDK 54까지 지원).
로컬 Xcode 없이 실기기 테스트 가능. 시뮬레이터로 열려면 `npm run ios` (Xcode 필요).

## Supabase 백엔드 세팅 (최초 1회)

1. https://supabase.com → 프로젝트 생성 (Region: Seoul 권장, 무료 플랜)
2. **SQL Editor** → `supabase/schema.sql` 전체 내용 붙여넣고 Run
   - 테이블, RLS 정책, 카운터 트리거, `delete_account()` RPC가 모두 생성됩니다
3. **Settings → API**에서 값 3개를 `.env`에 입력:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # 시드 스크립트 전용, 절대 앱에 배포하지 말 것
   ```
4. 초기 콘텐츠(장소/테마/포스트/버디) 시딩:
   ```bash
   npm run seed
   ```
   재실행해도 안전합니다 (장소/테마/포스트는 slug 기준 upsert, 버디는 이미 있으면 스킵).
5. 앱을 재시작하면 Explore/Themes/Feed/Buddy가 실데이터로 전환됩니다.

### 실제 장소 데이터 채우기

**주 소스: Visit Seoul API 센터.** 서울관광재단이 2025-10-20 공개한 API로, 영문이
기계번역이 아니라 원래 관광객 대상으로 작성된 콘텐츠라 품질이 좋고, 같은 콘텐츠를
7개 언어로 연결 제공해서(`multi_lang_list`) 영문 이름/설명과 진짜 한국어 이름
(`nameKo`, "직원에게 보여주기" 기능에 필요)을 한 소스에서 동시에 얻을 수 있습니다.
TourAPI(한국관광공사)는 이제 보조 소스입니다 — 국문 전용이고 커버리지를 더 넓히고
싶을 때 추가로 돌리는 용도.

**1) Visit Seoul (주 소스)**

1. https://api.visitseoul.net → 회원가입 → 마이페이지 → API 키 관리 → 발급 신청
   (호출할 사이트 URL 등록 필요, 관리자 승인 소요시간 불명 — 바로 안 될 수 있음)
2. Supabase SQL Editor에서 다음 실행 (사진 URL, source 구분, 영문 설명 컬럼 추가):
   ```sql
   -- migration-001-photos.sql 내용
   -- migration-002-source.sql 내용
   ```
3. `.env`에 `VISITSEOUL_API_KEY` 입력
4. 먼저 응답 구조를 확인 (공식 문서에 일부 필드가 명확히 안 나와 있어서, TourAPI 때처럼
   추측하다 삽질하지 않기 위함):
   ```bash
   npm run import:visitseoul -- --discover
   ```
   출력된 카테고리 이름이 스크립트의 `CATEGORY_MAP`과 다르면 `scripts/import-visitseoul.ts`에서
   맞춰준 뒤 진행하세요.
5. 본 실행:
   ```bash
   npm run import:visitseoul
   ```
   `VISITSEOUL_MAX_PAGES`(기본 20)로 가져올 페이지 수를 조절할 수 있습니다. slug가
   `vs-{cid}` 형식이라 재실행해도 안전합니다(upsert).

**2) TourAPI (보조 소스, 선택)**

1. https://www.data.go.kr → "한국관광공사" 검색 → **"한국관광공사_국문 관광정보
   서비스_GW"** 활용신청 (보통 자동승인)
2. `.env`에 `TOURAPI_SERVICE_KEY` 입력
3. ```bash
   npm run import:tourapi
   ```
   `TOURAPI_ROWS_PER_CATEGORY`(기본 40 × 5카테고리 = 200개)로 조절. 재실행 안전(upsert).

**알아두면 좋은 점** (며칠간 삽질해서 확인한 내용, 둘 다 스크립트 헤더에도 적어둠):
- TourAPI의 `detailCommon2`(설명 조회)는 **`contentId`만** 받습니다.
  `contentTypeId`/`defaultYN`/`overviewYN`을 같이 보내면 에러 납니다.
- TourAPI의 **영문 서비스(EngService2)는 국문 서비스와 완전히 별개의 데이터셋**입니다
  (contentId 공간 자체가 다름 — 서로의 ID를 넣으면 결과 0건). 그래서 TourAPI로는
  영문 매칭을 포기했고, 대신 Visit Seoul을 주 소스로 쓰는 이유이기도 합니다.
- 둘 다 외국인 적합도 태그·K-콘텐츠 연결 정보는 제공하지 않습니다 — 이 앱만의 고유
  데이터라서 수입된 장소는 전부 미검증 상태(false/빈값)로 들어가고, 실제 사용자
  투표로 채워지는 구조입니다.
- **무료 Papago 번역(openapi.naver.com)은 2024-02-29부로 종료됐습니다** — 다시
  추천하지 말 것. 번역이 필요해지면 DeepL 무료(월 50만자)나 Google Cloud Translation
  무료(월 50만자)가 현재 확인된 대안이고, NCP 유료 Papago는 품질은 최고지만 정확한
  가격을 사용자가 직접 콘솔에서 확인해야 함 (100만자 단위 올림 과금이라 소량 작업도
  최소 과금 단위가 적용될 수 있음).

### 심사 필수 항목이 스키마/앱에 어떻게 반영됐는지

| 요구사항 | 구현 위치 |
|---|---|
| UGC 신고 (Guideline 1.2) | `reports` 테이블 + `components/ReportSheet.tsx` (Post/Buddy 상세 화면 "···" 버튼) |
| 사용자 차단 (Guideline 1.2) | `blocks` 테이블 + RLS가 차단된 사용자의 글을 자동으로 숨김 |
| 셀프 계정 삭제 (Guideline 5.1.1(v)) | `delete_account()` RPC + Settings → Account → Delete account |
| 개인정보처리방침 / 이용약관 | Settings → About에서 링크 (현재 Claude Artifact에 게시됨 — 아래 참고) |

**⚠️ 법적 문서 관련 확인 필요:**
- `app/settings.tsx`와 `app/auth.tsx`에 걸린 개인정보처리방침/이용약관/커뮤니티
  가이드라인 링크는 임시로 Claude Artifact 페이지입니다. **Artifact는 기본 비공개**이므로,
  Apple 심사관이 접근할 수 있도록 각 페이지에서 **공유(Share) 설정**을 켜주세요.
  장기적으로는 실제 도메인(예: trip-korea.app)으로 옮기는 것을 권장합니다.
- 문서 안에 `[Your Legal Entity Name]` 같은 플레이스홀더가 있습니다 — 실제 사업자명/
  연락처로 교체하고, 정식 서비스 전 변호사 검토를 받으세요. (지금 문서는 표준적인
  스타트업 템플릿 수준이며 법률 자문이 아닙니다.)

## 출시 (EAS Build / Submit)

Xcode 없이도 클라우드에서 앱스토어용 빌드가 가능합니다.

```bash
npm install -g eas-cli
eas login                     # Expo 계정 (무료 가입)
eas init                      # 이 프로젝트를 EAS 프로젝트에 연결
```

`eas.json`의 `submit.production.ios` 값을 채워주세요:
```json
"appleId": "본인 Apple ID 이메일",
"ascAppId": "App Store Connect 앱 고유 ID",
"appleTeamId": "Apple Developer Team ID"
```
(App Store Connect에서 앱을 먼저 하나 만들어야 `ascAppId`가 생깁니다. `eas submit`을
처음 실행하면 대화형으로 이 값들을 자동으로 채워주기도 합니다.)

```bash
eas build --platform ios --profile production    # 클라우드 빌드 (~15-20분)
eas submit --platform ios --latest                # 빌드 결과물을 App Store Connect에 업로드
```

이후 App Store Connect 웹에서: 스크린샷 업로드, 앱 설명 작성, 심사 제출.
UGC 앱이므로 **App Review 정보**란에 "Report/Block은 게시글 상세의 ··· 버튼,
계정 삭제는 설정 화면에 있습니다"라고 적어두면 심사가 빨라집니다.

**Apple Developer 계정 관련**: 사업자 계정은 D-U-N-S 번호 처리로 몇 주 걸릴 수
있습니다. 개인 계정(연 $99, 즉시 승인)으로 먼저 출시하고 나중에 이관하는 것을
권장합니다.

## 구조

```
app/                    expo-router 라우트
  (tabs)/               5개 탭
  auth.tsx              로그인/회원가입
  place|theme|post|buddy|creator/[…].tsx   상세 화면
  planner.tsx           여정 플래너
  compose.tsx           글/버디 작성
  settings.tsx          설정 + 계정 삭제
components/             Icon·ui·cards·base·ExploreMap·ReportSheet
theme/                  디자인 토큰 + ThemeProvider
data/                   타입 + 시드 데이터(data.jsx 이식) + remote.ts(Supabase 매핑)
lib/
  store.tsx             앱 상태 (저장/업보트/참여/팔로우/여정) — 로컬 캐시 + Supabase 동기화
  auth.tsx              인증 상태
  remoteData.tsx        원격 콘텐츠 로딩 + 로컬 폴백
  supabase.ts           Supabase 클라이언트
supabase/schema.sql     DB 스키마 + RLS + 트리거 + delete_account()
scripts/
  seed.ts               초기 콘텐츠 시딩 (service role key 필요)
  gen-assets.mjs         앱 아이콘/스플래시 생성 스크립트
```
