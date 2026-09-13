// The fixed set of one-click feedback prompts shown on a shared Route post.
// Keys are stored in the DB (route_feedback.prompt / posts.feedback_counts);
// labels/emoji are display-only, so wording can change without a migration.
export type RoutePrompt = { key: string; emoji: string; label: string };

// Six, not five, so the grid below reads as a clean 3 columns x 2 rows
// instead of 2+2+1. The 6th used to be "Not for me" (👎) — dropped: this is
// feedback on a route someone shared asking for help, not a place review,
// and a one-tap dislike aimed at the person who posted it reads as a
// pointless jab rather than anything actionable. "Been there" is the same
// slot filled with something that's still a genuine one-tap reaction and
// actually useful signal (this traveller has really walked the route) but
// isn't a judgment on the person who shared it.
export const ROUTE_PROMPTS: RoutePrompt[] = [
  { key: 'packed', emoji: '😅', label: 'Too packed' },
  { key: 'order', emoji: '🔀', label: 'Reorder this' },
  { key: 'love', emoji: '❤️', label: 'Love it' },
  { key: 'relaxed', emoji: '👌', label: 'Well paced' },
  { key: 'missing', emoji: '➕', label: 'Missing a spot' },
  { key: 'been', emoji: '✅', label: 'Been there' },
];
