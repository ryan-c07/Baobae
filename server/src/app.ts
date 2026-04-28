import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const RESPONSES_FILE = path.join(DATA_DIR, "responses.json");
const CHARACTERS_FILE = path.join(DATA_DIR, "active-characters.json");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "";
const GOOGLE_SHEETS_VOTES_TAB_NAME = process.env.GOOGLE_SHEETS_VOTES_TAB_NAME ?? "Votes";
const GOOGLE_SHEETS_CHARACTERS_TAB_NAME =
  process.env.GOOGLE_SHEETS_CHARACTERS_TAB_NAME ?? "ActiveCharacters";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";
const DEFAULT_CHARACTER_IDS = ["atlas", "milo", "kai", "noah"];
const RUNNING_ON_VERCEL = process.env.VERCEL === "1";

type StoredResponse = {
  id: string;
  receivedAt: string;
  user: {
    email?: string;
    name?: string;
    picture?: string;
    sub?: string;
  };
  answers: unknown;
};

function ensureLocalDataFiles() {
  if (RUNNING_ON_VERCEL) {
    throw new Error(
      "Local file persistence is disabled on Vercel. Configure Google Sheets env vars."
    );
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RESPONSES_FILE)) {
    fs.writeFileSync(RESPONSES_FILE, "[]\n", "utf8");
  }
  if (!fs.existsSync(CHARACTERS_FILE)) {
    fs.writeFileSync(
      CHARACTERS_FILE,
      `${JSON.stringify({ activeCharacterIds: DEFAULT_CHARACTER_IDS }, null, 2)}\n`,
      "utf8"
    );
  }
}

function assertSheetsOnVercel() {
  if (RUNNING_ON_VERCEL && !sheetsConfigured()) {
    throw new Error(
      "Google Sheets is required on Vercel. Missing one or more GOOGLE_SHEETS_* or service account env vars."
    );
  }
}

function sheetsConfigured() {
  return (
    Boolean(GOOGLE_SHEETS_SPREADSHEET_ID) &&
    Boolean(GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
    Boolean(GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
  );
}

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function readLocalResponses(): StoredResponse[] {
  ensureLocalDataFiles();
  const raw = fs.readFileSync(RESPONSES_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendLocalResponse(entry: StoredResponse) {
  const all = readLocalResponses();
  all.push(entry);
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(all, null, 2), "utf8");
}

function readLocalActiveCharacterIds() {
  ensureLocalDataFiles();
  const raw = fs.readFileSync(CHARACTERS_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw) as { activeCharacterIds?: unknown };
    if (!Array.isArray(parsed.activeCharacterIds)) return DEFAULT_CHARACTER_IDS;
    const normalized = parsed.activeCharacterIds
      .filter((id): id is string => typeof id === "string")
      .filter((id) => DEFAULT_CHARACTER_IDS.includes(id));
    return normalized.length > 0 ? normalized : DEFAULT_CHARACTER_IDS;
  } catch {
    return DEFAULT_CHARACTER_IDS;
  }
}

function writeLocalActiveCharacterIds(ids: string[]) {
  const uniqueValidIds = Array.from(
    new Set(ids.filter((id) => DEFAULT_CHARACTER_IDS.includes(id)))
  );
  if (uniqueValidIds.length === 0) {
    throw new Error("At least one character must remain active.");
  }
  ensureLocalDataFiles();
  fs.writeFileSync(
    CHARACTERS_FILE,
    `${JSON.stringify({ activeCharacterIds: uniqueValidIds }, null, 2)}\n`,
    "utf8"
  );
}

async function readSheetResponses(): Promise<StoredResponse[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    range: `${GOOGLE_SHEETS_VOTES_TAB_NAME}!A2:H`,
  });
  const rows = (res.data.values ?? []) as string[][];
  return rows.map((row: string[]) => {
    const answersRaw = row[7] ?? "{}";
    let answers: unknown = {};
    try {
      answers = JSON.parse(answersRaw);
    } catch {
      answers = {};
    }
    return {
      id: row[1] ?? "",
      receivedAt: row[0] ?? "",
      user: {
        email: row[2] ?? "",
        name: row[3] ?? "",
        sub: row[4] ?? "",
      },
      answers,
    };
  });
}

async function appendSheetResponse(entry: StoredResponse) {
  const sheets = getSheetsClient();
  const safeAnswers = entry.answers as Record<string, unknown>;
  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    range: `${GOOGLE_SHEETS_VOTES_TAB_NAME}!A:H`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          entry.receivedAt,
          entry.id,
          entry.user.email ?? "",
          entry.user.name ?? "",
          entry.user.sub ?? "",
          String(safeAnswers.selectedContestantName ?? ""),
          String(safeAnswers.selectedCharacterAlias ?? ""),
          JSON.stringify(entry.answers),
        ],
      ],
    },
  });
}

async function readSheetActiveCharacterIds() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    range: `${GOOGLE_SHEETS_CHARACTERS_TAB_NAME}!A1:Z1`,
  });
  const row = res.data.values?.[0] ?? [];
  const normalized = row
    .filter((id: string): id is string => typeof id === "string")
    .filter((id: string) => DEFAULT_CHARACTER_IDS.includes(id));
  return normalized.length > 0 ? normalized : DEFAULT_CHARACTER_IDS;
}

async function writeSheetActiveCharacterIds(ids: string[]) {
  const uniqueValidIds = Array.from(
    new Set(ids.filter((id) => DEFAULT_CHARACTER_IDS.includes(id)))
  );
  if (uniqueValidIds.length === 0) {
    throw new Error("At least one character must remain active.");
  }
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    range: `${GOOGLE_SHEETS_CHARACTERS_TAB_NAME}!A1:Z1`,
    valueInputOption: "RAW",
    requestBody: { values: [uniqueValidIds] },
  });
}

async function readResponses() {
  assertSheetsOnVercel();
  if (sheetsConfigured()) {
    return readSheetResponses();
  }
  return readLocalResponses();
}

async function appendResponse(entry: StoredResponse) {
  assertSheetsOnVercel();
  if (sheetsConfigured()) {
    await appendSheetResponse(entry);
    return;
  }
  appendLocalResponse(entry);
}

async function readActiveCharacterIds() {
  assertSheetsOnVercel();
  if (sheetsConfigured()) {
    return readSheetActiveCharacterIds();
  }
  return readLocalActiveCharacterIds();
}

async function writeActiveCharacterIds(ids: string[]) {
  assertSheetsOnVercel();
  if (sheetsConfigured()) {
    await writeSheetActiveCharacterIds(ids);
    return;
  }
  writeLocalActiveCharacterIds(ids);
}

async function hasSubmittedAlready(sub?: string) {
  if (!sub) return false;
  const responses = await readResponses();
  return responses.some((entry) => entry.user.sub === sub);
}

function requireAdminToken(req: express.Request, res: express.Response) {
  if (!ADMIN_TOKEN) {
    res.status(500).json({ error: "Server missing ADMIN_TOKEN" });
    return false;
  }
  const token = req.header("x-admin-token");
  if (!token || token !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Invalid admin token" });
    return false;
  }
  return true;
}

export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (_req, res) => {
  const sheetsReady = sheetsConfigured();
  res.json({
    ok: true,
    googleConfigured: Boolean(GOOGLE_CLIENT_ID),
    persistence:
      RUNNING_ON_VERCEL && !sheetsReady
        ? "misconfigured-google-sheets-required"
        : sheetsReady
          ? "google-sheets"
          : "local-files",
  });
});

app.get("/api/responses/count", async (_req, res) => {
  try {
    res.json({ count: (await readResponses()).length });
  } catch (error) {
    console.error("responses/count failed", error);
    res.status(500).json({ error: "Failed to read responses from persistence layer." });
  }
});

app.get("/api/characters", async (_req, res) => {
  try {
    res.json({ activeCharacterIds: await readActiveCharacterIds() });
  } catch (error) {
    console.error("characters read failed", error);
    res.status(500).json({ error: "Failed to read active characters from persistence layer." });
  }
});

app.get("/api/admin/characters", async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    res.json({ activeCharacterIds: await readActiveCharacterIds() });
  } catch (error) {
    console.error("admin characters read failed", error);
    res.status(500).json({ error: "Failed to read active characters from persistence layer." });
  }
});

app.put("/api/admin/characters", async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const incoming = req.body?.activeCharacterIds;
  if (!Array.isArray(incoming)) {
    res.status(400).json({ error: "activeCharacterIds array is required" });
    return;
  }
  try {
    await writeActiveCharacterIds(
      incoming.filter((id): id is string => typeof id === "string")
    );
    res.json({ ok: true, activeCharacterIds: await readActiveCharacterIds() });
  } catch (error) {
    console.error("admin characters write failed", error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Failed to update characters." });
  }
});

app.post("/api/submit", async (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(500).json({ error: "Server missing GOOGLE_CLIENT_ID" });
    return;
  }

  const idToken = req.body?.idToken as string | undefined;
  const answers = req.body?.answers;

  if (!idToken || typeof idToken !== "string") {
    res.status(400).json({ error: "idToken required" });
    return;
  }

  if (answers === undefined || answers === null || typeof answers !== "object") {
    res.status(400).json({ error: "answers object required" });
    return;
  }

  let payload:
    | {
        email?: string | null;
        name?: string | null;
        picture?: string | null;
        sub?: string;
      }
    | undefined;
  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.error("token verification failed", error);
    res.status(401).json({ error: "Google token verification failed" });
    return;
  }
  if (!payload) {
    res.status(401).json({ error: "Invalid token payload" });
    return;
  }
  try {
    if (await hasSubmittedAlready(payload.sub)) {
      res.status(409).json({ error: "This Google account has already submitted." });
      return;
    }
  } catch (error) {
    console.error("duplicate-check failed", error);
    res.status(500).json({ error: "Failed to check prior submissions." });
    return;
  }

  const entry: StoredResponse = {
    id: randomUUID(),
    receivedAt: new Date().toISOString(),
    user: {
      email: payload.email ?? undefined,
      name: payload.name ?? undefined,
      picture: payload.picture ?? undefined,
      sub: payload.sub,
    },
    answers,
  };
  try {
    await appendResponse(entry);
    res.json({ ok: true, id: entry.id });
  } catch (error) {
    console.error("submit persistence failed", error);
    res.status(500).json({ error: "Failed to save vote to persistence layer." });
  }
});

if (!sheetsConfigured()) {
  try {
    ensureLocalDataFiles();
  } catch (error) {
    console.error("persistence bootstrap warning", error);
  }
}
