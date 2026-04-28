import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CHARACTERS } from "./characters";

type CharactersResponse = {
  activeCharacterIds: string[];
};

export default function AdminApp() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem("adminToken") ?? "");
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadActiveCharacters();
  }, []);

  const hasToken = adminToken.trim().length > 0;
  const activeSet = useMemo(() => new Set(activeIds), [activeIds]);

  async function loadActiveCharacters() {
    const endpoint = hasToken ? "/api/admin/characters" : "/api/characters";
    const res = await fetch(endpoint, {
      headers: hasToken ? { "x-admin-token": adminToken.trim() } : undefined,
    });
    if (!res.ok) return;
    const data = (await res.json()) as CharactersResponse;
    setActiveIds(Array.isArray(data.activeCharacterIds) ? data.activeCharacterIds : []);
  }

  function toggleCharacter(id: string) {
    setActiveIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  }

  async function saveChanges() {
    if (!hasToken) {
      setStatusMsg("Enter admin token first.");
      return;
    }
    if (activeIds.length === 0) {
      setStatusMsg("At least one character must stay active.");
      return;
    }

    setBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/admin/characters", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken.trim(),
        },
        body: JSON.stringify({ activeCharacterIds: activeIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      }
      localStorage.setItem("adminToken", adminToken.trim());
      setStatusMsg("Saved. Website updates are live now.");
      await loadActiveCharacters();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={page}>
      <section style={panel}>
        <p style={eyebrow}>Admin Namespace</p>
        <h1 className="serif" style={title}>
          Character controls (`/admin`)
        </h1>
        <p style={muted}>
          Toggle who appears on the live voting form. Changes apply in real-time
          after save.
        </p>

        <label style={label}>
          Admin token
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="Enter ADMIN_TOKEN from server/.env"
            style={input}
          />
        </label>

        <div style={grid}>
          {CHARACTERS.map((character) => {
            const active = activeSet.has(character.id);
            return (
              <button
                key={character.id}
                type="button"
                onClick={() => toggleCharacter(character.id)}
                style={{
                  ...card,
                  borderColor: active ? character.accentHex : "rgba(47,31,60,0.15)",
                }}
              >
                <div style={{ ...chip, background: active ? character.accentHex : "#d8d2df" }}>
                  {active ? "Active" : "Hidden"}
                </div>
                <strong style={{ color: "#301e38" }}>{character.name}</strong>
                <span style={muted}>Alias: {character.alias}</span>
                <span style={muted}>{character.roleNote}</span>
              </button>
            );
          })}
        </div>

        {statusMsg && <div style={notice}>{statusMsg}</div>}

        <button type="button" onClick={saveChanges} disabled={busy} style={saveBtn}>
          {busy ? "Saving..." : "Save live changes"}
        </button>
      </section>
    </main>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "1rem",
  background: "linear-gradient(180deg, #fbf7ff 0%, #fffaf3 100%)",
};
const panel: CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
  borderRadius: 22,
  background: "#fff",
  border: "1px solid rgba(47,31,60,0.1)",
  boxShadow: "0 16px 42px rgba(77, 47, 102, 0.12)",
  padding: "1rem",
};
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#8b7899",
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: "0.72rem",
  fontWeight: 700,
};
const title: CSSProperties = {
  margin: "0.4rem 0 0.5rem",
  color: "#2f1f3c",
  fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
  fontWeight: 400,
};
const muted: CSSProperties = {
  color: "#7e6a8d",
  fontSize: "0.92rem",
  margin: 0,
};
const label: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.45rem",
  marginTop: "1rem",
  marginBottom: "1rem",
  color: "#4a3858",
  fontSize: "0.92rem",
};
const input: CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(47,31,60,0.14)",
  padding: "0.72rem 0.9rem",
  font: "inherit",
};
const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "0.75rem",
};
const card: CSSProperties = {
  textAlign: "left",
  borderRadius: 16,
  border: "2px solid rgba(47,31,60,0.15)",
  background: "#fff",
  padding: "0.75rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
};
const chip: CSSProperties = {
  alignSelf: "flex-start",
  borderRadius: 999,
  padding: "0.2rem 0.5rem",
  fontSize: "0.7rem",
  color: "#fff",
  fontWeight: 700,
};
const notice: CSSProperties = {
  marginTop: "0.9rem",
  borderRadius: 12,
  padding: "0.7rem 0.8rem",
  background: "#f6f0ff",
  color: "#53366c",
  fontSize: "0.9rem",
};
const saveBtn: CSSProperties = {
  marginTop: "0.9rem",
  border: "none",
  borderRadius: 999,
  padding: "0.75rem 1rem",
  color: "#fff",
  fontWeight: 700,
  background: "linear-gradient(135deg, #8f7cff 0%, #b267ff 100%)",
};
