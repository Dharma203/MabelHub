import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/mongodb'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!ObjectId.isValid(id)) {
    return new NextResponse('Invalid ID', { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHubStaging')
  const col = db.collection('VisitActivity')

  const doc = await col.findOne(
    { _id: new ObjectId(id) },
    { projection: { visit_image: 1 } }
  )

  if (!doc || !doc.visit_image) {
    return new NextResponse('Image not found', { status: 404 })
  }

  const visitImage = doc.visit_image as string

  if (visitImage.includes('data:image')) {
    // format: data:image/png;base64,iORw0... or https://.../data:image/png;base64,...
    const matches = visitImage.match(/data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (matches && matches.length === 3) {
      const mimeType = matches[1]
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }
  }

  // If it's a relative URL like /uploads/... or external URL, just redirect to it
  if (visitImage.startsWith('http')) {
    return NextResponse.redirect(visitImage)
  }
  
  if (visitImage.startsWith('/')) {
    const url = new URL(req.url)
    return NextResponse.redirect(`${url.origin}${visitImage}`)
  }

  // Fallback
  return new NextResponse('Invalid image format', { status: 400 })
}
