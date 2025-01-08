import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { VoteRecord } from '@/types/feedback';

export async function GET() {
  // Only allow in development mode for security
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db("zenflow");
    
    // Get all vote records with user data
    const votes = await db.collection<VoteRecord>("votes")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Get analytics data
    const totalVotes = await db.collection("votes").countDocuments();
    const uniqueUsers = await db.collection("votes").distinct('userIP').then(ips => ips.length);
    const deviceBreakdown = await db.collection("votes").aggregate([
      { $group: { _id: "$device.type", count: { $sum: 1 } } }
    ]).toArray();
    const countryBreakdown = await db.collection("votes").aggregate([
      { $group: { _id: "$geo.country", count: { $sum: 1 } } }
    ]).toArray();
    const browserBreakdown = await db.collection("votes").aggregate([
      { $group: { _id: "$device.browser", count: { $sum: 1 } } }
    ]).toArray();
    const meditationTypeBreakdown = await db.collection("votes").aggregate([
      { $group: { _id: "$meditationType", count: { $sum: 1 } } }
    ]).toArray();

    // Create HTML content
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ZenFlow Analytics Dashboard</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .dashboard {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin-bottom: 40px;
            }
            .card {
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
              margin-bottom: 30px;
            }
            h2 {
              color: #444;
              margin-top: 0;
            }
            .stat {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin: 10px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              background: #f8f9fa;
            }
            .recent-votes {
              margin-top: 40px;
            }
          </style>
        </head>
        <body>
          <h1>ZenFlow Analytics Dashboard</h1>
          
          <div class="dashboard">
            <div class="card">
              <h2>Overview</h2>
              <div class="stat">Total Votes: ${totalVotes}</div>
              <div class="stat">Unique Users: ${uniqueUsers}</div>
            </div>
            
            <div class="card">
              <h2>Device Types</h2>
              <table>
                <tr><th>Device</th><th>Count</th></tr>
                ${deviceBreakdown.map(d => `
                  <tr><td>${d._id || 'Unknown'}</td><td>${d.count}</td></tr>
                `).join('')}
              </table>
            </div>

            <div class="card">
              <h2>Countries</h2>
              <table>
                <tr><th>Country</th><th>Count</th></tr>
                ${countryBreakdown.map(c => `
                  <tr><td>${c._id || 'Unknown'}</td><td>${c.count}</td></tr>
                `).join('')}
              </table>
            </div>

            <div class="card">
              <h2>Browsers</h2>
              <table>
                <tr><th>Browser</th><th>Count</th></tr>
                ${browserBreakdown.map(b => `
                  <tr><td>${b._id || 'Unknown'}</td><td>${b.count}</td></tr>
                `).join('')}
              </table>
            </div>

            <div class="card">
              <h2>Meditation Types</h2>
              <table>
                <tr><th>Type</th><th>Count</th></tr>
                ${meditationTypeBreakdown.map(m => `
                  <tr><td>${m._id || 'Unknown'}</td><td>${m.count}</td></tr>
                `).join('')}
              </table>
            </div>
          </div>

          <div class="card recent-votes">
            <h2>Recent Votes</h2>
            <table>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Vote</th>
                <th>Country</th>
                <th>Device</th>
                <th>Browser</th>
              </tr>
              ${votes.map(vote => `
                <tr>
                  <td>${new Date(vote.createdAt).toLocaleString()}</td>
                  <td>${vote.meditationType}</td>
                  <td>${vote.isLike ? '👍' : '👎'}</td>
                  <td>${vote.geo?.country || 'Unknown'}</td>
                  <td>${vote.device?.type || 'Unknown'}</td>
                  <td>${vote.device?.browser || 'Unknown'}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        </body>
      </html>
    `;

    // Return HTML response
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (e) {
    console.error('Failed to fetch analytics:', e);
    return new NextResponse(
      '<h1>Error loading analytics dashboard</h1><p>Failed to fetch data from database.</p>',
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
} 