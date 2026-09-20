# BADA — App Store 재심사 제출 체크리스트

> ✅ **2026-09-16, 빌드 16 승인됨.** 아래 절차는 세 번째 제출에서 통과한 기록입니다.
> 다음 버전(1.0.1) 제출 때 같은 순서로 쓰세요. 리젝 이력과 각 결함의 원인은
> 문서 하단 "참고 — 이미 완료된 것들"에 남아 있습니다.

Guideline 2.1 → 해결됨. 이제 **Guideline 4 (Design)** 리젝 대응 중. **빌드 #12** 기준.

> ⚠️ **#12만 제출하세요.** #11은 iPad에서 온보딩 화면이 겹쳐 보이고 애플 지도
> 선택지가 없어 Guideline 4로 리젝됐습니다.
>
> | # | 내용 | 담긴 빌드 | 검증 |
> |---|---|---|---|
> | 1 | **사진 피커가 닫히지 않음** — RN Modal 안에서 pageSheet로 뜬 피커의 promise가 resolve되지 않음. `presentationStyle: FULL_SCREEN`으로 수정 | #8 | ✅ 실기기 확인 |
> | 2 | **업로드가 한 번도 성공한 적 없음** — `fetch(file://)`는 RN에서 지원되지 않아 이미지를 읽지 못했음. 프로덕션 `avatars`·`post-images` 버킷이 **둘 다 완전히 비어 있던 것**이 증거(프로필 사진도 동일하게 고장). `expo-file-system`의 `File.arrayBuffer()`로 교체 | **#9** | ✅ 실기기 확인 (프로덕션 스토리지에 파일 저장 확인) |
> | 3 | **자기 게시글 수정/삭제 UI 없음** — DB 정책은 이미 있었고 화면 버튼만 없었음 | #8 | ✅ 실기기 확인 |
> | 4 | **사진 권한 문구 부정확** — "프로필 사진용"이라고만 안내하면서 게시글 첨부에 사용 | #8 | ✅ |
> | 5 | **서울 외 장소 노출** — 지방 도시 장소가 Explore에 한글 이름으로 노출. 앱에 서울 필터 추가 (프로덕션 데이터는 정리 완료) | #8 | ✅ |
> | 6 | **가입 500 에러 + 원본 JSON 노출** — `profiles.handle`이 이메일 앞부분에서 파생되는데 UNIQUE 충돌 처리가 없어 앞부분이 겹치면 가입 전체가 실패. 서버(migration-028)로 수정, 에러 표시 정제는 **#11** | **#11** | ✅ 서버 검증 (3연속 충돌 가입 성공) |
> | 7 | **iPad에서 온보딩 화면 겹침** — 이름 입력 단계만 스크롤 컨테이너가 아니어서, 키보드가 뜨면 입력창이 Continue 버튼 위로 넘침. 네 단계 모두 ScrollView로 통일 + 키보드 뜨는 시트 2개도 높이 제한·스크롤 추가 | **#12** | ⚠️ iPhone 확인, iPad 키보드 조건은 미재현 |
> | 8 | **애플 지도 선택지 없음** — 모든 지도 연동이 네이버 지도로만 향함. 장소 상세·플래너 모두 선택 시트로 바꾸고 Apple Maps 상시 제공 | **#12** | ⚠️ 코드·타입 확인, 실기기 미검증 |
>
> 1~6은 검증 완료. **7·8이 이번 라운드 수정이며, iPad 실기기 검증은 못 했습니다** (시뮬레이터 조작 권한 제약). 설치 후 온보딩 이름 화면과 Get directions를 먼저 확인하세요.

---

## ⬜ 0. 가장 먼저 — 화면 녹화 (실제 기기 필요, 본인만 가능)

애플이 명시적으로 요청한 항목이라 이게 없으면 재심사 통과가 어렵습니다.
**소요 시간 3~5분, 끊지 말고 한 번에 촬영.**

### 촬영 전 사전 점검 (전부 만족해야 함)

- [ ] **아이폰 언어가 English** — 설정 → 일반 → 언어 및 지역 → English
      (한국어면 권한 팝업 버튼이 한글로 나와 심사자가 못 읽음)
- [ ] **앱 재설치 완료** — 사진 권한을 한 번도 응답하지 않은 상태여야 함
      (iOS는 권한을 한 번만 물어봄. 이미 응답했으면 팝업이 안 뜸 → 6단계 촬영 불가)
- [ ] **재설치 후 Photo 버튼을 미리 눌러보지 않았음**
- [ ] TestFlight에서 **빌드 #12** 확인
- [ ] 앱 **로그아웃 상태** (1단계가 로그인 화면부터 시작)

**녹화 시작**: 아이폰 제어센터 → 녹화 버튼(●) → 3초 후 앱 실행
(앱이 켜져 있으면 완전 종료 후 처음부터)

### 촬영 순서 (10단계)

> 애플이 명시적으로 요구한 플로우: **회원가입 · 로그인 · 계정삭제 · UGC 신고/차단 · 민감권한**
> 이 중 하나라도 빠지면 같은 사유로 재리젝될 수 있습니다.

1. **앱 실행** — 애플 요구사항: "must begin with launching the app"

2. **게스트 진입** — 로그인 화면 하단 **"Look around first"**

3. **탐색** — Explore 스크롤 → 장소 카드 탭 → 상세 몇 초 → 뒤로

4. **AI 여행 계획** ⭐
   상단 **"Design your K-itinerary"** 배너 → `foodie couple, love cafes and night markets`
   → 생성 → 결과 보여주기
   > 배너가 안 보이면 검색어·카테고리 칩을 모두 해제

5. **로그인** ⭐ ← 애플 요구 `login`
   My 탭 → `dongj1210+reviewer@gmail.com` / `BadaReview2026!`

6. **댓글 관리 + 신고·차단** ⭐ ← 애플 요구 `UGC, reporting and blocking`
   Feed → 글 하나 탭 → 댓글 작성·전송
   → 내 댓글의 **Edit** → 수정 → **Save**
   → **Delete** → 확인 알럿 → **취소**
   → 우측 상단 **`···`** → **"Report this content"** 시트 확인 후 닫기

7. **사진 권한 + 첨부** ⭐ ← 애플 요구 `prompts requesting sensitive data`
   Feed **✏️** → 본문 입력 → **Photo** → **권한 팝업 반드시 화면에**
   → **"Allow Full Access"** → 사진 선택 → 미리보기 확인 → **Post**
   > "Limited Access"를 고르면 피커가 비어 보여 고장난 것처럼 보임

8. **내 게시글 수정·삭제**
   방금 올린 글 탭 → **Edit** → 수정 → **Save** → **Delete** → 삭제 확정

9. **로그아웃 후 회원가입** ⭐ ← 애플 요구 `registration`
   My → 설정(⚙️) → **Sign out**
   → **"Create account"** → 아무 이메일(예: `bada-demo-01@example.com`) + 비밀번호
   → 계정 생성 (인증메일 불필요, 즉시 로그인됨)

10. **계정 삭제** ⭐ ← 애플 요구 `account deletion`
    My → 설정(⚙️) → **Delete account**
    → 확인 알럿에서 **"Delete my account"** 를 **실제로 누르기**
    → 로그인 화면으로 돌아오는 것까지 촬영
    > 프로덕션에서 정상 동작 검증 완료 (RPC `delete_account`, HTTP 204)

> ⚠️ **리뷰어 계정을 삭제하지 마세요.** 심사자가 그 계정으로 테스트해야 합니다.
> 9단계에서 만든 일회용 계정을 10단계에서 지우는 구조라, 회원가입과 계정삭제를
> 한 번에 보여주면서 리뷰어 계정은 그대로 남습니다.

> ⚠️ Buddy(1:1 채팅) 화면은 어디에도 노출 금지
> ⚠️ 폰이 **최신 iOS**인지 확인 — 애플이 "running the latest operating system" 명시

**업로드**: 유튜브 **"일부공개"(Unlisted)** 또는 Google Drive "링크가 있는 모든 사용자"
→ 링크를 아래 Notes 맨 끝에 붙여넣기

> ⚠️ 유튜브에서 **"비공개"(Private)를 고르면 안 됩니다.** 지정한 계정만 볼 수 있어
> 심사자가 영상을 열지 못하고 그대로 리젝 사유가 됩니다.
> 반드시 **"일부공개"** (링크가 있는 모든 사용자가 시청 가능).
>
> 업로드 후 **시크릿 창에서 링크를 직접 열어** 재생되는지 꼭 확인하세요.

---

## ⬜ 1. App Review Information → Notes (전체 삭제 후 교체)

> 지금 이 칸에 `Email: <리뷰용 계정 이메일>` 같은 **플레이스홀더가 그대로 남아있음**.
> 반드시 전체 지우고 아래로 교체.
> (Sign-In Information의 이메일/비밀번호 입력칸 자체는 이미 정상 입력됨 — 건드릴 필요 없음)

```
This is a resubmission responding to your Guideline 2.1 request. The screen
recording linked at the end of this note was captured on a physical device and
covers every flow you listed: account registration, login, account deletion,
user-generated content with reporting and blocking, and the photo library
permission prompt. The app has no paid content, so no purchase flow appears.
All seven requested items are answered below.

Since the original submission we also fixed defects found in our own device
testing, all included in this build: attaching a photo to a post did not work
(the picker did not dismiss and the upload never completed); users could edit
and delete their own comments but not their own posts; the photo library
purpose string described only profile pictures; and sign-up could fail with a
server error when a new user's email local-part matched an existing account.

BADA doesn't require an account to review. Tap "Look around first" on the
opening screen to browse everything: 4,000+ places, the AI trip planner,
guides, and the community feed (read-only as a guest).

To test posting and comments, create an account with any email address (no
confirmation email required), or sign in with this account:
  Email: dongj1210+reviewer@gmail.com
  Password: BadaReview2026!

Signed-in users can edit or delete their own content, both posts and comments.
The Edit and Delete links appear directly under any post or comment you wrote.
Users can also report or block other people's content: open any post and tap
the "..." button in the top right.

App description and target audience: BADA helps foreign, English-speaking
travelers plan and navigate trips to Seoul, South Korea. It surfaces vetted
local places along with the practical details foreign visitors care about,
such as card acceptance, posted pricing, and whether a spot is comfortable to
visit alone, and it shows each place's Korean name and address on a card the
traveler can hold up to staff or a taxi driver. It also builds a day-by-day
itinerary from a plain-language description of the trip, and lets travelers
trade advice with each other through a shared feed.

External services used: Supabase for the backend, auth, and storage. OpenAI's
API powers the natural-language trip planner. The model only interprets what
the traveler describes; it never selects or invents places itself, our own
catalog and routing logic handle that part, and this is disclosed in the
in-app Privacy Policy under "AI trip planning." We also use the Naver Cloud
Platform Maps SDK, Naver's Local Search API, Korea Tourism Organization's
TourAPI, Visit Seoul Open Data for the place catalog, the Korea Meteorological
Administration's Open API for live weather, and Expo's push notification
service.

Maps: tapping directions asks which map app to use and always offers Apple
Maps alongside Naver Map. Naver is listed first because it is substantially
better inside Korea (Korean addresses, live bus arrivals, domestic transit
routing), but the native Apple Maps option is present on every map hand-off in
the app, on both the place detail screen and the trip planner's leg-by-leg
directions. If Naver Map is not installed the request falls back to a web map.

Regional differences: none. The app works the same for every user regardless
of region.

Regulated industry and third-party material: not applicable. Place data comes
from South Korea's official open-data programs, public APIs meant for
third-party use. K-drama and film filming locations are mentioned as
editorial travel information only. We don't reproduce any copyrighted footage
or stills.

Devices tested: iPhone 13, iOS 18.0, via TestFlight. Also tested on the iOS
Simulator (iPhone 17 Pro Max, iOS 26.5) and on an iPad Air 11-inch simulator
running the app in iPhone compatibility mode, after your review reported layout
issues on iPad.

Screen recording (unlisted YouTube): https://youtu.be/ecYdJAs5qDk
```

---

## ⬜ 2. 연령 등급 수정

앱 정보 → 연령 등급 → 편집 → 1단계
**"메시지 및 채팅"** 항목: `예` → **`아니요`**

> Buddy 1:1 채팅을 제거했으므로 반드시 수정해야 함. 안 고치면 기능과 등급이 불일치.

---

## ⬜ 3. 설명(Description) — 전체 교체

> 1,861자 / 4,000자. (최종본 — 사용자 확정) em dash 없음. 아래 내용은 전부 앱에 실제로 있는 기능만 서술.

```
Planning a Korea trip usually means lots of tabs: a blog post from 2019, a video with no address, a forum thread arguing about which market is worth it.

BADA collects that local knowledge in one place, checked and kept current, and written for someone who does not read Korean.

WHAT LOCALS KNOW, WRITTEN DOWN
How subway transfers actually work, and what forgetting to tag off costs you. What street food should cost. How a Korean meal goes, from ordering to paying at the counter. How to order delivery without a Korean phone number. Which day trip is worth the train fare. The things nobody tells you until you have already gotten them wrong.

THE DETAILS OTHER APPS SKIP
Places carry the practical notes a foreign visitor needs before walking in: whether cards are accepted, whether pricing is posted clearly, whether it is comfortable to eat alone. Travelers confirm each one, tag by tag. Every place also shows its Korean name and address on a card you can hold up to staff or a taxi driver.

4,000+ PLACES ACROSS SEOUL
Restaurants, cafes, palaces, markets, parks, and the quiet corners most first trips never reach. Sourced from Korea's official tourism data and kept current.

PLAN A TRIP IN ONE SENTENCE
Describe it in your own words. "Quiet cafes and old palaces, skip the crowds." BADA turns that into a day-by-day route in sensible order, with real travel time between stops. Rain in the forecast? It reworks the plan around it.

WHAT'S ON THIS WEEK
Live festival listings from the national tourism board, so you see what is genuinely happening while you are here, not what was happening last spring.

REAL TRAVELERS, REAL ADVICE
A feed of tips, routes, and questions from other foreign visitors. Post your own, or just read what worked for someone else last week.

Browsing is free and needs no account. Sign up only if you want to post or comment.
```

> ⚠️ 기존 설명에 **"FIND SOMEONE TO EAT WITH"** 단락이 있으면 반드시 삭제 (Buddy 기능 관련).
> ⚠️ "English menu"는 의도적으로 뺐습니다. 해당 태그가 붙은 장소가 프로덕션에 0건이라
> 광고하면 과장이 됩니다. 여행자 투표로 쌓이면 그때 추가하세요.

---

## ⬜ 4. 프로모션 텍스트 (170자 제한)

> 150자. 언제든 재심사 없이 교체 가능한 칸입니다.

```
Walk into Seoul like you already know your way around. Describe your trip in a sentence and BADA builds the route, from 4,000+ places worth your time.
```

---

## ⬜ 5. 키워드 (100자 제한)

> 92자. 앱 이름이 "BADA: Korea Travel Guide"라 `korea`/`travel`/`guide`는 이미 색인되어
> 있어 제외했습니다. 쉼표 뒤 공백도 글자 수를 먹으므로 넣지 마세요.

```
seoul,itinerary,trip,planner,kdrama,kpop,filming,solo,kfood,kbeauty,hanok,subway,sightseeing
```

---

## ⬜ 6. 저작권

```
2026 Dongjin Lee
```
(이미 입력돼 있으면 그대로 두면 됨)

---

## ⬜ 7. 스크린샷 점검

6.9" 스크린샷 세트에 **Buddy 탭이 보이는 장면이 있는지 확인**.
있다면 다른 화면(Feed, Themes 등)으로 교체 필요.
→ 어느 파일인지 알려주시면 새로 찍어드립니다.

---

## ⬜ 7.5. 부제 (Subtitle) — 확정

앱 정보 → 현지화 가능한 정보 → **부제**:

```
Seoul trips, food & local tips
```

> 한때 `Korea trips…`로 바꿔뒀으나 되돌림. 이유 두 가지: `Korea`는 앱 이름
> (BADA: Korea Travel Guide)에 이미 있어 30자 중 검색 키워드를 낭비하고,
> 카탈로그가 실제로는 서울 전용이라 `Korea`는 심사에서 과장으로 읽힐 수 있음.

---

## ⬜ 8. 빌드 선택 → 제출

심사 대상 빌드를 **#16** 으로 지정 후 제출.

> ⚠️ **#13·#14는 제출하지 말 것.** #14는 #16으로 대체됨.
> ⚠️ **#13** 아이패드에서 날씨·공휴일 시트를 닫을 수 없는
> 버그(스크림 높이 0 + 닫기 버튼 없음)가 들어 있음. 그 수정이 들어간 새 빌드를
> 쓸 것. 번호는 추측하지 말고 빌드 결과에서 확인 — 원격 autoIncrement 때문에
> 연속하지 않음 (#12는 실패한 빌드가 소모).
> (ASC 심사 페이지에 한동안 아주 오래된 #3이 붙어 있었고, 그 뒤엔 #9가 붙어 있었음. 제출 직전 눈으로 확인.)

---

## 참고 — 이미 완료된 것들

- ✅ Buddy 탭·1:1 채팅 기능 제거 (앱 + 법적 문서 + GitHub Pages 반영)
- ✅ 가입 차단하던 이메일 인증 버그 수정
- ✅ 댓글 수정/삭제 기능 추가 (애플 요청 대응)
- ✅ 신고/차단 기능 존재
- ✅ 계정 삭제 기능 존재
- ✅ 사진 피커 dismiss 버그 수정 (#8, 실기기 확인)
- ✅ 게시글 수정/삭제 기능 추가 (#8, 실기기 확인)
- ✅ 사진 업로드 수정 (#9, 프로덕션 스토리지에 파일 저장 확인)
- ✅ iPad 레이아웃(온보딩 이름 화면) + 애플 지도 선택지 (#13, **실기기 iPad 검증 완료**)
- ✅ iPad에서 닫을 수 없던 날씨·공휴일 시트 수정 + 모달 13개 전수 감사 (시뮬레이터 검증)
- ✅ 주간예보 `0°/0°` 및 새벽 시간대 날짜 하루 밀림 수정 (엣지 함수, 실데이터 검증)
- ✅ 사진 업로드 용량 초과 시 실제 크기를 알려주는 안내로 교체 (avatars 5MB / post-images 8MB)

- ✅ 로그인 화면 여백 조정 — 아이패드에서 법적 링크까지 한 화면에 들어옴 (시뮬레이터 검증)
- ✅ 사진 업로드 전 자동 축소 (`expo-image-manipulator` 추가, 긴 변 2000px / 아바타 1024px, JPEG 0.8)
  - ⚠️ **네이티브 모듈이 새로 추가됨** → 이 빌드는 반드시 설치 후 사진 첨부를 실기기에서 확인할 것
  - 모듈은 `require()`로 지연 로딩 — 없거나 실패해도 앱은 부팅되고 원본 업로드로 폴백 (시뮬레이터에서 확인)

### 서버 작업 (빌드와 무관, SQL/배포만)
- ✅ `seoul-weather` 엣지 함수 배포 — 운영 완료 (version 8, 09-13 11:36)
- ⬜ `seoul-weather` 개발 환경 배포 (`--project-ref iqezjcmpsgawgkvjzcaa`)
- ⬜ `migration-029-route-feedback-private-votes.sql` — 운영·개발 양쪽 SQL 에디터에서 실행.
  루트 피드백 개별 투표가 전체 공개(`using (true)`)라 "누가 어느 루트에 무엇을 눌렀는지"
  조회가 가능했음. 화면의 집계 숫자는 `posts.feedback_counts`에서 오므로 영향 없음.

### 아직 남은 것 (1.0.1)
- ⬜ **앱 내 피드백 창구** — 설정에 한 줄 + 장소 상세에 "정보가 틀렸나요?".
  v1.0에는 없음: 법적 문서가 번들 HTML이고 설정도 앱 코드라 빌드가 필요한데,
  1.0이 이미 승인돼 출시 대기 중이었음. 그 사이에는 App Store 지원 URL로 대체
  (빌드 불필요, 언제든 교체 가능. 단 사용자가 앱을 나가야 보임).
- ⬜ **지방 도시 기능 복원** — 미루는 이유는 "빌드가 필요해서"가 **아님**. 심사가
  진행 중일 때 운영 DB 내용을 바꾸면 안 되기 때문. 빌드 7 심사 중에 지방 장소
  336개를 운영에 넣었다가 한국어 이름 카드가 심사자에게 노출된 전례가 있음.
  지금은 Explore에 서울 필터가 있어 위험이 낮아졌지만 0은 아니고, 심사 중에
  지금 할 이득이 전혀 없음. **통과 후 실행.**
  (`city-day-trips` PlacesBlock 주석 해제 + 임포트 스크립트 2개)
- ⬜ (없음)
