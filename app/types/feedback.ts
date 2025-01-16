export interface FeedbackStats {
  likes: number;
  dislikes: number;
}

export interface FeedbackDocument {
  [key: string]: FeedbackStats;
  Breathing: FeedbackStats;
  'Body Scan': FeedbackStats;
  'Loving-Kindness': FeedbackStats;
  Mindfulness: FeedbackStats;
} 