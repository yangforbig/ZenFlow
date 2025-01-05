export interface MeditationType {
  name: string;
  likes: number;
  dislikes: number;
}

export interface FeedbackDocument {
  Breathing: { likes: number; dislikes: number };
  'Body Scan': { likes: number; dislikes: number };
  'Loving-Kindness': { likes: number; dislikes: number };
  Mindfulness: { likes: number; dislikes: number };
} 