import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { motion } from "framer-motion";
import { CHARACTERS } from "./characters";
import { decodeJwtPayload } from "./utils/decodeJwtPayload";

export default function VoteApp() {
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [activeCharacterIds, setActiveCharacterIds] = useState<string[]>(
    CHARACTERS.map((item) => item.id)
  );
  const [idToken, setIdToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const clientConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const profile = useMemo(
    () => (idToken ? decodeJwtPayload(idToken) : {}),
    [idToken]
  );
  const availableCharacters = useMemo(
    () => CHARACTERS.filter((item) => activeCharacterIds.includes(item.id)),
    [activeCharacterIds]
  );
  const selectedCharacter = availableCharacters.find(
    (item) => item.id === selectedCharacterId
  );
  const canSubmit = Boolean(idToken) && Boolean(selectedCharacterId);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    const sync = async () => {
      try {
        const res = await fetch("/api/characters");
        if (!res.ok) return;
        const data = (await res.json()) as { activeCharacterIds?: string[] };
        const ids = Array.isArray(data.activeCharacterIds) ? data.activeCharacterIds : [];
        if (ids.length > 0) {
          setActiveCharacterIds(ids);
          if (!ids.includes(selectedCharacterId)) {
            setSelectedCharacterId("");
          }
        }
      } catch {
        // Keep previous state when polling fails.
      }
    };
    void sync();
    const intervalId = window.setInterval(() => {
      void sync();
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [selectedCharacterId]);

  const submit = async () => {
    if (!canSubmit || !idToken) return;
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          answers: {
            selectedCharacterId,
            selectedCharacterAlias: selectedCharacter?.alias ?? "",
            selectedContestantName: selectedCharacter?.name ?? "",
            submittedFrom: "dating-show-elimination-form",
          },
        }),
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
        <section style={{ ...panel, maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <p style={eyebrow}>Vote Received</p>
          <h1 className="serif" style={heroTitle}>
            {selectedCharacter?.name ?? "Your pick"} is locked in.
          </h1>
          <p style={mutedText}>
            Your elimination vote was saved and linked to your Google account.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={backdropGlow(selectedCharacter?.accentHex ?? "#ff7ab6")} />
      <section style={{ maxWidth: 1180, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={header}
        >
          <div style={logo}>POPMART</div>
          <div>
            <p style={headerTag}>Dating Show Elimination Form</p>
            <h2 className="serif" style={headerTitle}>
              Vote who goes home tonight
            </h2>
          </div>
        </motion.header>

        {!clientConfigured && (
          <div style={warning}>
            Add <code>VITE_GOOGLE_CLIENT_ID</code> in `client/.env`, and set the
            same value as <code>GOOGLE_CLIENT_ID</code> on server.
          </div>
        )}

        <div style={layout}>
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            style={panel}
          >
            <p style={eyebrow}>Simple Voting Form</p>
            <h1 className="serif" style={heroTitle}>
              Choose one character alias and submit.
            </h1>
            <p style={mutedText}>
              Hover each card to preview its video. Replace each `videoSrc` with
              your real MP4 later.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            style={panel}
          >
            <div style={grid}>
              {availableCharacters.map((character) => {
                const active = selectedCharacterId === character.id;
                return (
                  <motion.button
                    key={character.id}
                    type="button"
                    onClick={() => setSelectedCharacterId(character.id)}
                    whileInView={{ opacity: [0, 1], y: [18, 0] }}
                    viewport={{ once: true, amount: 0.2 }}
                    whileHover={{ y: -4 }}
                    onMouseEnter={async () => {
                      const v = videoRefs.current[character.id];
                      if (v) {
                        try {
                          v.currentTime = 0;
                          await v.play();
                        } catch {}
                      }
                    }}
                    onMouseLeave={() => {
                      const v = videoRefs.current[character.id];
                      if (v) {
                        v.pause();
                        v.currentTime = 0;
                      }
                    }}
                    style={{
                      ...card,
                      borderColor: active ? character.accentHex : "rgba(33,18,44,0.08)",
                    }}
                  >
                    <div style={{ ...media, background: character.gradient }}>
                      <video
                        ref={(node) => {
                          videoRefs.current[character.id] = node;
                        }}
                        src={character.videoSrc}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        style={video}
                      />
                    </div>
                    <div style={meta}>
                      <strong>{character.name}</strong>
                      <span style={mutedText}>Alias: {character.alias}</span>
                      <span style={mutedText}>{character.roleNote}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div style={auth}>
              {clientConfigured ? (
                <GoogleLogin
                  onSuccess={(c: CredentialResponse) => {
                    if (c.credential) setIdToken(c.credential);
                  }}
                  onError={() => setErrorMsg("Google sign-in failed")}
                  theme="outline"
                  shape="pill"
                  size="large"
                />
              ) : (
                <span style={mutedText}>Configure Google Client ID to continue.</span>
              )}
            </div>

            {profile.email && <p style={mutedText}>Signed in as {profile.email}</p>}
            {availableCharacters.length === 0 && (
              <div style={warning}>No active characters right now. Check back soon.</div>
            )}
            {status === "error" && errorMsg && <div style={warning}>{errorMsg}</div>}

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || status === "sending"}
              style={{ ...submitBtn, opacity: canSubmit ? 1 : 0.55 }}
            >
              {status === "sending" ? "Submitting..." : "Submit elimination vote"}
            </button>
          </motion.section>
        </div>
      </section>
    </main>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "1rem",
  background:
    "radial-gradient(circle at top left, rgba(255, 182, 214, 0.55), transparent 32%), radial-gradient(circle at top right, rgba(150, 214, 255, 0.45), transparent 28%), linear-gradient(180deg, #fff8f2 0%, #fffef9 100%)",
};
const panel: CSSProperties = {
  background: "rgba(255,255,255,0.84)",
  border: "1px solid rgba(255,255,255,0.9)",
  borderRadius: 24,
  padding: "1rem",
  boxShadow: "0 24px 60px rgba(93,53,120,0.14)",
};
const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.8rem",
  ...panel,
  marginBottom: "1rem",
};
const logo: CSSProperties = {
  borderRadius: 999,
  background: "linear-gradient(135deg, #ffd66d 0%, #ffb347 100%)",
  color: "#6d4212",
  padding: "0.45rem 0.85rem",
  fontWeight: 900,
  fontSize: "0.82rem",
};
const headerTag: CSSProperties = {
  margin: 0,
  color: "#9b7d8f",
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 700,
};
const headerTitle: CSSProperties = {
  margin: "0.2rem 0 0",
  fontSize: "1.2rem",
  color: "#301e38",
  fontWeight: 400,
};
const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "1rem",
};
const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "0.85rem",
  marginBottom: "1rem",
};
const card: CSSProperties = {
  border: "2px solid rgba(33,18,44,0.08)",
  borderRadius: 20,
  background: "#fff",
  padding: "0.7rem",
  textAlign: "left",
};
const media: CSSProperties = {
  height: 160,
  borderRadius: 14,
  overflow: "hidden",
  marginBottom: "0.6rem",
};
const video: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};
const meta: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3rem",
  color: "#301e38",
};
const auth: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "0.75rem",
};
const submitBtn: CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 999,
  padding: "0.9rem 1rem",
  color: "#fff",
  fontWeight: 700,
  background: "linear-gradient(135deg, #ff8fbe 0%, #ff6fb6 50%, #8d71ff 100%)",
};
const warning: CSSProperties = {
  ...panel,
  color: "#9f2d2d",
  marginBottom: "1rem",
  border: "1px solid rgba(248, 113, 113, 0.28)",
  background: "rgba(255, 237, 237, 0.92)",
};
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#a86c8c",
  textTransform: "uppercase",
  fontWeight: 700,
  letterSpacing: "0.16em",
  fontSize: "0.72rem",
};
const heroTitle: CSSProperties = {
  margin: "0.4rem 0 0.6rem",
  color: "#301e38",
  fontWeight: 400,
  fontSize: "clamp(2rem, 4.6vw, 3.2rem)",
  lineHeight: 1.02,
};
const mutedText: CSSProperties = {
  color: "#7d6b86",
  margin: 0,
  fontSize: "0.92rem",
};

function backdropGlow(accent: string): CSSProperties {
  return {
    position: "fixed",
    inset: "auto auto -120px -120px",
    width: 340,
    height: 340,
    borderRadius: "50%",
    background: accent,
    filter: "blur(120px)",
    opacity: 0.18,
    pointerEvents: "none",
  };
}
