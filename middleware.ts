import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAdmin = token?.role === 'ADMIN'
    const isStaff = token?.role === 'OUTLET_STAFF'
    const isCustomer = token?.role === 'CUSTOMER'
    
    // Get the pathname
    const { pathname } = req.nextUrl
    
    // Redirect logic based on role
    if (pathname === '/' || pathname === '/login') {
      if (isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      } else if (isStaff) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      } else if (isCustomer) {
        return NextResponse.redirect(new URL('/profile', req.url))
      }
    }
    
    // Protect admin routes
    if (pathname.startsWith('/settings') && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pos/:path*', 
    '/profile/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/'
  ]
}
