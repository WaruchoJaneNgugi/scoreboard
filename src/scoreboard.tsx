import { useState, useEffect, useCallback, useRef } from "react";

// ─── window.storage type declaration ──────────────────────────────────────
declare global {
  interface Window {
    storage: {
      get: (key: string, shared?: boolean) => Promise<{ key: string; value: string; shared: boolean } | null>;
      set: (key: string, value: string, shared?: boolean) => Promise<{ key: string; value: string; shared: boolean } | null>;
      delete: (key: string, shared?: boolean) => Promise<{ key: string; deleted: boolean; shared: boolean } | null>;
      list: (prefix?: string, shared?: boolean) => Promise<{ keys: string[]; shared: boolean } | null>;
    };
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface Team {
  name: string;
  score: number;
}

interface ScoreboardState {
  teamA: Team;
  teamB: Team;
  period: string;
  clock: string;
  lastUpdated: number | null;
}

// ─── Storage helpers (shared across ALL devices) ───────────────────────────
const STORAGE_KEY = "scoreboard-state-v1";

const DEFAULT_STATE: ScoreboardState = {
  teamA: { name: "TEAM A", score: 0 },
  teamB: { name: "TEAM B", score: 0 },
  period: "1ST",
  clock: "00:00",
  lastUpdated: null,
};

async function loadState(): Promise<ScoreboardState | null> {
  try {
    const result = await window.storage.get(STORAGE_KEY, true);
    if (result) return JSON.parse(result.value) as ScoreboardState;
  } catch (_) {}
  return null;
}

async function saveState(state: ScoreboardState): Promise<void> {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(state), true);
  } catch (_) {}
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #080b10;
    --surface: #0e1219;
    --surface2: #151b24;
    --surface3: #1c2534;
    --border: rgba(255,255,255,0.06);
    --border2: rgba(255,255,255,0.12);
    --text: #f0f4ff;
    --text2: #8892a4;
    --text3: #505a6a;
    --cyan: #00d4ff;
    --cyan-dim: rgba(0,212,255,0.15);
    --amber: #ffb800;
    --amber-dim: rgba(255,184,0,0.15);
    --green: #00e5a0;
    --red: #ff4060;
    --red-dim: rgba(255,64,96,0.15);
  }

  body { background: var(--bg); font-family: 'DM Sans', sans-serif; color: var(--text); }

  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scorePop { 0%{transform:scale(1)} 40%{transform:scale(1.12)} 100%{transform:scale(1)} }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.9)} }

  .fade-up { animation: fadeUp 0.4s ease both; }
  .score-pop { animation: scorePop 0.35s cubic-bezier(0.34,1.56,0.64,1); }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
  input[type=number] { -moz-appearance:textfield; }

  .btn {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    border-radius: 10px;
  }
  .btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
  .btn:active { transform: scale(0.97); filter: brightness(0.95); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  input, select {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    transition: border-color 0.2s;
  }
  input:focus, select:focus { outline: none; }
`;

function GlobalStyles() {
  return <style>{styles}</style>;
}

// ─── Role Select ───────────────────────────────────────────────────────────
export function RoleSelect({ onSelect }: { onSelect: (role: string) => void }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 48,
      padding: 24,
      background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,212,255,0.08), transparent), var(--bg)",
      position: "relative",
      overflow: "hidden",
    }}>
      <GlobalStyles />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="fade-up" style={{ textAlign: "center", position: "relative" }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(56px, 14vw, 96px)",
          letterSpacing: "0.08em",
          color: "var(--text)",
          lineHeight: 1,
          textShadow: "0 0 60px rgba(0,212,255,0.2)",
        }}>
          SCOREBOARD
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.4em",
          color: "var(--cyan)",
          textTransform: "uppercase",
          marginTop: 10,
          opacity: 0.8,
        }}>
          LIVE · CROSS-DEVICE · REAL-TIME
        </div>
      </div>

      <div className="fade-up" style={{
        display: "flex", gap: 20, flexWrap: "wrap",
        justifyContent: "center", width: "100%", maxWidth: 560,
        animationDelay: "0.1s",
      }}>
        {[
          { role: "viewer", icon: "◉", label: "SPECTATOR", desc: "Watch scores live", accent: "var(--cyan)", dimAccent: "var(--cyan-dim)" },
          { role: "admin",  icon: "⚡", label: "OPERATOR",  desc: "Control the board", accent: "var(--amber)", dimAccent: "var(--amber-dim)" },
        ].map(({ role, icon, label, desc, accent, dimAccent }) => (
          <button
            key={role}
            onClick={() => onSelect(role)}
            style={{
              flex: "1 1 200px", minWidth: 200,
              padding: "32px 24px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              transition: "all 0.25s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.background = "var(--surface2)";
              e.currentTarget.style.boxShadow = `0 0 40px ${dimAccent}, 0 20px 40px rgba(0,0,0,0.4)`;
              e.currentTarget.style.transform = "translateY(-3px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--surface)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span style={{ fontSize: 36, color: accent, filter: `drop-shadow(0 0 12px ${accent})` }}>{icon}</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: "0.1em", color: accent }}>{label}</span>
            <span style={{ fontSize: 13, color: "var(--text2)", textAlign: "center", lineHeight: 1.5 }}>{desc}</span>
          </button>
        ))}
      </div>

      <div className="fade-up" style={{
        fontSize: 12, color: "var(--text3)", fontFamily: "'DM Mono', monospace",
        animationDelay: "0.2s",
      }}>
        Scores sync across all devices instantly
      </div>
    </div>
  );
}

// ─── Score Card ────────────────────────────────────────────────────────────
export function ScoreCard({ team, isHome }: { team: Team; isHome: boolean }) {
  const prevScore = useRef(team.score);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    if (team.score !== prevScore.current) {
      setPopping(true);
      prevScore.current = team.score;
      const t = setTimeout(() => setPopping(false), 400);
      return () => clearTimeout(t);
    }
  }, [team.score]);

  const accent = isHome ? "var(--cyan)" : "var(--amber)";
  const dimAccent = isHome ? "var(--cyan-dim)" : "var(--amber-dim)";

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: isHome ? "flex-start" : "flex-end",
      padding: "clamp(20px,4vw,44px) clamp(16px,3vw,40px)",
    }}>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11, letterSpacing: "0.25em",
        color: accent, marginBottom: 8, opacity: 0.8,
      }}>
        {isHome ? "HOME" : "AWAY"}
      </div>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "clamp(22px,4.5vw,38px)",
        letterSpacing: "0.06em",
        color: "var(--text)",
        marginBottom: 16,
        textAlign: isHome ? "left" : "right",
        maxWidth: "100%", wordBreak: "break-word",
      }}>
        {team.name}
      </div>
      <div
        className={popping ? "score-pop" : ""}
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(72px,16vw,148px)",
          letterSpacing: "-0.02em",
          color: accent,
          lineHeight: 1,
          textShadow: `0 0 60px ${dimAccent}`,
        }}
      >
        {String(team.score).padStart(2, "0")}
      </div>
    </div>
  );
}

// ─── Scoreboard Display ────────────────────────────────────────────────────
export function ScoreboardDisplay({ state }: { state: ScoreboardState }) {
  const [tick, setTick] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setTick(b => !b), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 24,
      overflow: "hidden",
    }}>
      <div style={{
        background: "var(--surface2)",
        borderBottom: "1px solid var(--border)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--red)",
            boxShadow: "0 0 12px var(--red)",
            animation: "pulse 1.5s infinite",
          }} />
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11, letterSpacing: "0.2em",
            color: "var(--red)", fontWeight: 500,
          }}>LIVE</span>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--surface3)",
          padding: "8px 18px",
          borderRadius: 100,
          border: "1px solid var(--border2)",
        }}>
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18, letterSpacing: "0.1em", color: "var(--text)",
          }}>{state.period}</span>
          <span style={{ color: "var(--text3)", fontSize: 14 }}>·</span>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 16, fontWeight: 500,
            color: tick ? "var(--cyan)" : "var(--text3)",
            transition: "color 0.1s",
          }}>{state.clock}</span>
        </div>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text3)", letterSpacing: "0.05em" }}>
          {state.lastUpdated
            ? new Date(state.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            : "—"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <ScoreCard team={state.teamA} isHome={true} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "0 16px", flexShrink: 0 }}>
          <div style={{ width: 1, height: 60, background: "linear-gradient(to bottom, transparent, var(--border2), transparent)" }} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: "0.1em", color: "var(--text3)" }}>VS</span>
          <div style={{ width: 1, height: 60, background: "linear-gradient(to bottom, transparent, var(--border2), transparent)" }} />
        </div>
        <ScoreCard team={state.teamB} isHome={false} />
      </div>
    </div>
  );
}

// ─── Viewer View ───────────────────────────────────────────────────────────
export function ViewerView({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<ScoreboardState>(DEFAULT_STATE);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");

  const poll = useCallback(async () => {
    const data = await loadState();
    if (data) {
      setState(data);
      setStatus("live");
    } else {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [poll]);

  const statusConfig: Record<"connecting" | "live" | "offline", { color: string; label: string }> = {
    connecting: { color: "var(--text3)", label: "CONNECTING" },
    live:       { color: "var(--green)", label: "LIVE" },
    offline:    { color: "var(--red)",   label: "OFFLINE" },
  };
  const { color: statusColor, label: statusLabel } = statusConfig[status];

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(0,212,255,0.04), transparent), var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <GlobalStyles />

      <div style={{
        width: "100%", maxWidth: 1200,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px", flexWrap: "wrap", gap: 12,
      }}>
        <button className="btn" onClick={onBack} style={{
          background: "var(--surface2)", color: "var(--text2)",
          padding: "10px 20px", fontSize: 13,
          border: "1px solid var(--border)",
        }}>← Back</button>

        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: "0.15em", color: "var(--text2)" }}>
          SPECTATOR MODE
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--surface2)",
          padding: "8px 16px", borderRadius: 100,
          border: "1px solid var(--border)",
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, letterSpacing: "0.15em",
          color: statusColor,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: statusColor,
            boxShadow: status === "live" ? `0 0 10px ${statusColor}` : "none",
            animation: status === "live" ? "pulse 2s infinite" : "none",
          }} />
          {statusLabel}
        </div>
      </div>

      <div className="fade-up" style={{ width: "100%", maxWidth: 1200, padding: "0 24px 40px" }}>
        <ScoreboardDisplay state={state} />
        <div style={{
          marginTop: 16, textAlign: "center",
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, color: "var(--text3)", letterSpacing: "0.1em",
        }}>
          AUTO-REFRESHES EVERY 2.5 SECONDS
        </div>
      </div>
    </div>
  );
}

// ─── Admin View ────────────────────────────────────────────────────────────
export function AdminView({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<ScoreboardState>(DEFAULT_STATE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadState().then(data => {
      if (data) setState(data);
    });
  }, []);

  const update = (updater: (prev: ScoreboardState) => ScoreboardState) => {
    setState(prev => updater(prev));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const next: ScoreboardState = { ...state, lastUpdated: Date.now() };
    await saveState(next);
    setState(next);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setState({ ...DEFAULT_STATE });
    setSaved(false);
  };

  const PERIODS = ["1ST", "2ND", "3RD", "4TH", "OT", "FT"];

  const ControlCard = ({ children, accent, title }: { children: React.ReactNode; accent: string; title: string }) => (
    <div
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, transition: "border-color 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = accent + "40")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}` }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", color: accent }}>{title}</span>
      </div>
      {children}
    </div>
  );

  const NameInput = ({ label, value, onChange, accent }: { label: string; value: string; onChange: (v: string) => void; accent: string }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "var(--text3)", marginBottom: 8, display: "block" }}>{label}</label>
      <input
        type="text"
        value={value}
        maxLength={20}
        onChange={e => onChange(e.target.value.toUpperCase())}
        placeholder="TEAM NAME"
        style={{
          width: "100%", height: 46, padding: "0 14px",
          fontSize: 15, fontWeight: 600,
          background: "var(--surface2)", border: "1px solid var(--border2)",
          borderRadius: 10,
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: "0.08em",
        }}
        onFocus={e => (e.target.style.borderColor = accent)}
        onBlur={e => (e.target.style.borderColor = "var(--border2)")}
      />
    </div>
  );

  const ScoreInput = ({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent: string }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "var(--text3)", marginBottom: 8, display: "block" }}>SCORE</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="btn" onClick={() => onChange(Math.max(0, value - 1))} style={{
          width: 46, height: 46, fontSize: 20, flexShrink: 0,
          background: "var(--surface2)", color: "var(--text2)",
          border: "1px solid var(--border2)",
        }}>−</button>
        <input
          type="number"
          value={value}
          min={0} max={999}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          style={{
            flex: 1, height: 46, textAlign: "center",
            fontSize: 22, fontWeight: 700,
            fontFamily: "'Bebas Neue', sans-serif",
            background: "var(--surface2)", border: "1px solid var(--border2)",
            borderRadius: 10,
          }}
        />
        <button className="btn" onClick={() => onChange(Math.min(999, value + 1))} style={{
          width: 46, height: 46, fontSize: 20, flexShrink: 0,
          background: "var(--surface2)", color: accent,
          border: "1px solid var(--border2)",
        }}>+</button>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(255,184,0,0.03), transparent), var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <GlobalStyles />

      <div style={{
        width: "100%", maxWidth: 1400,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px", flexWrap: "wrap", gap: 12,
      }}>
        <button className="btn" onClick={onBack} style={{
          background: "var(--surface2)", color: "var(--text2)",
          padding: "10px 20px", fontSize: 13,
          border: "1px solid var(--border)",
        }}>← Back</button>

        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: "0.15em", color: "var(--amber)" }}>
          OPERATOR CONTROL
        </div>

        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, letterSpacing: "0.1em",
          color: "var(--green)",
          background: "var(--surface2)",
          padding: "8px 14px", borderRadius: 100,
          border: "1px solid var(--border)",
        }}>
          ⬡ SHARED SYNC ACTIVE
        </div>
      </div>

      <div style={{
        width: "100%", maxWidth: 1400, padding: "0 24px 40px",
        display: "grid",
        gridTemplateColumns: "1fr min(380px, 100%)",
        gap: 24,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", color: "var(--text3)" }}>LIVE PREVIEW</div>
          <ScoreboardDisplay state={state} />
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11, color: "var(--text3)", letterSpacing: "0.08em",
            textAlign: "center", marginTop: 4,
          }}>
            Changes publish to all viewers when you click PUBLISH
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ControlCard accent="var(--cyan)" title="HOME TEAM">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <NameInput label="TEAM NAME" value={state.teamA.name} accent="var(--cyan)"
                onChange={(v: string) => update(s => ({ ...s, teamA: { ...s.teamA, name: v } }))} />
              <ScoreInput value={state.teamA.score} accent="var(--cyan)"
                onChange={(v: number) => update(s => ({ ...s, teamA: { ...s.teamA, score: v } }))} />
            </div>
          </ControlCard>

          <ControlCard accent="var(--amber)" title="AWAY TEAM">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <NameInput label="TEAM NAME" value={state.teamB.name} accent="var(--amber)"
                onChange={(v: string) => update(s => ({ ...s, teamB: { ...s.teamB, name: v } }))} />
              <ScoreInput value={state.teamB.score} accent="var(--amber)"
                onChange={(v: number) => update(s => ({ ...s, teamB: { ...s.teamB, score: v } }))} />
            </div>
          </ControlCard>

          <ControlCard accent="var(--text2)" title="MATCH INFO">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "var(--text3)", marginBottom: 10, display: "block" }}>PERIOD</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {PERIODS.map(p => (
                    <button key={p} className="btn" onClick={() => update((s: ScoreboardState) => ({ ...s, period: p }))} style={{
                      padding: "10px 6px", fontSize: 13,
                      fontFamily: "'Bebas Neue', sans-serif",
                      letterSpacing: "0.1em",
                      background: state.period === p ? "var(--cyan)" : "var(--surface2)",
                      color: state.period === p ? "var(--bg)" : "var(--text2)",
                      border: state.period === p ? "1px solid var(--cyan)" : "1px solid var(--border2)",
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "var(--text3)", marginBottom: 8, display: "block" }}>CLOCK</label>
                <input
                  type="text"
                  value={state.clock}
                  placeholder="00:00"
                  onChange={e => update((s: ScoreboardState) => ({ ...s, clock: e.target.value }))}
                  style={{
                    width: "100%", height: 46, padding: "0 14px",
                    fontSize: 18, fontWeight: 500,
                    fontFamily: "'DM Mono', monospace",
                    background: "var(--surface2)", border: "1px solid var(--border2)",
                    borderRadius: 10,
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--cyan)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border2)")}
                />
              </div>
            </div>
          </ControlCard>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn" onClick={handleSave} disabled={saving} style={{
              background: saved ? "var(--green)" : "var(--cyan)",
              color: "var(--bg)",
              padding: "15px 0", fontSize: 14,
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "0.15em",
              borderRadius: 14,
              boxShadow: saved ? "0 8px 24px rgba(0,229,160,0.3)" : "0 8px 24px rgba(0,212,255,0.25)",
              width: "100%",
            }}>
              {saving ? "PUBLISHING…" : saved ? "✓ PUBLISHED TO ALL DEVICES" : "PUBLISH SCORES"}
            </button>
            <button className="btn" onClick={handleReset} style={{
              background: "transparent",
              color: "var(--text3)",
              padding: "12px 0", fontSize: 13,
              border: "1px solid var(--border)",
              borderRadius: 14, width: "100%",
            }}>
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
