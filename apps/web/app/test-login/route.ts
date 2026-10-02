import { NextRequest, NextResponse } from 'next/server'

export function GET(request: NextRequest) {
  const destination = request.nextUrl.clone()
  destination.pathname = '/ar/login'
  destination.search = ''
  return NextResponse.redirect(destination)
}
