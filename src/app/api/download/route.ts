import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import https from "https";

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url') || 'https://raw.githubusercontent.com/TheMaggieSimpson/IndonesiaGeoJSON/master/kota-kabupaten.json';

  return new Promise<NextResponse>((resolve) => {
    https.get(targetUrl, { headers: { 'User-Agent': 'Node' } }, (res) => {
      if (res.statusCode !== 200) {
        resolve(NextResponse.json({ error: `Failed to fetch, status: ${res.statusCode}` }, { status: 502 }));
        return;
      }

      const filePath = path.join(process.cwd(), 'public', 'geojson', 'indonesia-kab-kota.geojson');
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(NextResponse.json({ success: true, path: filePath }));
      });

      fileStream.on('error', (err) => {
        resolve(NextResponse.json({ error: err.message }, { status: 500 }));
      });
    }).on('error', (err) => {
      resolve(NextResponse.json({ error: err.message }, { status: 500 }));
    });
  });
}