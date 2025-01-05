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
    return NextResponse.json(
      { error: 'Failed to fetch feedback', details: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { typeName, isLike } = await request.json();
    console.log('Updating feedback for:', typeName, 'isLike:', isLike);
    
    const client = await clientPromise;
    const db = client.db("zenflow");
    
    // Update feedback count and get the updated document in a single operation
    const updateField = isLike ? 'likes' : 'dislikes';
    const result = await db.collection<FeedbackStats>("feedback").findOneAndUpdate(
      { _id: 'feedback_stats' },
      {
        $inc: { [`${typeName}.${updateField}`]: 1 },
        $setOnInsert: INITIAL_FEEDBACK
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    );

    const updatedDoc = result?.value || INITIAL_FEEDBACK;

    // Return feedback data without _id
    const response = {
      Breathing: updatedDoc.Breathing,
      'Body Scan': updatedDoc['Body Scan'],
      'Loving-Kindness': updatedDoc['Loving-Kindness'],
      Mindfulness: updatedDoc.Mindfulness
    };
    console.log('Sending response:', response);
    return NextResponse.json(response);
  } catch (e) {
    console.error('Database error:', e);
    return NextResponse.json(
      { error: 'Failed to update feedback', details: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 