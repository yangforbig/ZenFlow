'use server';

import { NextResponse } from 'next/server';
import clientPromise from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';

interface FeedbackData {
  Breathing: { likes: number; dislikes: 0 };
  'Body Scan': { likes: number; dislikes: 0 };
  'Loving-Kindness': { likes: number; dislikes: 0 };
  Mindfulness: { likes: number; dislikes: 0 };
}

type MeditationType = keyof FeedbackData;

const defaultFeedback: FeedbackData = {
  Breathing: { likes: 0, dislikes: 0 },
  'Body Scan': { likes: 0, dislikes: 0 },
  'Loving-Kindness': { likes: 0, dislikes: 0 },
  Mindfulness: { likes: 0, dislikes: 0 }
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("zenflow");
    const collection = db.collection("feedback");

    // Use projection to exclude _id
    const feedbackDoc = await collection.findOne<FeedbackData>({}, { projection: { _id: 0 } });
    
    if (!feedbackDoc) {
      const newFeedback = {
        _id: new ObjectId(),
        ...defaultFeedback
      };
      await collection.insertOne(newFeedback);
      return NextResponse.json(defaultFeedback);
    }

    return NextResponse.json(feedbackDoc);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { typeName, isLike } = await request.json() as { typeName: MeditationType; isLike: boolean };
    const client = await clientPromise;
    const db = client.db("zenflow");
    const collection = db.collection("feedback");

    // Get current feedback document without _id
    let feedbackDoc = await collection.findOne<FeedbackData>({}, { projection: { _id: 0 } });
    
    if (!feedbackDoc) {
      const newFeedback = {
        _id: new ObjectId(),
        ...defaultFeedback
      };
      await collection.insertOne(newFeedback);
      feedbackDoc = defaultFeedback;
    }

    // Ensure likes don't go below 0
    if (!isLike && (feedbackDoc[typeName]?.likes || 0) <= 0) {
      return NextResponse.json(feedbackDoc);
    }

    // Update the likes count based on isLike value
    const updateOperation = {
      $inc: {
        [`${typeName}.likes`]: isLike ? 1 : -1
      }
    };

    // Update the document and return without _id
    const result = await collection.findOneAndUpdate(
      {},
      updateOperation,
      { 
        projection: { _id: 0 },
        returnDocument: 'after'
      }
    );

    if (!result) {
      throw new Error('Failed to update feedback');
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
} 