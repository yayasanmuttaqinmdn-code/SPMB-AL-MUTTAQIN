interface VercelRequestLike {
  method?: string;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
}

function extractSpreadsheetId(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(trimmed);
  return match ? match[1] : trimmed;
}

export default function handler(_req: VercelRequestLike, res: VercelResponseLike) {
  const appsScriptUrl = (
    process.env.VITE_APPS_SCRIPT_URL ||
    process.env.APPS_SCRIPT_URL ||
    ''
  ).trim();
  const spreadsheetId = extractSpreadsheetId(
    process.env.VITE_SPREADSHEET_ID || process.env.SPREADSHEET_ID || ''
  );

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({
    ok: true,
    configured: Boolean(appsScriptUrl),
    appsScriptUrl,
    spreadsheetId,
  });
}
