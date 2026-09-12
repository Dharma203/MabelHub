import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { readFile } from 'fs/promises'
import path from 'path'
import clientPromise from '@/lib/mongodb'

const unavailableImage = () =>
  new NextResponse(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#f3f4f6"/><path d="M160 360l96-112 72 80 56-64 96 96H160z" fill="#d1d5db"/><circle cx="400" cy="176" r="32" fill="#d1d5db"/><text x="320" y="424" fill="#6b7280" font-family="Arial,sans-serif" font-size="20" text-anchor="middle">Gambar tidak tersedia</text></svg>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store',
      },
    },
  )

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!ObjectId.isValid(id)) {
    return new NextResponse('Invalid ID', { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHub')
  const col = db.collection('VisitActivity')

  const doc = await col.findOne(
    { _id: new ObjectId(id) },
    { projection: { visit_image: 1 } }
  )

  if (!doc || !doc.visit_image) {
    return unavailableImage()
  }

  let visitImage = doc.visit_image as string

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

  try {
    const imageUrl = new URL(visitImage)
    if (
      imageUrl.hostname === 'hub.mabel.co.id' &&
      imageUrl.pathname.startsWith('/uploads/')
    ) {
      visitImage = imageUrl.pathname
    }
  } catch {
    // Relative paths are handled below.
  }

  // Do not redirect image requests to an HTML page returned by the upload host.
  if (visitImage.startsWith('http')) {
    try {
      const response = await fetch(visitImage)
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok || !contentType.startsWith('image/')) {
        return unavailableImage()
      }

      return new NextResponse(await response.arrayBuffer(), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch {
      return unavailableImage()
    }
  }

  // Handle bare filenames (e.g. "visit_1767807306.jpg") by prepending /uploads/
  if (!visitImage.startsWith('/') && !visitImage.startsWith('http') && !visitImage.startsWith('data:')) {
    visitImage = `/uploads/${visitImage}`
  }
  
  if (visitImage.startsWith('/')) {
    if (visitImage.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', visitImage)
      try {
        const buffer = await readFile(filePath)
        const extension = path.extname(filePath).toLowerCase()
        const contentType =
          extension === '.png'
            ? 'image/png'
            : extension === '.webp'
              ? 'image/webp'
              : extension === '.gif'
                ? 'image/gif'
                : 'image/jpg'

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error
        }
        // File not found locally — try fetching from production
        try {
          const prodUrl = `https://hub.mabel.co.id${visitImage}`
          const response = await fetch(prodUrl)
          const contentType = response.headers.get('content-type') || ''
          if (response.ok && contentType.startsWith('image/')) {
            return new NextResponse(await response.arrayBuffer(), {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            })
          }
        } catch {
          // Production fetch also failed
        }
        return unavailableImage()
      }
    }

    return unavailableImage()
  }

  return unavailableImage()
}
