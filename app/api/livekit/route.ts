import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // 代理到本地 LiveKit 服务器
  const livekitUrl = 'http://localhost:7880';
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/livekit', '');
  const searchParams = url.searchParams.toString();
  
  const targetUrl = `${livekitUrl}${path}${searchParams ? '?' + searchParams : ''}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...Object.fromEntries(req.headers.entries()),
        host: 'localhost:7880',
      },
    });
    
    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to connect to LiveKit server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
