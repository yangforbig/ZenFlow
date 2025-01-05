export interface MeditationType {
  name: string;
  likes: number;
  dislikes: number;
}

export interface FeedbackDocument {
  _id: string;
  Breathing: MeditationType;
  'Body Scan': MeditationType;
  'Loving-Kindness': MeditationType;
  Mindfulness: MeditationType;
} 