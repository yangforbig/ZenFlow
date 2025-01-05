import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document } from 'mongodb';

interface FeedbackStats extends Document {
  _id: string;
  Breathing: { likes: number; dislikes: number };
  'Body Scan': { likes: number; dislikes: number };
  'Loving-Kindness': { likes: number; dislikes: number };
  Mindfulness: { likes: number; dislikes: number };
}

const INITIAL_FEEDBACK = {
  Breathing: { likes: 0, dislikes: 0 },
  'Body Scan': { likes: 0, dislikes: 0 },
  'Loving-Kindness': { likes: 0, dislikes: 0 },
  Mindfulness: { likes: 0, dislikes: 0 }
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("zenflow");
    
    const feedback = await db.collection<FeedbackStats>("feedback").findOne(
      { _id: 'feedback_stats' } as Partial<FeedbackStats>
    );
    
    if (!feedback) {
      await db.collection<FeedbackStats>("feedback").insertOne({
        _id: 'feedback_stats',
        ...INITIAL_FEEDBACK
      } as FeedbackStats);
      return NextResponse.json(INITIAL_FEEDBACK);
    }
    
    // Return feedback data without _id
    return NextResponse.json({
      Breathing: feedback.Breathing,
      'Body Scan': feedback['Body Scan'],
      'Loving-Kindness': feedback['Loving-Kindness'],
      Mindfulness: feedback.Mindfulness
    });
  } catch (e) {
    console.error('Database error:', e);
    return NextResponse.json(INITIAL_FEEDBACK);
  }
}

export async function POST(request: Request) {
  try {
    const { typeName, isLike } = await request.json();
    console.log('Updating feedback for:', typeName, 'isLike:', isLike);
    
    const client = await clientPromise;
    const db = client.db("zenflow");
    
    // Ensure document exists
    await db.collection<FeedbackStats>("feedback").updateOne(
      { _id: 'feedback_stats' } as Partial<FeedbackStats>,
      { 
        $setOnInsert: INITIAL_FEEDBACK
      },
      { upsert: true }
    );

    // Update the feedback count
    const updateField = isLike ? 'likes' : 'dislikes';
    await db.collection<FeedbackStats>("feedback").updateOne(
      { _id: 'feedback_stats' } as Partial<FeedbackStats>,
      { $inc: { [`${typeName}.${updateField}`]: 1 } }
    );
    
    // Get updated feedback
    const updatedFeedback = await db.collection<FeedbackStats>("feedback").findOne(
      { _id: 'feedback_stats' } as Partial<FeedbackStats>
    );
    
    if (!updatedFeedback) {
      return NextResponse.json(INITIAL_FEEDBACK);
    }
    
    // Return feedback data without _id
    return NextResponse.json({
      Breathing: updatedFeedback.Breathing,
      'Body Scan': updatedFeedback['Body Scan'],
      'Loving-Kindness': updatedFeedback['Loving-Kindness'],
      Mindfulness: updatedFeedback.Mindfulness
    });
  } catch (e) {
    console.error('Database error:', e);
    return NextResponse.json(INITIAL_FEEDBACK);
  }
} 