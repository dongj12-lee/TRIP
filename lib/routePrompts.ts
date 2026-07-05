// The fixed set of one-click feedback prompts shown on a shared Route post.
// Keys are stored in the DB (route_feedback.prompt / posts.feedback_counts);
// labels/emoji are display-only, so wording can change without a migration.
export type RoutePrompt = { key: string; emoji: string; label: string };

export const ROUTE_PROMPTS: RoutePrompt[] = [
  { key: 'packed', emoji: '😅', label: 'Too packed' },
  { key: 'relaxed', emoji: '👌', label: 'Well paced' },
  { key: 'order', emoji: '🔀', label: 'Reorder this' },
  { key: 'missing', emoji: '➕', label: "Missing a spot" },
  { key: 'love', emoji: '❤️', label: 'Love it' },
];
