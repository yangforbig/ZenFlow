import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { FeedbackStats } from '@/types/feedback';

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db("zenflow");
    
    // Reset feedback counts
    await db.collection<FeedbackStats>("feedback").updateOne(
      { _id: 'feedback_stats' } as Partial<FeedbackStats>,
      {
        $set: {
          'Breathing': { likes: 0, dislikes: 0 },
          'Body Scan': { likes: 0, dislikes: 0 },
          'Loving-Kindness': { likes: 0, dislikes: 0 },
          'Mindfulness': { likes: 0, dislikes: 0 }
        }
      },
      { upsert: true }
    );

    // Clear vote records
    await db.collection("votes").deleteMany({});

    return NextResponse.json({ message: 'Votes cleared successfully' });
  } catch (e) {
    console.error('Failed to clear votes:', e);
    return NextResponse.json(
      { error: 'Failed to clear votes' },
      { status: 500 }
    );
  }
} 