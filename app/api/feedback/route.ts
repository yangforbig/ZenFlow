import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document, MongoClient } from 'mongodb';

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
    const client = await Promise.race([
      clientPromise,
      new Promise<MongoClient>((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 10000)
      )
    ]);

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
    
    const client = await Promise.race([
      clientPromise,
      new Promise<MongoClient>((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 10000)
      )
    ]);

    const db = client.db("zenflow");
    console.log('Connected to database:', db.databaseName);
    
    // Ensure document exists with timeout
    try {
      await Promise.race([
        db.collection<FeedbackStats>("feedback").updateOne(
          { _id: 'feedback_stats' } as Partial<FeedbackStats>,
          { 
            $setOnInsert: INITIAL_FEEDBACK
          },
          { upsert: true }
        ),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Document creation timeout')), 5000)
        )
      ]);
      console.log('Document existence ensured');
    } catch (error) {
      console.error('Error ensuring document exists:', error);
      throw error;
    }

    // Update the feedback count with timeout
    const updateField = isLike ? 'likes' : 'dislikes';
    try {
      await Promise.race([
        db.collection<FeedbackStats>("feedback").updateOne(
          { _id: 'feedback_stats' } as Partial<FeedbackStats>,
          { $inc: { [`${typeName}.${updateField}`]: 1 } }
        ),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Update operation timeout')), 5000)
        )
      ]);
      console.log('Feedback count updated');
    } catch (error) {
      console.error('Error updating feedback count:', error);
      throw error;
    }
    
    // Get updated feedback with timeout
    let updatedFeedback;
    try {
      updatedFeedback = await Promise.race([
        db.collection<FeedbackStats>("feedback").findOne(
          { _id: 'feedback_stats' } as Partial<FeedbackStats>
        ),
        new Promise<FeedbackStats | null>((_, reject) => 
          setTimeout(() => reject(new Error('Fetch operation timeout')), 5000)
        )
      ]);
      console.log('Retrieved updated feedback');
    } catch (error) {
      console.error('Error retrieving updated feedback:', error);
      throw error;
    }
    
    if (!updatedFeedback) {
      console.log('No feedback document found, returning initial feedback');
      return NextResponse.json(INITIAL_FEEDBACK);
    }
    
    // Return feedback data without _id
    const response = {
      Breathing: updatedFeedback.Breathing,
      'Body Scan': updatedFeedback['Body Scan'],
      'Loving-Kindness': updatedFeedback['Loving-Kindness'],
      Mindfulness: updatedFeedback.Mindfulness
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