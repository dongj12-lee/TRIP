# Resolution Center 답장 — Guideline 4 (Design)

App Store Connect → 앱 심사 → 메시지 하단 **"앱 심사에 회신"** 에 붙여넣으세요.
이번 애플 메시지에는 회신 링크가 있습니다 ("Reply to this message in App Store Connect").

> 제출 빌드: **16** (EAS 조회로 확인, 2026-09-13 13:13 업로드). 아래 본문은 채워져 있습니다.
> 번호가 건너뛴 이유: 12·15는 취소·실패한 빌드가 소모했고, 13은 아이패드에서 닫을 수 없는
> 시트 때문에 제출하지 않았으며, 14는 16으로 대체되었습니다. **반드시 #16인지 눈으로 확인.**

---

```
Thank you for the detailed review and for the screenshots, which made both
issues easy to reproduce. Both are fixed in build 16.


1. GUIDELINE 4 — OVERLAPPING AND OBSCURED ELEMENTS ON iPad

Cause: the onboarding step that asks for a display name laid its content out in
a fixed-height container rather than a scrolling one. It is the only onboarding
step that opens the keyboard. Once the keyboard claimed its share of a shorter
viewport, the heading, description and text field no longer fit, and because the
container neither scrolled nor clipped, the text field overflowed downward and
rendered on top of the Continue button. That is exactly the overlap visible in
the first screenshot you attached.

Fix: that step now uses the same scrolling container as the other three
onboarding steps, so its content scrolls instead of overflowing. Nothing can be
pushed under or over the button any more.

We also audited every remaining screen that raises the keyboard, rather than
fixing only the one you found. Two bottom sheets, Edit profile and Add friend,
had the same structure: a fixed-height sheet inside a keyboard-avoiding view,
which on a short viewport could grow past the top of the screen and put the
sheet's title and controls out of reach. Both are now height-capped and
scrollable.

Testing on an iPad then surfaced a more serious instance of the same root
cause, which we are reporting here because it is the kind of problem your
review is meant to catch. Our bottom sheets are dismissed by tapping the
dimmed backdrop above them, and that backdrop was sized with the space the
sheet left over. Two sheets had no height cap, so on an iPad viewport their
content filled the screen, the backdrop collapsed to zero height, and with no
close button and no swipe-to-dismiss on a transparent modal there was no way
out of the sheet at all. We have audited all thirteen modals in the app: every
one is now height-capped so a tappable backdrop always remains, and the two
affected sheets additionally have an explicit close button.


2. GUIDELINE 4 — APPLE MAPS OPTION

You are right that the app previously routed every map action to a third-party
app with no alternative. That has been changed.

Every map hand-off in the app now presents a choice, and Apple Maps is always
one of the options:

- Place detail screen > "Get directions"
- Trip planner > per-leg directions between two stops

Choosing Apple Maps launches the native app through the documented
maps.apple.com URL scheme, using ll/q to show a place and saddr/daddr/dirflg
for a route, with the travel mode carried across (walking, transit, driving).

Naver Map remains in the list, and is offered first, because inside South Korea
it provides transit routing, live bus arrival times and Korean-language address
search that materially help our users, who are foreign visitors navigating
Seoul. It is now an option rather than the only path.


TESTING

Both fixes were verified on device and in the iOS Simulator, including an
iPad Air 11-inch running the app in iPhone compatibility mode, which is the
configuration your screenshots show.

Please let us know if anything else needs attention. Thank you for your time.
```

---

## 함께 갱신해야 할 것

- **App 심사 정보 → 메모**: 지도 설명이 이미 새 동작(애플 지도 선택지 포함)으로 갱신돼 있습니다. [체크리스트 1번](appstore-submission-checklist.md) 참조.
- **빌드**: 새 빌드를 올린 뒤 배포 → 1.0 → 빌드 섹션에서 지정.
