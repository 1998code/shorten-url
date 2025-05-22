import { NextRequest, NextResponse } from 'next/server'
import { kv } from "@vercel/kv"

/**
 * Configuration for URL path matching
 */
export const config = {
  matcher: '/:path*',
}

/**
 * URL redirection middleware
 * 
 * Handles short URL redirection with support for:
 * - Direct URL redirection
 * - Password-protected URLs (using $ delimiter)
 * - Unlock page redirection for protected URLs
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/', '')
  
  // Skip middleware for system paths
  if (path.startsWith('api/') || path.startsWith('img/') || path === '' || path.startsWith('_next/static/')) {
    return NextResponse.next()
  }

  // Handle password-protected URLs (with $ delimiter)
  if (path.includes('$')) {
    const longUrl = await kv.get(path)
    
    if (longUrl) {
      // Ensure URL has protocol
      let finalUrl = longUrl
      if (!finalUrl.match(/^[a-zA-Z]+:\/\//)) {
        finalUrl = 'http://' + finalUrl
      }
      return NextResponse.redirect(new URL(finalUrl))
    }
  }
  
  // Handle direct URL redirection
  const longUrl = await kv.get(path)
  if (longUrl) {
    // Ensure URL has protocol
    if (!longUrl.match(/^[a-zA-Z]+:\/\//)) {
      return NextResponse.redirect(new URL('http://' + longUrl))
    }
    return NextResponse.redirect(new URL(longUrl))
  }
  
  // Check for password-protected URLs
  const hasSecuredUrl = await kv.exists(`${path}$*`)
  if (hasSecuredUrl) {
    return NextResponse.redirect(new URL(`${req.nextUrl.origin}/unlock?key=${path}`))
  }

  // Fallback pattern matching for KV implementations
  let securedUrlFound = false
  try {
    // Fast pattern-based scan
    for await (const key of kv.scanIterator({ match: `${path}$*`, count: 1 })) {
      securedUrlFound = true
      break;
    }
    
    if (securedUrlFound) {
      return NextResponse.redirect(new URL(`${req.nextUrl.origin}/unlock?key=${path}`))
    }
  } catch (error) {
    // Progressive fallback for KV implementations without pattern matching
    for await (const key of kv.scanIterator()) {
      if (key.startsWith(`${path}$`)) {
        return NextResponse.redirect(new URL(`${req.nextUrl.origin}/unlock?key=${path}`))
      }
    }
  }

  return NextResponse.next()
}