import { useMemo, useState, type CSSProperties } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { AnimatePresence, motion } from "framer-motion";
import { defaultAnswers, type FormAnswers } from "./types";
import { decodeJwtPayload } from "./utils/decodeJwtPayload";

type Character = {
  id: string;
  name: string;
  subtitle: string;
  tagline: string;
  accent: string;
  gradient: string;
  emoji: string;
};

const CHARACTERS: Character[] = [
  {
    id: "molly",
    name: "Molly",
    subtitle: "Dreamy troublemaker",
    tagline: "The classic face for voters who want sweet chaos.",
    accent: "#ff7ab6",
    gradient: "linear-gradient(135deg, #ffe1ef 0%, #ff9fc8 50%, #ff7ab6 100%)",
    emoji: "🎀",
  },
  {
    id: "skullpanda",
    name: "Skullpanda",
    subtitle: "Cool and mysterious",
    tagline: "For the crowd that wants fashion, edge, and moonlit drama.",
    accent: "#8b7bff",
    gradient: "linear-gradient(135deg, #efeaff 0%, #b8abff 52%, #8876ff 100%)",
    emoji: "🌙",
  },
  {
    id: "dimoo",
    name: "Dimoo",
    subtitle: "Soft cloud explorer",
    tagline: "Floaty, calm, and impossible not to root for.",
    accent: "#62c8ff",
    gradient: "linear-gradient(135deg, #e5f8ff 0%, #9be2ff 52%, #61c8ff 100%)",
    emoji: "☁️",
  },
  {
    id: "hirono",
    name: "Hirono",
    subtitle: "Quiet little rebel",
    tagline: "A little grumpy, a little brave, very collectible.",
    accent: "#ffb547",
    gradient: "linear-gradient(135deg, #fff0d6 0%, #ffd08a 52%, #ffb547 100%)",
    emoji: "🧡",
  },
];

export default function App() {
  const [answers, setAnswers] = useState<FormAnswers>(defaultAnswers);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const profile = useMemo(
    () => (idToken ? decodeJwtPayload(idToken) : {}),
    [idToken]
  );
  const clientConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const selectedCharacter =
    CHARACTERS.find((item) => item.id === answers.vibeWord) ?? CHARACTERS[0];
  const canSubmit =
    Boolean(idToken) &&
    answers.displayName.trim().length > 0 &&
    answers.vibeWord.trim().length > 0;

  const patch = (partial: Partial<FormAnswers>) =>
    setAnswers((current) => ({ ...current, ...partial }));

  const selectCharacter = (character: Character) => {
    patch({
      vibeWord: character.id,
      colorPick: character.accent,
      creativeDoodle: character.name,
    });
  };

  const resetVote = () => {
    setStatus("idle");
    setErrorMsg(null);
    setIdToken(null);
    setAnswers(defaultAnswers());
  };

  const submit = async () => {
    if (!canSubmit || !idToken) return;
    setStatus("sending");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Submit failed"
        );
      }
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
    }
  };

  if (status === "done") {
    return (
      <main style={page}>
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          style={{ ...panel, maxWidth: 680, textAlign: "center" }}
        >
          <div style={successMascot}>{selectedCharacter.emoji}</div>
          <p style={eyebrow}>Vote Received</p>
          <h1 className="serif" style={heroTitle}>
            {selectedCharacter.name} just gained another fan.
          </h1>
          <p style={{ ...mutedText, maxWidth: 480, margin: "0 auto 1.5rem" }}>
            Your collectible-character vote is saved to the server and tied to
            your Google account. The shelf looks better already.
          </p>
          <button type="button" onClick={resetVote} style={primaryBtn}>
            Vote again
          </button>
        </motion.section>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={backdropGlow(selectedCharacter.accent)} />
      <section style={{ width: "100%", maxWidth: 1180, position: "relative", zIndex: 1 }}>
        {!clientConfigured && (
          <div
            style={{
              ...banner,
              borderColor: "rgba(245, 158, 11, 0.35)",
              background: "rgba(255, 247, 214, 0.92)",
              marginBottom: "1rem",
            }}
          >
            Add <code>VITE_GOOGLE_CLIENT_ID</code> in `client/.env`, and match it
            on the server as <code>GOOGLE_CLIENT_ID</code>.
          </div>
        )}

        <div style={heroLayout}>
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{ ...panel, overflow: "hidden" }}
          >
            <p style={eyebrow}>Epic Form Studio x Character Voting</p>
            <h1 className="serif" style={heroTitle}>
              Pick the character you want on the next big shelf.
            </h1>
            <p style={{ ...mutedText, maxWidth: 620 }}>
              A playful, Pop Mart-inspired voting page with bright packaging
              colors, collectible energy, and quick fan feedback.
            </p>

            <div style={heroStats}>
              <div style={statChip}>
                <span style={statLabel}>Selected</span>
                <strong>{selectedCharacter.name}</strong>
              </div>
              <div style={statChip}>
                <span style={statLabel}>Hype</span>
                <strong>{answers.mood}%</strong>
              </div>
              <div style={statChip}>
                <span style={statLabel}>Theme</span>
                <strong>{selectedCharacter.subtitle}</strong>
              </div>
            </div>

            <div style={{ ...collectorCard, background: selectedCharacter.gradient }}>
              <div>
                <div style={collectorBadge}>Fan Pick</div>
                <h2 style={{ margin: "0.4rem 0 0.25rem", fontSize: "1.8rem", color: "#2a1733" }}>
                  {selectedCharacter.name}
                </h2>
                <p style={{ margin: 0, color: "rgba(42, 23, 51, 0.8)", maxWidth: 360 }}>
                  {selectedCharacter.tagline}
                </p>
              </div>
              <div style={collectorEmoji}>{selectedCharacter.emoji}</div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            style={panel}
          >
            <div style={sectionHead}>
              <h2 style={sectionTitle}>Cast your vote</h2>
              <span style={pill}>{answers.vibeWord ? "1 character selected" : "Choose 1"}</span>
            </div>

            <div style={characterGrid}>
              {CHARACTERS.map((character) => {
                const isActive = answers.vibeWord === character.id;
                return (
                  <motion.button
                    key={character.id}
                    type="button"
                    onClick={() => selectCharacter(character)}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      ...characterCard,
                      borderColor: isActive ? character.accent : "rgba(33, 18, 44, 0.08)",
                      boxShadow: isActive
                        ? `0 22px 48px ${hexToShadow(character.accent)}`
                        : "0 14px 30px rgba(56, 37, 75, 0.08)",
                    }}
                  >
                    <div style={{ ...characterPortrait, background: character.gradient }}>
                      <span style={characterEmoji}>{character.emoji}</span>
                    </div>
                    <div style={characterMeta}>
                      <div>
                        <div style={characterName}>{character.name}</div>
                        <div style={characterSubtitle}>{character.subtitle}</div>
                      </div>
                      <span
                        style={{
                          ...voteTag,
                          background: isActive ? character.accent : "#fff6d8",
                          color: isActive ? "#fff" : "#8c6518",
                        }}
                      >
                        {isActive ? "Voted" : "Tap to vote"}
                      </span>
                    </div>
                    <p style={characterTagline}>{character.tagline}</p>
                  </motion.button>
                );
              })}
            </div>

            <div style={formGrid}>
              <label style={label}>
                Your display name
                <input
                  value={answers.displayName}
                  onChange={(e) => patch({ displayName: e.target.value })}
                  placeholder="Collector name"
                  style={input}
                />
              </label>

              <label style={label}>
                Backup favorite
                <select
                  value={answers.creativeAct}
                  onChange={(e) => patch({ creativeAct: e.target.value })}
                  style={input}
                >
                  <option value="">Pick a runner-up</option>
                  {CHARACTERS.filter((item) => item.id !== answers.vibeWord).map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={label}>
              Why should this character win?
              <textarea
                value={answers.freeform}
                onChange={(e) => patch({ freeform: e.target.value })}
                placeholder="Tell us about the styling, personality, lore, or shelf appeal."
                rows={4}
                style={{ ...input, resize: "vertical", minHeight: 116 }}
              />
            </label>

            <label style={label}>
              Hype level
              <div style={sliderShell}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={answers.mood}
                  onChange={(e) => patch({ mood: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: selectedCharacter.accent }}
                />
                <div style={meterRow}>
                  <span style={mutedText}>Cute</span>
                  <strong>{answers.mood}%</strong>
                  <span style={mutedText}>Must-have</span>
                </div>
              </div>
            </label>

            <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: "0.65rem" }}>
              <input
                type="checkbox"
                checked={answers.wantsNewsletter}
                onChange={(e) => patch({ wantsNewsletter: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: selectedCharacter.accent }}
              />
              <span>Notify me when the next vote or drop opens.</span>
            </label>

            <div style={authCard}>
              <div>
                <div style={sectionTitle}>Verify your vote</div>
                <p style={{ ...mutedText, margin: "0.25rem 0 0" }}>
                  Google sign-in keeps voting tied to one account.
                </p>
              </div>
              {clientConfigured ? (
                <GoogleLogin
                  onSuccess={(credential: CredentialResponse) => {
                    if (credential.credential) setIdToken(credential.credential);
                  }}
                  onError={() => setErrorMsg("Google sign-in failed")}
                  theme="outline"
                  size="large"
                  text="continue_with"
                  shape="pill"
                />
              ) : (
                <span style={mutedText}>Client ID required for Google sign-in.</span>
              )}
            </div>

            <AnimatePresence>
              {idToken && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={profileCard}
                >
                  {profile.picture && (
                    <img
                      src={profile.picture}
                      alt=""
                      width={48}
                      height={48}
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 700 }}>{profile.name ?? "Signed in"}</div>
                    <div style={mutedText}>{profile.email}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {status === "error" && errorMsg && <div style={banner}>{errorMsg}</div>}

            <motion.button
              type="button"
              onClick={submit}
              disabled={!canSubmit || status === "sending"}
              whileHover={{ scale: canSubmit ? 1.01 : 1 }}
              whileTap={{ scale: canSubmit ? 0.99 : 1 }}
              style={{ ...primaryBtn, width: "100%", opacity: canSubmit ? 1 : 0.55 }}
            >
              {status === "sending" ? "Submitting vote..." : "Submit vote"}
            </motion.button>
          </motion.section>
        </div>
      </section>
    </main>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "clamp(1rem, 3vw, 2rem)",
  background:
    "radial-gradient(circle at top left, rgba(255, 182, 214, 0.55), transparent 32%), radial-gradient(circle at top right, rgba(150, 214, 255, 0.45), transparent 28%), linear-gradient(180deg, #fff8f2 0%, #fffef9 100%)",
};

const panel: CSSProperties = {
  background: "rgba(255, 255, 255, 0.82)",
  border: "1px solid rgba(255, 255, 255, 0.9)",
  borderRadius: 32,
  padding: "clamp(1.2rem, 2vw, 2rem)",
  boxShadow: "0 28px 70px rgba(93, 53, 120, 0.14)",
  backdropFilter: "blur(18px)",
};

const heroLayout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.05fr 1fr",
  gap: "1.25rem",
  alignItems: "start",
};

const eyebrow: CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: "0.74rem",
  fontWeight: 700,
  color: "#a86c8c",
};

const heroTitle: CSSProperties = {
  margin: "0.55rem 0 0.85rem",
  fontWeight: 400,
  fontSize: "clamp(2.4rem, 5vw, 4.8rem)",
  lineHeight: 0.95,
  color: "#301e38",
};

const mutedText: CSSProperties = {
  color: "#7d6b86",
  fontSize: "0.97rem",
};

const heroStats: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
  margin: "1.25rem 0 1.5rem",
};

const statChip: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.15rem",
  borderRadius: 18,
  padding: "0.75rem 0.9rem",
  background: "rgba(255, 255, 255, 0.76)",
  border: "1px solid rgba(48, 30, 56, 0.08)",
  minWidth: 132,
};

const statLabel: CSSProperties = {
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#9b7d8f",
};

const collectorCard: CSSProperties = {
  borderRadius: 28,
  padding: "1.4rem",
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
  alignItems: "center",
  minHeight: 240,
};

const collectorBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "0.4rem 0.8rem",
  background: "rgba(255, 255, 255, 0.6)",
  color: "#6f4865",
  fontSize: "0.8rem",
  fontWeight: 700,
};

const collectorEmoji: CSSProperties = {
  fontSize: "clamp(4rem, 10vw, 7rem)",
  lineHeight: 1,
  filter: "drop-shadow(0 12px 28px rgba(73, 40, 64, 0.16))",
};

const successMascot: CSSProperties = {
  fontSize: "4.5rem",
  marginBottom: "1rem",
};

const sectionHead: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "0.75rem",
  flexWrap: "wrap",
  marginBottom: "1rem",
};

const sectionTitle: CSSProperties = {
  fontSize: "1.2rem",
  fontWeight: 700,
  color: "#301e38",
};

const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "0.45rem 0.8rem",
  background: "#fff1c8",
  color: "#8c6518",
  fontSize: "0.78rem",
  fontWeight: 700,
};

const characterGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "1rem",
  marginBottom: "1.2rem",
};

const characterCard: CSSProperties = {
  appearance: "none",
  textAlign: "left",
  borderRadius: 26,
  border: "2px solid rgba(33, 18, 44, 0.08)",
  background: "#fff",
  padding: "0.9rem",
};

const characterPortrait: CSSProperties = {
  height: 180,
  borderRadius: 22,
  display: "grid",
  placeItems: "center",
  marginBottom: "0.85rem",
};

const characterEmoji: CSSProperties = {
  fontSize: "3.25rem",
};

const characterMeta: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "0.75rem",
  alignItems: "center",
};

const characterName: CSSProperties = {
  fontSize: "1.15rem",
  fontWeight: 800,
  color: "#301e38",
};

const characterSubtitle: CSSProperties = {
  color: "#8f778f",
  fontSize: "0.88rem",
};

const voteTag: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "0.35rem 0.65rem",
  fontSize: "0.72rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const characterTagline: CSSProperties = {
  margin: "0.85rem 0 0",
  color: "#715f7a",
  fontSize: "0.92rem",
};

const formGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "1rem",
};

const label: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.45rem",
  fontSize: "0.92rem",
  color: "#4d3758",
  marginBottom: "1rem",
};

const input: CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(63, 37, 82, 0.12)",
  background: "rgba(255, 255, 255, 0.95)",
  color: "#301e38",
  padding: "0.85rem 1rem",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
};

const sliderShell: CSSProperties = {
  borderRadius: 22,
  background: "#fff8ef",
  padding: "0.95rem 1rem",
  border: "1px solid rgba(63, 37, 82, 0.08)",
};

const meterRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "0.75rem",
  marginTop: "0.5rem",
  alignItems: "center",
};

const authCard: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  flexWrap: "wrap",
  borderRadius: 22,
  padding: "1rem 1.1rem",
  background: "#fff8ef",
  border: "1px solid rgba(63, 37, 82, 0.08)",
  marginBottom: "1rem",
};

const profileCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.8rem",
  borderRadius: 20,
  padding: "0.85rem 1rem",
  background: "#ffffff",
  border: "1px solid rgba(63, 37, 82, 0.08)",
  marginBottom: "1rem",
};

const primaryBtn: CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "0.95rem 1.35rem",
  fontWeight: 800,
  color: "#fff",
  background: "linear-gradient(135deg, #ff8fbe 0%, #ff6fb6 50%, #8d71ff 100%)",
  boxShadow: "0 18px 40px rgba(196, 105, 168, 0.28)",
};

const banner: CSSProperties = {
  borderRadius: 18,
  padding: "0.9rem 1rem",
  border: "1px solid rgba(248, 113, 113, 0.28)",
  background: "rgba(255, 237, 237, 0.92)",
  color: "#9f2d2d",
  fontSize: "0.92rem",
  marginBottom: "1rem",
};

function backdropGlow(accent: string): CSSProperties {
  return {
    position: "fixed",
    inset: "auto auto -120px -120px",
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: accent,
    filter: "blur(120px)",
    opacity: 0.18,
    pointerEvents: "none",
  };
}

function hexToShadow(hex: string) {
  return `${hex}33`;
}
