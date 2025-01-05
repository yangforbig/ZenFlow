import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { FeedbackDocument } from '@/types/feedback';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("zenflow");
    const feedback = await db.collection<FeedbackDocument>("feedback").findOne(
      { _id: 'feedback_stats' }
    );
    
    console.log('GET Feedback:', feedback);
    
    if (!feedback) {
      return NextResponse.json(createInitialFeedback());
    }
    
    return NextResponse.json(feedback);
  } catch (e) {
    console.error('Database error:', e);
    return NextResponse.json(createInitialFeedback());
  }
}

export async function POST(request: Request) {
  try {
    const { typeName, isLike } = await request.json();
    console.log('Updating feedback for:', typeName, 'isLike:', isLike);
    
    const client = await clientPromise;
    const db = client.db("zenflow");
    
    const update = isLike 
      ? { [`${typeName}.likes`]: 1 }
      : { [`${typeName}.dislikes`]: 1 };
    
    console.log('Update operation:', update);
    
    const result = await db.collection<FeedbackDocument>("feedback").updateOne(
      { _id: 'feedback_stats' },
      { $inc: update },
      { upsert: true }
    );
    
    console.log('Update result:', result);
    
    const updatedFeedback = await db.collection<FeedbackDocument>("feedback").findOne(
      { _id: 'feedback_stats' }
    );
    
    console.log('Updated feedback:', updatedFeedback);
    return NextResponse.json(updatedFeedback || createInitialFeedback());
  } catch (e) {
    console.error('Database error:', e);
    return NextResponse.json(createInitialFeedback());
  }
}

function createInitialFeedback(): FeedbackDocument {
  return {
    _id: 'feedback_stats',
    Breathing: { name: 'Breathing', likes: 0, dislikes: 0 },
    'Body Scan': { name: 'Body Scan', likes: 0, dislikes: 0 },
    'Loving-Kindness': { name: 'Loving-Kindness', likes: 0, dislikes: 0 },
    Mindfulness: { name: 'Mindfulness', likes: 0, dislikes: 0 }
  };
} 