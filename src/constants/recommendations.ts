export const RECOMMENDATION_TONES = [
  "All",
  "Happy",
  "Surprising",
  "Angry",
  "Suspenseful",
  "Sad",
] as const;

export type RecommendationTone = (typeof RECOMMENDATION_TONES)[number];
