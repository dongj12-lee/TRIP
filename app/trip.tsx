// Dedicated multi-day trip planner, the app's headline feature.
//
// The single-day "Plan my day" sheet answers "what do I do today?". This
// screen answers the question most visitors actually arrive with: "I have
// 2박 3일 in Seoul, what should I do?" It plans the whole trip as one object
// (see lib/tripPlan.ts) so the days don't collide, don't repeat, and don't all
// land in the same neighbourhood.
import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { VIBES, VibeKey } from '@/lib/dayPlan';
import { fetchTripSteer, TripSteer } from '@/lib/tripIntake';
import { useRequireAuth } from '@/lib/requireAuth';
import { TripDay, TripPlan, dayHeadline, generateTripPlan, tripToItineraryDays } from '@/lib/tripPlan';
import { removeStop, replaceStop, swapCandidates } from '@/lib/tripEdit';
import { ChatTurn, applyTripChatOps, sendTripChat } from '@/lib/tripChat';
import { tierOf } from '@/lib/prominence';
import { placeBlurb } from '@/lib/placeBlurb';
import { tipForDay, DayTip } from '@/lib/dayTips';
import { SwapStopSheet } from '@/components/SwapStopSheet';
import { ChatBubble, TripChatDock } from '@/components/TripChatDock';
import { FlightTimesRow } from '@/components/FlightTimesRow';
import { fetchSeoulWeather } from '@/lib/weather';
import { to12h } from '@/lib/timeUtils';
import { T, H, Screen, DetailHeader, Button } from '@/components/base';
import { Photo } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptics';

// English only, one line per chip. The Korean "2박 3일" reading was the second
// line on every chip and said nothing extra to the traveller this screen is
// for, so it cost four lines of type for no information.
const LENGTHS = [2, 3, 4, 5];

export default function TripPlannerScreen() {
  const { c, tone } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  const requireAuth = useRequireAuth();
  const { places, themes } = useRemoteContent();
  const { profile, saved, placeReactions, itinerary, setItinerary, shareTrip } = useStore();

  const [days, setDays] = useState(3); // 2박 3일, the default Seoul trip
  const [vibe, setVibe] = useState<VibeKey | null>(null);
  const [rainy, setRainy] = useState(false);
  const [openDay, setOpenDay] = useState(0);
  const [arriveHour, setArriveHour] = useState<number | null>(null);
  const [departHour, setDepartHour] = useState<number | null>(null);
  const [flightsOpen, setFlightsOpen] = useState(false);

  // The plan is generated synchronously and is ready before the first paint, so
  // the screen opens on the answer, not on a form. The inputs live behind one
  // summary row that states what produced the plan and opens on tap.
  const [controlsOpen, setControlsOpen] = useState(false);

  // Natural-language taste intake: the traveller describes their trip, the
  // model maps it onto the generator's knobs (see lib/tripIntake.ts). The steer
  // supersedes the saved onboarding interests for this trip only; the manual
  // vibe chips below stay live as a fine-tune / fallback.
  const [intakeText, setIntakeText] = useState('');
  const [intakePending, setIntakePending] = useState(false);
  const [steer, setSteer] = useState<TripSteer | null>(null);

  const runIntake = async (text: string) => {
    const q = text.trim();
    if (!q || intakePending) return;
    haptic.tick();
    setIntakePending(true);
    try {
      const s = await fetchTripSteer(q, profile.interests);
      setSteer(s);
      if (s.vibe) setVibe(s.vibe);
      haptic.success();
    } catch {
      showToast('Couldn’t reach the trip assistant', '⚠️');
    } finally {
      setIntakePending(false);
    }
  };
  const clearSteer = () => { haptic.tick(); setSteer(null); setIntakeText(''); setVibe(null); };

  // The steer overrides saved interests for this trip only.
  const activeInterests = steer && steer.interests.length ? steer.interests : profile.interests;

  useEffect(() => {
    fetchSeoulWeather()
      .then((w) => {
        const today = w.daily[0];
        setRainy((today?.rain ?? 0) >= 55 || [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(w.code));
      })
      .catch(() => {});
  }, []);

  const generated: TripPlan | null = useMemo(
    () =>
      places.length
        ? generateTripPlan({
            places,
            days,
            interests: activeInterests,
            saved,
            reactions: placeReactions,
            rainy,
            vibe: vibe ?? undefined,
            arriveHour: arriveHour ?? undefined,
            departHour: departHour ?? undefined,
            pace: steer?.pace ?? undefined,
            avoid: steer?.avoid,
          })
        : null,
    [places, days, activeInterests, saved, placeReactions, rainy, vibe, arriveHour, departHour, steer],
  );

  // The generated plan is a starting point, not a verdict. User edits live in
  // their own state layered on top, and are dropped whenever the inputs that
  // produced the plan change (a new trip length is a new trip, so keeping the
  // old day-2 swap would be meaningless).
  const [edited, setEdited] = useState<TripPlan | null>(null);
  useEffect(() => {
    setEdited(null);
  }, [generated]);
  const trip = edited ?? generated;

  // Which stop the swap sheet is currently acting on.
  const [swapTarget, setSwapTarget] = useState<{ dayIndex: number; slug: string; role: string } | null>(null);
  const swapCurrent = useMemo(() => {
    if (!trip || !swapTarget) return null;
    const d = trip.days.find((x) => x.dayIndex === swapTarget.dayIndex);
    return d?.plan.stops.find((s) => s.place.slug === swapTarget.slug)?.place ?? null;
  }, [trip, swapTarget]);
  const swapOptions = useMemo(
    () => (trip && swapTarget ? swapCandidates(trip, swapTarget.dayIndex, swapTarget.slug, places) : []),
    [trip, swapTarget, places],
  );

  // Chat editing. The model only says *what* to change; applyTripChatOps
  // resolves that against the real catalog (see lib/tripChat.ts), so a chat
  // edit lands in exactly the same state layer as a manual swap.
  const [chat, setChat] = useState<ChatBubble[]>([]);
  const [chatPending, setChatPending] = useState(false);
  useEffect(() => {
    setChat([]);
  }, [days]);

  const askChat = async (text: string) => {
    if (!trip) return;
    const base = trip;
    setChat((prev) => [...prev, { role: 'user', content: text }]);
    setChatPending(true);
    try {
      const history: ChatTurn[] = chat.map((m) => ({ role: m.role, content: m.content }));
      const { reply, operations } = await sendTripChat(text, base, history);
      const { trip: next, changed, vibe: nextVibe } = applyTripChatOps(base, operations, places, {
        interests: activeInterests,
        saved,
        reactions: placeReactions,
        rainy,
        vibe: vibe ?? undefined,
        arriveHour: arriveHour ?? undefined,
        departHour: departHour ?? undefined,
        pace: steer?.pace ?? undefined,
        avoid: steer?.avoid,
      });
      if (changed) setEdited(next);
      // A vibe change re-runs the generator, which resets `edited`, so apply
      // it last and let it win over any per-stop edits in the same message.
      if (nextVibe && nextVibe !== vibe) setVibe(nextVibe);
      if (changed || nextVibe) haptic.success();
      setChat((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply || (changed || nextVibe ? 'Updated your trip.' : 'Nothing to change there.'),
        },
      ]);
    } catch {
      setChat((prev) => [
        ...prev,
        { role: 'assistant', content: 'Couldn’t reach the trip assistant. You can still tap “Change” on any stop.', error: true },
      ]);
    } finally {
      setChatPending(false);
    }
  };

  const totalStops = trip?.days.reduce((s, d) => s + d.plan.stops.length, 0) ?? 0;
  const mustSees = trip?.days.reduce((s, d) => s + d.plan.stops.filter((st) => tierOf(st.place) === 'S').length, 0) ?? 0;

  // What the collapsed summary row says the plan was built from. The steer's
  // own sentence wins when there is one — it is the traveller's wording, and
  // more specific than any vibe name. Null when neither is set: the default
  // "Balanced" is the absence of a choice, and printing it just puts a word on
  // screen that tells the traveller nothing.
  const tasteLabel = steer?.summary || (vibe ? VIBES[vibe].label : null);
  const flightsSet = arriveHour != null || departHour != null;

  // Build the editable itinerary this trip becomes, shared by "Save" and
  // "Share for feedback" so both persist the same plan.
  const buildItinerary = () => ({
    ...itinerary,
    title: itinerary.title?.trim() || 'My Seoul trip',
    days: tripToItineraryDays(trip!),
  });

  const saveTrip = () => {
    if (!trip) return;
    haptic.success();
    setItinerary(buildItinerary());
    showToast(`${trip.days.length}-day trip saved`, '🗺️');
    router.push('/planner');
  };

  // Straight from the planner to the Feed: saves the trip, then posts it as a
  // Route others can react to. Closes the plan → share → feedback loop without
  // the detour through the itinerary editor.
  const [sharing, setSharing] = useState(false);
  const shareForFeedback = async () => {
    if (!trip || sharing) return;
    if (!requireAuth('share your route for feedback')) return;
    haptic.success();
    setSharing(true);
    const it = buildItinerary();
    setItinerary(it);
    try {
      await shareTrip('', it);
      showToast('Shared, feedback incoming', '🙏');
      router.replace('/(tabs)/feed');
    } catch {
      showToast('Couldn’t share your trip, try again', '⚠️');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen>
      <DetailHeader title="Plan my trip" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {!controlsOpen && (
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Pressable
              onPress={() => { haptic.tick(); setControlsOpen(true); }}
              accessibilityRole="button"
              accessibilityState={{ expanded: false }}
              accessibilityLabel={`Trip settings: ${days} days${tasteLabel ? `, ${tasteLabel}` : ''}. Double tap to change.`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: c.surface, borderWidth: 1, borderColor: c.line,
                borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
              }}
            >
              <T style={{ fontSize: 14, fontWeight: '800' }}>{days} days</T>
              {tasteLabel && <T style={{ fontSize: 13, color: c.line }}>·</T>}
              <T style={{ flex: 1, fontSize: 13, fontWeight: '600', color: steer ? c.accent : c.inkSoft }} numberOfLines={1}>
                {tasteLabel ?? ''}
              </T>
              {flightsSet && <T style={{ fontSize: 12 }}>✈️</T>}
              <Icon name="edit" size={15} stroke={c.muted} sw={1.8} />
            </Pressable>
            {rainy && (
              <T style={{ fontSize: 12.5, color: c.muted, marginTop: 8 }}>
                ☔️ Rain likely, we’ve kept things mostly indoor.
              </T>
            )}
          </View>
        )}

        {controlsOpen && (
        <>
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <H style={{ flex: 1, fontSize: 25, lineHeight: 31 }}>How long in Seoul?</H>
            <Pressable
              onPress={() => { haptic.tick(); setControlsOpen(false); }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Done editing trip settings"
            >
              <T style={{ fontSize: 13.5, fontWeight: '800', color: c.accent }}>Done</T>
            </Pressable>
          </View>
          {rainy && (
            <T style={{ fontSize: 13, color: c.muted, marginTop: 5 }}>
              ☔️ Rain likely, we’ll keep things mostly indoor.
            </T>
          )}
        </View>

        {/* Trip length */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14 }}>
          {LENGTHS.map((n) => {
            const on = days === n;
            return (
              <Pressable
                key={n}
                onPress={() => { haptic.tick(); setDays(n); setOpenDay(0); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{
                  paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999,
                  backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.line,
                }}
              >
                <T style={{ fontSize: 13.5, fontWeight: '800', color: on ? c.paper : c.ink }}>{n} days</T>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Describe your ideal trip — the AI taste intake. Shapes the whole
            plan from a sentence; the vibe chips below stay as a fine-tune. The
            section headings this block used to carry ("DESCRIBE YOUR IDEAL
            TRIP" / "OR SET A VIBE") are gone: the placeholder already shows
            what to type, and an "OR" between two chip rows only made the two
            look like a decision the traveller had to make. */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, minHeight: 46, justifyContent: 'center' }}>
              <TextInput
                value={intakeText}
                onChangeText={setIntakeText}
                placeholder="Foodie couple who love cafes & night markets, skip the palaces…"
                placeholderTextColor={c.muted}
                multiline
                style={{ fontSize: 14, color: c.ink, fontFamily: 'Pretendard', maxHeight: 96 }}
                onSubmitEditing={() => runIntake(intakeText)}
                returnKeyType="go"
                blurOnSubmit
              />
            </View>
            <Pressable
              onPress={() => runIntake(intakeText)}
              disabled={!intakeText.trim() || intakePending}
              accessibilityRole="button"
              accessibilityLabel="Tune my trip"
              style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: intakeText.trim() ? c.accent : c.surface2, alignItems: 'center', justifyContent: 'center' }}
            >
              {intakePending
                ? <ActivityIndicator color={intakeText.trim() ? c.paper : c.muted} />
                : <Icon name="sparkle" size={20} stroke={intakeText.trim() ? c.paper : c.muted} sw={1.8} />}
            </Pressable>
          </View>

          {steer && (
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.accent50, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 }}>
              <T style={{ fontSize: 13 }}>✨</T>
              <T style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: c.accent }} numberOfLines={2}>
                Tuned to: {steer.summary}
              </T>
              <Pressable onPress={clearSteer} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear tuning">
                <Icon name="close" size={16} stroke={c.accent} sw={2} />
              </Pressable>
            </View>
          )}
        </View>

        {/* One row of presets, not two. These used to be split into example
            sentences (which re-ran the intake model) and vibe chips (which set
            the knob directly) — the same intent to the traveller, at two
            different costs. Only the instant one survives; the free-text box
            above covers anything a chip can't say. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 10 }}>
          <Pressable
            onPress={() => { haptic.tick(); setVibe(null); }}
            accessibilityRole="button"
            accessibilityState={{ selected: !vibe }}
            style={{ paddingVertical: 6.5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: !vibe ? c.accent50 : c.surface, borderWidth: 1, borderColor: !vibe ? c.accent : c.line }}
          >
            <T style={{ fontSize: 12.5, fontWeight: '700', color: !vibe ? c.accent : c.inkSoft }}>✨ Balanced</T>
          </Pressable>
          {(Object.keys(VIBES) as VibeKey[]).map((k) => {
            const on = vibe === k;
            return (
              <Pressable
                key={k}
                onPress={() => { haptic.tick(); setVibe(on ? null : k); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{ paddingVertical: 6.5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? c.accent50 : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.line }}
              >
                <T style={{ fontSize: 12.5, fontWeight: '700', color: on ? c.accent : c.inkSoft }}>
                  {VIBES[k].emoji} {VIBES[k].label}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>

        <FlightTimesRow
          open={flightsOpen}
          onToggle={() => setFlightsOpen((v) => !v)}
          arriveHour={arriveHour}
          departHour={departHour}
          onChangeArrive={setArriveHour}
          onChangeDepart={setDepartHour}
        />
        </>
        )}

        {trip ? (
          <>
            {/* Trip at a glance. One line, not four cards: "days" already reads
                off the summary row above, and three numbers don't need three
                boxes to be scannable. */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 }}>
              <T style={{ fontSize: 13, color: c.muted }}>
                <T style={{ fontSize: 13, fontWeight: '800', color: c.ink }}>{totalStops}</T> stops
                {'  ·  '}
                <T style={{ fontSize: 13, fontWeight: '800', color: c.ink }}>{mustSees}</T> must-sees
                {'  ·  '}
                <T style={{ fontSize: 13, fontWeight: '800', color: c.ink }}>{trip.totalKm.toFixed(1)}</T> km on foot
              </T>
            </View>

            {/* Day-by-day */}
            <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 10 }}>
              {trip.days.map((d) => (
                <DayCard
                  key={d.dayIndex}
                  day={d}
                  tip={tipForDay(d, themes)}
                  open={openDay === d.dayIndex}
                  onToggle={() => { haptic.tick(); setOpenDay(openDay === d.dayIndex ? -1 : d.dayIndex); }}
                  onOpenPlace={(slug) => router.push(`/place/${slug}`)}
                  onOpenTheme={(slug) => router.push(`/theme/${slug}`)}
                  onSwap={(slug, role) => { haptic.tick(); setSwapTarget({ dayIndex: d.dayIndex, slug, role }); }}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 40, alignItems: 'center' }}>
            <T style={{ fontSize: 13.5, color: c.muted, textAlign: 'center' }}>
              {places.length ? 'Couldn’t build a trip from the current filters, try a different length.' : 'Loading places…'}
            </T>
          </View>
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 9, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.paper }}>
        <Button label="Save as my trip" variant="soft" style={{ flex: 1 }} onPress={saveTrip} disabled={!trip} />
        <Button label={sharing ? 'Sharing…' : 'Share for feedback'} icon="share" style={{ flex: 1.15 }} onPress={shareForFeedback} disabled={!trip || sharing} />
      </View>

      <TripChatDock messages={chat} pending={chatPending} disabled={!trip} onSend={askChat} />

      <SwapStopSheet
        visible={!!swapTarget}
        onClose={() => setSwapTarget(null)}
        role={swapTarget?.role ?? 'stop'}
        current={swapCurrent}
        candidates={swapOptions}
        onPick={(p) => {
          if (!trip || !swapTarget) return;
          setEdited(replaceStop(trip, swapTarget.dayIndex, swapTarget.slug, p));
          setSwapTarget(null);
        }}
        onRemove={() => {
          if (!trip || !swapTarget) return;
          setEdited(removeStop(trip, swapTarget.dayIndex, swapTarget.slug));
          setSwapTarget(null);
        }}
      />
    </Screen>
  );
}

// One collapsible day. Collapsed shows the day's headline (zone + must-see
// count) so a 5-day trip stays scannable; expanded shows the route + stops.
function DayCard({
  day,
  tip,
  open,
  onToggle,
  onOpenPlace,
  onOpenTheme,
  onSwap,
}: {
  day: TripDay;
  tip?: DayTip | null;
  open: boolean;
  onToggle: () => void;
  onOpenPlace: (slug: string) => void;
  onOpenTheme: (slug: string) => void;
  onSwap: (slug: string, role: string) => void;
}) {
  const { c, tone } = useTheme();
  const accent = tone('blue');
  const stops = day.plan.stops;
  const headline = stops.length ? dayHeadline(day) : 'Travel day';
  const zoneInHeadline = headline === day.zone.label;
  const blurbs = useMemo(
    () => Object.fromEntries(stops.map((s) => [s.place.slug, placeBlurb(s.place)])) as Record<string, string | null>,
    [stops],
  );

  return (
    <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 16, overflow: 'hidden', backgroundColor: c.surface }}>
      <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 }}>
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: accent.bg, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 15, fontWeight: '800', color: accent.fg }}>{day.dayIndex + 1}</T>
        </View>
        <View style={{ flex: 1 }}>
          {/* Two lines, not one: real place names run long ("Myeongdong
              Underground Shopping Center") and a headline that ends in "…" is
              the one thing on the card the traveller most needs to read. */}
          <T style={{ fontSize: 14.5, fontWeight: '800', lineHeight: 19 }} numberOfLines={2}>
            {headline}
          </T>
          <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600', marginTop: 2 }}>
            {stops.length
              ? // dayHeadline falls back to the zone when the day has no
                // must-see, and then printing the zone again here said the
                // same words twice on one card.
                [zoneInHeadline ? null : day.zone.label, `${stops.length} stops`, `${day.plan.totalKm.toFixed(1)}km`]
                  .filter(Boolean)
                  .join(' · ')
              : 'Your flight leaves no usable time'}
          </T>
        </View>
        <View style={{ transform: [{ rotate: open ? '270deg' : '90deg' }] }}>
          <Icon name="chevron" size={16} stroke={c.muted} />
        </View>
      </Pressable>

      {open && (
        <View style={{ paddingHorizontal: 11, paddingBottom: 12, paddingTop: 2 }}>
          <View style={{ gap: 8 }}>
            {stops.length === 0 && (
              <T style={{ fontSize: 12.5, color: c.muted, lineHeight: 18, paddingVertical: 8, paddingHorizontal: 2 }}>
                Between the airport and check-in there isn’t a realistic window here. Adjust your flight
                time above if you have more room than we assumed.
              </T>
            )}
            {stops.map((s, i) => (
              <Pressable
                key={s.place.slug}
                onPress={() => onOpenPlace(s.place.slug)}
                style={{ backgroundColor: c.paper, borderRadius: 12, borderWidth: 1, borderColor: c.line, padding: 9 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ alignItems: 'center', width: 42 }}>
                    <T style={{ fontSize: 11, fontWeight: '800', color: accent.fg }}>{to12h(s.time)}</T>
                    {i > 0 && s.kmFromPrev != null && (
                      <T style={{ fontSize: 9.5, color: c.muted, fontWeight: '600', marginTop: 1 }}>
                        {s.kmFromPrev < 1 ? `${Math.round(s.kmFromPrev * 1000)}m` : `${s.kmFromPrev.toFixed(1)}km`}
                      </T>
                    )}
                  </View>
                  <View style={{ width: 42, height: 42, borderRadius: 9, overflow: 'hidden' }}>
                    <Photo uri={s.place.photoUrl} swatch={s.place.swatch} height={42} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {/* Two lines: real names ("Myeongdong Underground Shopping
                        Center") run past what one line at this width holds,
                        and this is the one piece of text on the row the
                        traveller is actually here to read. */}
                    <T style={{ fontSize: 13.5, fontWeight: '700', lineHeight: 17 }} numberOfLines={2}>{s.place.name}</T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1.5 }}>
                      {tierOf(s.place) === 'S' && <T style={{ fontSize: 9.5, fontWeight: '800', color: accent.fg }}>★ MUST-SEE</T>}
                      {s.saved && <Icon name="heart" size={11} fill={c.rose} stroke={c.rose} sw={1} />}
                      <T style={{ fontSize: 11, color: c.muted, flexShrink: 1 }} numberOfLines={1}>
                        {s.role} · {s.place.neighborhood}
                      </T>
                    </View>
                  </View>
                  {/* Per-stop escape hatch, the plan is a suggestion, and this
                      is how you say "not that one" without redoing the trip. */}
                  <Pressable
                    onPress={() => onSwap(s.place.slug, s.role)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Change ${s.place.name}`}
                    style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}
                  >
                    <T style={{ fontSize: 11, fontWeight: '800', color: c.inkSoft }}>Change</T>
                  </Pressable>
                </View>
                {/* Why this place is worth the slot, replaces the per-day route
                    map, which was unreadable at that size. Full width: squeezed
                    into the text column it wrapped every three words. */}
                {!!blurbs[s.place.slug] && (
                  <T style={{ fontSize: 12, lineHeight: 17, color: c.inkSoft, marginTop: 7 }} numberOfLines={3}>
                    {blurbs[s.place.slug]}
                  </T>
                )}
              </Pressable>
            ))}
          </View>

          {/* One contextual tip from the Themes tab, so the planner doubles as
              a place to reference the guides without leaving your route. */}
          {tip && (
            <Pressable
              onPress={onOpenTheme ? () => { haptic.tick(); onOpenTheme(tip.themeSlug); } : undefined}
              accessibilityRole="button"
              accessibilityLabel={`Tip from ${tip.themeTitle}`}
              style={{ marginTop: 10, flexDirection: 'row', gap: 9, backgroundColor: c.gold50, borderRadius: 12, padding: 11 }}
            >
              <T style={{ fontSize: 14 }}>💡</T>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 12, lineHeight: 17, color: c.ink }} numberOfLines={3}>{tip.tip}</T>
                <T style={{ fontSize: 11, fontWeight: '800', color: c.gold700, marginTop: 5 }}>More in {tip.themeTitle} →</T>
              </View>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
