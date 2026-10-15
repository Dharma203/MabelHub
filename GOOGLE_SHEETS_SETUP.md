# Google Sheets Export Setup (5 minutes)

## What's New?
Your tracking pages now have a **"Google Sheets"** export button. One click creates a new Google Sheet with your filtered data, and opens it in a new tab.

## Setup Steps (5 min)

### 1. Create Google Cloud Project
- Go to https://console.cloud.google.com/
- Click **"Create Project"** → name it anything (e.g., "MabelHubStaging")
- Wait for it to load

### 2. Enable Google Sheets API
- In the top search bar, search for **"Google Sheets API"**
- Click the result → **Enable**

### 3. Create Service Account
- Go to https://console.cloud.google.com/iam-admin/serviceaccounts
- Click **"Create Service Account"**
- Name: `mabelhub-export` (any name is fine)
- Click **"Create and Continue"**
- Skip the optional steps, click **"Done"**

### 4. Create Key
- In the service account list, click on **`mabelhub-export`**
- Go to **"Keys"** tab
- Click **"Add Key"** → **"Create new key"**
- Choose **JSON** → **Create**
- This downloads a `.json` file

### 5. Add to Environment
- Open the downloaded JSON file
- Copy **the entire content**
- In your `.env.local`, add:
  ```
  GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
  NEXT_PUBLIC_GOOGLE_SHEETS_ENABLED=true
  ```
  Paste the entire JSON content as the value (all on one line)
- Restart your dev server (`npm run dev`)

### 6. Done ✓
- Go to tracking-database, tracking-broadcast, or tracking-call
- Click **"Export Data"** → **"Google Sheets"** button
- A new sheet opens instantly with your data

## Notes
- **Service Account = Backend Only**: No OAuth flow, super simple. The service account creates sheets on your behalf.
- **Permissions**: Each sheet is created owned by the service account email. You can share it with yourself from there.
- **API Costs**: Free tier (up to 500 requests/day) is more than enough for this use case.

## Troubleshooting
- **"Google Sheets export not configured"**: Did you set the .env var? Check spelling: `GOOGLE_SERVICE_ACCOUNT_JSON`
- **JSON format error**: Paste the **entire** JSON file content (with no line breaks). If too long, keep it as-is.
- **Sheet created but empty**: Check browser console for errors. Verify the JSON is valid (copy-paste from file, not retyped).

## What Files Changed
- `/src/lib/sheets-export.ts` — exports data to Google Sheets via API
- `/src/app/api/export-to-sheets/route.ts` — endpoint that handles the request
- `/src/hooks/useExportToSheets.ts` — React hook for UI
- `/src/app/tracking-database/page.tsx` — added the button & functionality
- (Same to add to: tracking-broadcast, tracking-call)

## Skipped (Ponytail Mode)
- OAuth flow (service account is simpler)
- Custom sheet styling (keeps sheets clean, user can format)
- Batch exports (add when needed)
