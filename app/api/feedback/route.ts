import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("zenflow");
    const feedback = await db.collection("feedback").findOne({ _id: "global" });
    
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
    const client = await clientPromise;
    const db = client.db("zenflow");
    
    const update = isLike 
      ? { [`${typeName}.likes`]: 1 }
      : { [`${typeName}.dislikes`]: 1 };
    
    await db.collection("feedback").updateOne(
      { _id: "global" },
      { $inc: update },
      { upsert: true }
    );
    
    const updatedFeedback = await db.collection("feedback").findOne({ _id: "global" });
    return NextResponse.json(updatedFeedback || createInitialFeedback());
  } catch (e) {
    console.error('Database error:', e);
    return NextResponse.json(createInitialFeedback());
  }
}

function createInitialFeedback() {
  const feedback: {[key: string]: {likes: number, dislikes: number}} = {};
  ['Breathing', 'Body Scan', 'Loving-Kindness', 'Mindfulness'].forEach(type => {
    feedback[type] = { likes: 0, dislikes: 0 };
  });
  return { _id: "global", ...feedback };
} 