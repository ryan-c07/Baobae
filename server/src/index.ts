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

const PORT = Number(process.env.PORT) || 3847;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "";
const GOOGLE_SHEETS_TAB_NAME = process.env.GOOGLE_SHEETS_TAB_NAME ?? "Votes";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";
const DEFAULT_CHARACTER_IDS = ["atlas", "milo", "kai", "noah"];

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

function ensureDataFile() {
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

function readResponses(): StoredResponse[] {
  ensureDataFile();
  const raw = fs.readFileSync(RESPONSES_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendResponse(entry: StoredResponse) {
  ensureDataFile();
  const all = readResponses();
  all.push(entry);
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(all, null, 2), "utf8");
}

function readActiveCharacterIds() {
  ensureDataFile();
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

function writeActiveCharacterIds(ids: string[]) {
  ensureDataFile();
  const uniqueValidIds = Array.from(
    new Set(ids.filter((id) => DEFAULT_CHARACTER_IDS.includes(id)))
  );
  if (uniqueValidIds.length === 0) {
    throw new Error("At least one character must remain active.");
  }
  fs.writeFileSync(
    CHARACTERS_FILE,
    `${JSON.stringify({ activeCharacterIds: uniqueValidIds }, null, 2)}\n`,
    "utf8"
  );
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

function hasSubmittedAlready(sub?: string) {
  if (!sub) return false;
  return readResponses().some((entry) => entry.user.sub === sub);
}

function sheetsConfigured() {
  return (
    Boolean(GOOGLE_SHEETS_SPREADSHEET_ID) &&
    Boolean(GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
    Boolean(GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
  );
}

async function appendToGoogleSheet(entry: StoredResponse) {
  if (!sheetsConfigured()) return;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const safeAnswers = entry.answers as Record<string, unknown>;

  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    range: `${GOOGLE_SHEETS_TAB_NAME}!A:H`,
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

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, googleConfigured: Boolean(GOOGLE_CLIENT_ID) });
});

app.get("/api/responses/count", (_req, res) => {
  res.json({ count: readResponses().length });
});

app.get("/api/characters", (_req, res) => {
  res.json({ activeCharacterIds: readActiveCharacterIds() });
});

app.get("/api/admin/characters", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json({ activeCharacterIds: readActiveCharacterIds() });
});

app.put("/api/admin/characters", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const incoming = req.body?.activeCharacterIds;
  if (!Array.isArray(incoming)) {
    res.status(400).json({ error: "activeCharacterIds array is required" });
    return;
  }
  try {
    writeActiveCharacterIds(incoming.filter((id): id is string => typeof id === "string"));
    res.json({ ok: true, activeCharacterIds: readActiveCharacterIds() });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Update failed" });
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

  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
    if (hasSubmittedAlready(payload.sub)) {
      res.status(409).json({ error: "This Google account has already submitted." });
      return;
    }

    const entry: StoredResponse = {
      id: randomUUID(),
      receivedAt: new Date().toISOString(),
      user: {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub,
      },
      answers,
    };

    appendResponse(entry);
    try {
      await appendToGoogleSheet(entry);
    } catch (sheetError) {
      console.error("google sheets append failed", sheetError);
    }
    res.json({ ok: true, id: entry.id });
  } catch (e) {
    console.error("verify/submit failed", e);
    res.status(401).json({ error: "Google token verification failed" });
  }
});

ensureDataFile();
app.listen(PORT, () => {
  console.log(`Epic Form API listening on http://localhost:${PORT}`);
  if (!GOOGLE_CLIENT_ID) {
    console.warn("Set GOOGLE_CLIENT_ID in .env or environment.");
  }
});
