import { Document } from 'mongodb';

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

export interface FeedbackStats extends FeedbackDocument, Document {
  _id: string;
}

export const INITIAL_FEEDBACK = {
  Breathing: { likes: 0, dislikes: 0 },
  'Body Scan': { likes: 0, dislikes: 0 },
  'Loving-Kindness': { likes: 0, dislikes: 0 },
  Mindfulness: { likes: 0, dislikes: 0 }
};

export interface UserSession {
  startTime: Date;
  endTime: Date;
  meditationType: string;
  duration: number;  // in seconds
  completed: boolean;
  interactions: {
    pauseCount: number;
    resetCount: number;
    volumeChanges: number;
  };
}

export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface DeviceInfo {
  type: string;      // mobile, tablet, desktop
  browser: string;   // Chrome, Firefox, Safari, etc.
  os: string;        // Windows, MacOS, iOS, Android, etc.
  screenSize?: string;
  language?: string;
}

export interface VoteRecord {
  _id?: string;
  userIP: string;
  meditationType: string;
  isLike: boolean;
  // Timestamps
  createdAt: Date;           // When the record was created
  lastModifiedAt: Date;      // Last time the record was updated
  firstVisitAt: Date;        // First time user visited the app
  // Session data
  sessionData?: UserSession;
  // User context
  userAgent: string | null;
  device: DeviceInfo;
  geo: GeoLocation;
  // Additional tracking
  referrer?: string;         // Where the user came from
  visitCount: number;        // How many times they've visited
  totalSessionTime: number;  // Total time spent on app in seconds
  preferredMeditationType?: string;  // Most used meditation type
} 