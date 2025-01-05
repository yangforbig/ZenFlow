import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    // Attempt to connect to MongoDB
    const client = await clientPromise;
    const db = client.db("zenflow");
    
    // Try a simple operation
    const result = await db.command({ ping: 1 });
    
    return NextResponse.json({
      status: 'success',
      message: 'Connected to MongoDB!',
      dbName: db.databaseName,
      ping: result.ok === 1 ? 'successful' : 'failed'
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to MongoDB',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 