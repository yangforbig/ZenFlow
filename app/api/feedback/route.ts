import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { FeedbackStats, VoteRecord } from '@/types/feedback';
import { headers } from 'next/headers';
import UAParser from 'ua-parser-js';

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
    const { typeName, isLike, sessionData } = await request.json();
    const client = await clientPromise;
    const db = client.db("zenflow");
    
    const headersList = headers();
    const userIP = headersList.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent');
    const timezone = headersList.get('accept-timezone');

    // Parse user agent for device information
    const uaParser = new UAParser(userAgent || '');
    const device = {
      type: uaParser.getDevice().type || 'unknown',
      browser: uaParser.getBrowser().name || 'unknown',
      os: uaParser.getOS().name || 'unknown'
    };

    // Record the vote with enhanced metadata
    const voteRecord: VoteRecord = {
      userIP,
      meditationType: typeName,
      isLike,
      timestamp: new Date(),
      userAgent: userAgent || null,
      timezone: timezone || null,
      device,
      sessionData
    };

    // Check if user has already voted
    const existingVote = await db.collection<VoteRecord>("votes").findOne({
      userIP,
      meditationType: typeName
    });

    if (existingVote) {
      return NextResponse.json(
        { error: 'Already voted for this type' },
        { status: 400 }
      );
    }

    // Save the vote record
    await db.collection<VoteRecord>("votes").insertOne(voteRecord);

    // Update feedback counts
    const result = await db.collection<FeedbackStats>("feedback").findOneAndUpdate(
      { _id: 'feedback_stats' } as Partial<FeedbackStats>,
      { $inc: { [`${typeName}.${isLike ? 'likes' : 'dislikes'}`]: 1 } },
      { returnDocument: 'after', upsert: true }
    );

    if (!result?.value) {
      const updatedDoc = await db.collection<FeedbackStats>("feedback").findOne(
        { _id: 'feedback_stats' } as Partial<FeedbackStats>
      );
      
      if (!updatedDoc) {
        console.error('Could not retrieve updated document');
        return NextResponse.json(
          { error: 'Failed to update feedback', details: 'Could not retrieve updated document' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        Breathing: updatedDoc.Breathing,
        'Body Scan': updatedDoc['Body Scan'],
        'Loving-Kindness': updatedDoc['Loving-Kindness'],
        Mindfulness: updatedDoc.Mindfulness
      });
    }

    return NextResponse.json({
      Breathing: result.value.Breathing,
      'Body Scan': result.value['Body Scan'],
      'Loving-Kindness': result.value['Loving-Kindness'],
      Mindfulness: result.value.Mindfulness
    });
  } catch (e) {
    console.error('Database error:', e);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
} 