import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { FeedbackStats, VoteRecord, INITIAL_FEEDBACK, DeviceInfo, GeoLocation } from '@/types/feedback';
import * as UAParser from 'ua-parser-js';

async function getGeoData(ip: string): Promise<GeoLocation> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    return {
      country: data.country,
      region: data.regionName,
      city: data.city,
      timezone: data.timezone,
      latitude: data.lat,
      longitude: data.lon
    };
  } catch (error) {
    console.error('Failed to fetch geo data:', error);
    return {};
  }
}

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
    
    const userIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
    const userAgent = request.headers.get('user-agent');
    const referrer = request.headers.get('referer');
    const language = request.headers.get('accept-language');
    const viewportWidth = request.headers.get('sec-ch-viewport-width');

    // Parse user agent for device information
    const parser = new UAParser.UAParser(userAgent || '');
    const device: DeviceInfo = {
      type: parser.getDevice().type || 'desktop',
      browser: parser.getBrowser().name || 'unknown',
      os: parser.getOS().name || 'unknown',
      language: language?.split(',')[0],
      screenSize: viewportWidth || undefined
    };

    // Get geo location data
    const geo = await getGeoData(userIP);

    // Get existing user data or create new
    const existingUser = await db.collection<VoteRecord>("votes").findOne({ userIP });
    const firstVisit = existingUser ? existingUser.firstVisitAt : new Date();
    const visitCount = existingUser ? existingUser.visitCount + 1 : 1;

    // Record the vote with enhanced metadata
    const voteRecord: VoteRecord = {
      userIP,
      meditationType: typeName,
      isLike,
      createdAt: new Date(),
      lastModifiedAt: new Date(),
      firstVisitAt: firstVisit,
      userAgent: userAgent || null,
      device,
      geo,
      referrer: referrer || undefined,
      visitCount,
      totalSessionTime: sessionData?.duration || 0,
      sessionData,
      preferredMeditationType: typeName // Will be updated based on usage patterns
    };

    // Check if user has already voted for this type
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