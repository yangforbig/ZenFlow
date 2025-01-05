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
    
    return NextResponse.json({
      status: 'success',
      message: 'Connected to MongoDB!',
      dbName: db.databaseName,
      currentFeedback: feedback || 'No feedback data yet'
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to MongoDB',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 