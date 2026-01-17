import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple HTTP Basic Auth middleware
// Set DASHBOARD_PASSWORD environment variable to enable

export function middleware(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  
  // If no password set, allow all requests (dev mode)
  if (!password) {
    return NextResponse.next();
  }

  // Check for auth header
  const authHeader = request.headers.get('authorization');
  
  if (authHeader) {
    const [type, credentials] = authHeader.split(' ');
    
    if (type === 'Basic') {
      const decoded = atob(credentials);
      const [user, pass] = decoded.split(':');
      
      // Username can be anything, just check password
      if (pass === password) {
        return NextResponse.next();
      }
    }
  }

  // Request authentication
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Minecraft Dashboard"',
    },
  });
}

// Protect all routes except health checks
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/health (health checks)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!api/health|_next/static|_next/image|favicon.ico).*)',
  ],
};

