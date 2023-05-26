import { NextRequest, NextResponse } from 'next/server'
import { kv } from "@vercel/kv"

export const config = {
  matcher: '/:path*',
}

export async function middleware(req: NextRequest) {

  const path = req.nextUrl.pathname.replace('/', '')

  let endURL = await kv.get(path)

  if (path) {
    if (endURL) {

      // if endURL missing http/https, add it
      if (!endURL.match(/^[a-zA-Z]+:\/\//)) {
        endURL = 'http://' + endURL
      }
      return NextResponse.redirect(new URL(endURL))

    } else {

      // Search for a secure key
      let allKeys = []
      for await (const key of kv.scanIterator()) {
        allKeys.push(key)
      }
      let secureKey = allKeys.find((key) => key.startsWith(path))
      if (secureKey) {
        return NextResponse.redirect(new URL(req.nextUrl.toString().replace('/' + path, '') + '/unlock?key=' + path.split('$')[0]))
      }
      else if (path.includes('$')) {
        return NextResponse.redirect(new URL(req.nextUrl.toString().replace('/' + path, '') + '/unlock?key=' + path.split('$')[0] ))
      }

      return NextResponse.next()
    }
  } else {
    return NextResponse.next()
  }

}