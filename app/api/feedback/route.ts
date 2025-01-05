import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { FeedbackDocument } from '@/types/feedback';
import { ObjectId } from 'mongodb';

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
    
    // Find existing feedback
    const feedback = await db.collection("feedback").findOne(
      { _id: 'feedback_stats' }
    );
    
    console.log('GET Feedback:', feedback);
    
    if (!feedback) {
      // Create initial feedback if none exists
      await db.collection("feedback").insertOne({
        _id: 'feedback_stats',
        ...INITIAL_FEEDBACK
      });
      return NextResponse.json(INITIAL_FEEDBACK);
    }
    
    // Remove _id from response
    const { _id, ...feedbackData } = feedback;
    return NextResponse.json(feedbackData);
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
    await db.collection("feedback").updateOne(
      { _id: 'feedback_stats' },
      { 
        $setOnInsert: INITIAL_FEEDBACK
      },
      { upsert: true }
    );

    // Update the feedback count
    const updateField = isLike ? 'likes' : 'dislikes';
    await db.collection("feedback").updateOne(
      { _id: 'feedback_stats' },
      { $inc: { [`${typeName}.${updateField}`]: 1 } }
    );
    
    // Get updated feedback
    const updatedFeedback = await db.collection("feedback").findOne(
      { _id: 'feedback_stats' }
    );
    
    if (!updatedFeedback) {
      return NextResponse.json(INITIAL_FEEDBACK);
    }
    
    // Remove _id from response
    const { _id, ...feedbackData } = updatedFeedback;
    return NextResponse.json(feedbackData);
  } catch (e) {
    console.error('Database error:', e);
    return NextResponse.json(INITIAL_FEEDBACK);
  }
} 