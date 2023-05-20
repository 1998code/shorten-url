import { NextRequest, NextResponse } from 'next/server'
import { kv } from "@vercel/kv"

export const config = {
  matcher: '/:path*',
}

export async function middleware(req: NextRequest) {

  const path = req.nextUrl.pathname.replace('/', '')

  let endURL = await kv.get(path)

  if (endURL) {
    // if endURL missing http/https, add it
    if (!endURL.match(/^[a-zA-Z]+:\/\//)) {
      endURL = 'http://' + endURL
    }
    return NextResponse.redirect(new URL(endURL))
  } else {
    return NextResponse.next()
  }

}