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
    const body = await request.json();
    console.log('Received request body:', body);

    const { typeName, isLike } = body;
    console.log('Parsed values:', { typeName, isLike });
    
    // Validate request data
    if (!typeName || typeof isLike !== 'boolean') {
      console.error('Invalid request data:', { typeName, isLike });
      return NextResponse.json(
        { error: 'Invalid request data', details: 'typeName and isLike are required' },
        { status: 400 }
      );
    }

    // Validate meditation type
    const validTypes = ['Breathing', 'Body Scan', 'Loving-Kindness', 'Mindfulness'];
    if (!validTypes.includes(typeName)) {
      console.error('Invalid meditation type:', typeName);
      return NextResponse.json(
        { error: 'Invalid meditation type', details: `Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db("zenflow");
    console.log('Connected to database:', db.databaseName);
    
    try {
      // First, ensure the document exists
      console.log('Checking for existing document...');
      const existingDoc = await db.collection<FeedbackStats>("feedback").findOne(
        { _id: 'feedback_stats' }
      );

      if (!existingDoc) {
        console.log('Document does not exist, creating initial document...');
        const initialDoc = {
          _id: 'feedback_stats',
          ...INITIAL_FEEDBACK
        };
        await db.collection<FeedbackStats>("feedback").insertOne(initialDoc as FeedbackStats);
        console.log('Initial document created:', initialDoc);
      } else {
        console.log('Existing document found:', existingDoc);
      }

      // Now update the feedback count
      const updateField = isLike ? 'likes' : 'dislikes';
      console.log('Updating feedback count...', {
        typeName,
        updateField,
        operation: `Increment ${typeName}.${updateField}`
      });

      const result = await db.collection<FeedbackStats>("feedback").findOneAndUpdate(
        { _id: 'feedback_stats' },
        { $inc: { [`${typeName}.${updateField}`]: 1 } },
        { 
          returnDocument: 'after',
          upsert: true
        }
      );

      console.log('Update operation result:', result);

      if (!result?.value) {
        // Try to fetch the document directly as a fallback
        const updatedDoc = await db.collection<FeedbackStats>("feedback").findOne(
          { _id: 'feedback_stats' }
        );
        
        if (!updatedDoc) {
          console.error('Could not retrieve updated document');
          return NextResponse.json(
            { error: 'Failed to update feedback', details: 'Could not retrieve updated document' },
            { status: 500 }
          );
        }
        
        // Return feedback data without _id
        const response = {
          Breathing: updatedDoc.Breathing,
          'Body Scan': updatedDoc['Body Scan'],
          'Loving-Kindness': updatedDoc['Loving-Kindness'],
          Mindfulness: updatedDoc.Mindfulness
        };

        console.log('Sending response from fallback:', response);
        return NextResponse.json(response);
      }

      // Return feedback data without _id
      const response = {
        Breathing: result.value.Breathing,
        'Body Scan': result.value['Body Scan'],
        'Loving-Kindness': result.value['Loving-Kindness'],
        Mindfulness: result.value.Mindfulness
      };

      console.log('Sending response:', response);
      return NextResponse.json(response);
    } catch (dbError) {
      console.error('Database operation failed:', {
        error: dbError,
        message: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      throw dbError;
    }
  } catch (e) {
    console.error('Request processing failed:', {
      error: e,
      message: e instanceof Error ? e.message : 'Unknown error',
      stack: e instanceof Error ? e.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to update feedback', 
        details: e instanceof Error ? e.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 