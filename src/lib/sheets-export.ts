import { google } from 'googleapis'
import { JWT, Credentials } from 'google-auth-library'

// ponytail: service account auth, add OAuth if users need personal sheet access
export async function createGoogleSheet(
  title: string,
  headers: string[],
  rows: (string | number | boolean | null)[][]
): Promise<string> {
  const serviceAccount = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}'
  ) as any

  const jwtClient = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  })

  
  const auth = await jwtClient.authorize()
  const sheets = google.sheets({ version: 'v4', auth: jwtClient as any }) // Atau gunakan opsi pemanggilan alternatif

  // Create spreadsheet
  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [
        {
          properties: { sheetId: 0, title: 'Export' },
          data: [
            {
              rowData: [
                {
                  values: headers.map((h) => ({
                    userEnteredValue: { stringValue: h },
                    userEnteredFormat: { textFormat: { bold: true } },
                  })),
                },
                ...rows.map((row) => ({
                  values: row.map((cell) => ({
                    userEnteredValue: cellValue(cell),
                  })),
                })),
              ],
            },
          ],
        },
      ],
    },
  })

  const sheetId = createResponse.data.spreadsheetId!

  // Share with owner (read + write)
  // Make the sheet publicly accessible via link so the user can open it
  const drive = google.drive({ version: 'v3', auth: jwtClient as any })
  await drive.permissions.create({
    fileId: sheetId,
    requestBody: {
      role: 'writer',
      type: 'anyone',
    },
  })

  return `https://docs.google.com/spreadsheets/d/${sheetId}`
}

function cellValue(value: any) {
  if (value === null || value === undefined) return { stringValue: '' }
  if (typeof value === 'boolean') return { boolValue: value }
  if (typeof value === 'number') return { numberValue: value }
  return { stringValue: String(value) }
}
