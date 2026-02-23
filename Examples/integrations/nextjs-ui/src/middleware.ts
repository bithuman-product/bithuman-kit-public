import { NextResponse } from 'next/server';

// Simplified middleware that just allows all requests through
export async function middleware() {
  // For simplicity, just allow all requests to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match the root and any direct path segment (like /abc123)
    '/',
    '/:path',
    // Exclude Next.js internal paths and static files
    '/((?!_next|api|bitHuman.png|.*\\.).*)'
  ],
}; 