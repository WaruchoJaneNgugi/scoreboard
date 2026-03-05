import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
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

const DEFAULT_STATE: ScoreboardState = {
    teamA: { name: "TEAM A", score: 0 },
    teamB: { name: "TEAM B", score: 0 },
    period: "1ST",
    clock: "00:00",
    lastUpdated: null,
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = "scoreboard-state";

async function loadState(): Promise<ScoreboardState | null> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
}

async function saveState(state: ScoreboardState): Promise<void> {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        window.dispatchEvent(new StorageEvent("storage", {
            key: STORAGE_KEY,
            newValue: JSON.stringify(state),
        }));
    } catch (_) {}
}

// ─── Fonts & global styles injected once ─────────────────────────────────────
const GlobalStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body { 
      background: #0a0a0f;
      font-family: 'Inter', sans-serif;
    }

    :root {
      --primary: #6366f1;
      --primary-light: #818cf8;
      --primary-dark: #4f46e5;
      --secondary: #f43f5e;
      --secondary-light: #fb7185;
      --accent: #10b981;
      --accent-glow: #059669;
      --bg: #0a0a0f;
      --surface: #13131a;
      --surface-2: #1c1c26;
      --surface-3: #262630;
      --border: rgba(255,255,255,0.05);
      --border-light: rgba(255,255,255,0.1);
      --text: #ffffff;
      --text-2: #a1a1aa;
      --text-3: #71717a;
      --shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      --shadow-md: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
    }
    
    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
    
    @keyframes score-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); filter: brightness(1.3); }
      100% { transform: scale(1); }
    }
    
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes glow-pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.2); }
      50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.4); }
    }

    .score-pop { animation: score-pop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    .slide-up { animation: slide-up 0.4s ease-out both; }
    .fade-in { animation: fade-in 0.3s ease both; }

    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }

    .glass {
      background: rgba(28, 28, 38, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
    }
    
    .btn {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 0.875rem;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 12px;
      letter-spacing: 0.02em;
    }
    .btn:hover { 
      filter: brightness(1.1); 
      transform: translateY(-1px);
    }
    .btn:active { transform: scale(0.98); }

    .live-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--secondary);
      animation: pulse-subtle 1.5s infinite;
      box-shadow: 0 0 10px var(--secondary);
    }

    scrollbar-width: thin;
    scrollbar-color: var(--surface-3) var(--surface);
  `}</style>
);

// ─── Landing / Role Select ────────────────────────────────────────────────────
interface RoleSelectProps {
    onSelect: (role: string) => void;
}

export function RoleSelect({ onSelect }: RoleSelectProps) {
    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at 50% 50%, #1a1a24, #0a0a0f)",
            flexDirection: "column",
            gap: "clamp(32px, 6vw, 48px)",
            padding: "20px",
        }}>
            <GlobalStyles />

            <div style={{ textAlign: "center", animation: "slide-up 0.5s both" }}>
                <div style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "clamp(40px, 10vw, 72px)",
                    fontWeight: 800,
                    background: "linear-gradient(135deg, #fff 0%, #a1a1aa 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    lineHeight: 1.1,
                    marginBottom: 12,
                }}>
                    SCOREBOARD
                </div>
                <div style={{
                    fontSize: "clamp(12px, 3vw, 14px)",
                    letterSpacing: "0.3em",
                    color: "var(--text-2)",
                    textTransform: "uppercase",
                    fontWeight: 400,
                }}>
                    Real-time Score Tracking
                </div>
            </div>

            <div style={{
                display: "flex",
                gap: "clamp(16px, 4vw, 24px)",
                flexWrap: "wrap",
                justifyContent: "center",
                maxWidth: 600,
                width: "100%",
            }}>
                {[
                    { role: "viewer", label: "Spectator", icon: "👁️", desc: "Watch the game live", gradient: "linear-gradient(135deg, #3b82f6, #8b5cf6)" },
                    { role: "admin",  label: "Operator",  icon: "⚡", desc: "Control the scoreboard", gradient: "linear-gradient(135deg, #f43f5e, #ec4899)" },
                ].map(({ role, label, icon, desc, gradient }) => (
                    <button
                        key={role}
                        onClick={() => onSelect(role)}
                        style={{
                            flex: "1 1 200px",
                            minWidth: 180,
                            padding: "clamp(24px, 5vw, 32px) 20px",
                            background: "var(--surface)",
                            border: "1px solid var(--border-light)",
                            borderRadius: 24,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 16,
                            transition: "all 0.3s ease",
                            boxShadow: "var(--shadow-md)",
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                            e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                            e.currentTarget.style.background = "var(--surface-2)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.borderColor = "var(--border-light)";
                            e.currentTarget.style.boxShadow = "var(--shadow-md)";
                            e.currentTarget.style.background = "var(--surface)";
                        }}
                    >
            <span style={{
                fontSize: 40,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
            }}>
              {icon}
            </span>
                        <span style={{
                            fontSize: 24,
                            fontWeight: 700,
                            background: gradient,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            letterSpacing: "-0.02em",
                        }}>
              {label}
            </span>
                        <span style={{
                            fontSize: 14,
                            color: "var(--text-2)",
                            lineHeight: 1.5,
                            textAlign: "center",
                            fontWeight: 400,
                        }}>
              {desc}
            </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Shared Scoreboard Display ────────────────────────────────────────────────
interface ScoreCardProps {
    team: Team;
    color: string;
    side: 'left' | 'right';
}

export function ScoreCard({ team, color, side }: ScoreCardProps) {
    const prevScore = useRef(team.score);
    const [popping, setPopping] = useState(false);

    useEffect(() => {
        if (team.score !== prevScore.current) {
            setPopping(true);
            prevScore.current = team.score;
            const t = setTimeout(() => setPopping(false), 500);
            return () => clearTimeout(t);
        }
    }, [team.score]);

    const gradientColor = color === "var(--primary)"
        ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
        : "linear-gradient(135deg, #f43f5e, #ec4899)";

    return (
        <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: side === "left" ? "flex-start" : "flex-end",
            padding: "clamp(20px, 4vw, 40px) clamp(16px, 3vw, 32px)",
            width: "100%",
        }}>
            <div style={{
                fontSize: "clamp(11px, 2vw, 13px)",
                fontWeight: 600,
                letterSpacing: "0.15em",
                color: "var(--text-2)",
                textTransform: "uppercase",
                marginBottom: 8,
            }}>
                {side === "left" ? "HOME" : "AWAY"}
            </div>

            <div style={{
                fontSize: "clamp(24px, 5vw, 40px)",
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1.2,
                marginBottom: 16,
                textAlign: side === "left" ? "left" : "right",
                maxWidth: "100%",
                wordBreak: "break-word",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
                {team.name}
            </div>

            <div
                className={popping ? "score-pop" : ""}
                style={{
                    fontSize: "clamp(64px, 15vw, 140px)",
                    fontWeight: 800,
                    lineHeight: 1,
                    background: gradientColor,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.03em",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
            >
                {String(team.score).padStart(2, "0")}
            </div>
        </div>
    );
}

interface ScoreboardProps {
    state: ScoreboardState;
}

export function Scoreboard({ state }: ScoreboardProps) {
    const [blink, setBlink] = useState(true);
    useEffect(() => {
        const t = setInterval(() => setBlink(b => !b), 1000);
        return () => clearInterval(t);
    }, []);

    const lastUpdatedText = state.lastUpdated
        ? new Date(state.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : "—";

    return (
        <div style={{
            width: "100%",
            background: "var(--surface)",
            borderRadius: 32,
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxShadow: "var(--shadow-lg)",
        }}>
            {/* Top bar */}
            <div style={{
                background: "var(--surface-2)",
                borderBottom: "1px solid var(--border)",
                padding: "clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="live-dot" />
                    <span style={{
                        fontWeight: 600,
                        fontSize: "clamp(11px, 2vw, 13px)",
                        letterSpacing: "0.1em",
                        color: "var(--secondary)",
                        textTransform: "uppercase",
                    }}>LIVE</span>
                </div>

                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--surface-3)",
                    padding: "8px 16px",
                    borderRadius: 100,
                    border: "1px solid var(--border)",
                }}>
          <span style={{
              fontWeight: 700,
              fontSize: "clamp(14px, 3vw, 18px)",
              color: "var(--text)",
          }}>
            {state.period}
          </span>
                    <span style={{ color: "var(--text-2)" }}>•</span>
                    <span style={{
                        fontWeight: 600,
                        fontSize: "clamp(14px, 3vw, 18px)",
                        color: blink ? "var(--primary)" : "var(--text-2)",
                        transition: "color 0.1s ease",
                        fontFamily: "monospace",
                    }}>
            {state.clock}
          </span>
                </div>

                <div style={{
                    fontSize: "clamp(11px, 2vw, 12px)",
                    color: "var(--text-3)",
                    fontWeight: 500,
                }}>
                    Updated {lastUpdatedText}
                </div>
            </div>

            {/* Scores row */}
            <div style={{
                display: "flex",
                flexDirection: window.innerWidth < 640 ? "column" : "row",
                alignItems: "center",
                position: "relative",
            }}>
                <ScoreCard team={state.teamA} color="var(--primary)" side="left" />

                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    padding: window.innerWidth < 640 ? "8px 0" : "0 16px",
                }}>
                    <div style={{
                        width: window.innerWidth < 640 ? "120px" : "2px",
                        height: window.innerWidth < 640 ? "2px" : "80px",
                        background: "linear-gradient(90deg, transparent, var(--primary), var(--secondary), transparent)",
                    }} />
                    <span style={{
                        fontWeight: 700,
                        fontSize: 20,
                        color: "var(--text-2)",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>VS</span>
                    <div style={{
                        width: window.innerWidth < 640 ? "120px" : "2px",
                        height: window.innerWidth < 640 ? "2px" : "80px",
                        background: "linear-gradient(90deg, transparent, var(--secondary), var(--primary), transparent)",
                    }} />
                </div>

                <ScoreCard team={state.teamB} color="var(--secondary)" side="right" />
            </div>
        </div>
    );
}

// ─── Viewer View ─────────────────────────────────────────────────────
interface ViewerViewProps {
    onBack: () => void;
}

export function ViewerView({ onBack }: ViewerViewProps) {
    const [state, setState] = useState<ScoreboardState>(DEFAULT_STATE);
    const [connected, setConnected] = useState(false);

    const poll = useCallback(async () => {
        const data = await loadState();
        if (data) {
            setState(data);
            setConnected(true);
        }
    }, []);

    useEffect(() => {
        poll();
        const interval = setInterval(poll, 2000);

        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    setState(JSON.parse(e.newValue));
                    setConnected(true);
                } catch (_) {}
            }
        };
        window.addEventListener("storage", onStorage);

        return () => {
            clearInterval(interval);
            window.removeEventListener("storage", onStorage);
        };
    }, [poll]);

    return (
        <div style={{
            minHeight: "100vh",
            background: "radial-gradient(circle at 50% 0%, #1a1a24, #0a0a0f)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        }}>
            <GlobalStyles />

            {/* Header */}
            <div style={{
                width: "100%",
                maxWidth: 1200,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                position: "relative",
                zIndex: 1,
                flexWrap: "wrap",
                gap: 16,
            }}>
                <button
                    className="btn"
                    onClick={onBack}
                    style={{
                        background: "var(--surface-2)",
                        color: "var(--text-2)",
                        padding: "10px 20px",
                        fontSize: 14,
                        border: "1px solid var(--border)",
                    }}
                >
                    ← Back
                </button>

                <div style={{
                    fontWeight: 700,
                    fontSize: "clamp(18px, 4vw, 22px)",
                    background: "linear-gradient(135deg, #fff, #a1a1aa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.02em",
                }}>
                    SPECTATOR MODE
                </div>

                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    color: connected ? "var(--accent)" : "var(--text-3)",
                    background: "var(--surface-2)",
                    padding: "8px 16px",
                    borderRadius: 100,
                    border: "1px solid var(--border)",
                }}>
                    <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: connected ? "var(--accent)" : "var(--text-3)",
                        boxShadow: connected ? "0 0 12px var(--accent)" : "none",
                    }} />
                    {connected ? "LIVE" : "CONNECTING"}
                </div>
            </div>

            {/* Board */}
            <div style={{
                width: "100%",
                maxWidth: 1200,
                padding: "0 24px 40px",
                animation: "slide-up 0.5s ease-out",
            }}>
                <Scoreboard state={state} />

                <div style={{
                    marginTop: 24,
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--text-3)",
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                }}>
                    Auto-refreshes every 2 seconds
                </div>
            </div>
        </div>
    );
}

// ─── Admin View ──────────────────────────────────────────────────────
interface ScoreInputProps {
    label: string;
    value: number;
    color: string;
    onChange: (value: number) => void;
}

export function ScoreInput({ label, value, color, onChange }: ScoreInputProps) {
    return (
        <div style={{ width: "100%" }}>
            <label style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.05em",
                color: "var(--text-2)",
                marginBottom: 8,
                display: "block",
            }}>
                {label}
            </label>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
            }}>
                <button
                    className="btn"
                    onClick={() => onChange(Math.max(0, value - 1))}
                    style={{
                        width: 48,
                        height: 48,
                        fontSize: 20,
                        background: "var(--surface-2)",
                        color: "var(--text-2)",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >−</button>

                <input
                    type="number"
                    value={value}
                    min={0}
                    max={999}
                    onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{
                        flex: 1,
                        height: 48,
                        textAlign: "center",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--text)",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        outline: "none",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                />

                <button
                    className="btn"
                    onClick={() => onChange(Math.min(999, value + 1))}
                    style={{
                        width: 48,
                        height: 48,
                        fontSize: 20,
                        background: "var(--surface-2)",
                        color: color,
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >+</button>
            </div>
        </div>
    );
}

interface TeamNameInputProps {
    label: string;
    value: string;
    color: string;
    onChange: (value: string) => void;
}

export function TeamNameInput({ label, value, color, onChange }: TeamNameInputProps) {
    return (
        <div style={{ width: "100%" }}>
            <label style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.05em",
                color: "var(--text-2)",
                marginBottom: 8,
                display: "block",
            }}>
                {label}
            </label>
            <input
                type="text"
                value={value}
                maxLength={20}
                onChange={e => onChange(e.target.value.toUpperCase())}
                placeholder="TEAM NAME"
                style={{
                    width: "100%",
                    height: 48,
                    padding: "0 16px",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--text)",
                    background: "var(--surface-2)",
                    border: `1px solid var(--border)`,
                    borderRadius: 12,
                    outline: "none",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = color}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
        </div>
    );
}

interface AdminViewProps {
    onBack: () => void;
}

export function AdminView({ onBack }: AdminViewProps) {
    const [state, setState] = useState<ScoreboardState>(DEFAULT_STATE);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadState().then(data => {
            if (data) setState(data);
        });
    }, []);

    const updateState = useCallback((updater: (prev: ScoreboardState) => ScoreboardState) => {
        setState(prev => {
            const next = updater(prev);
            return next;
        });
        setSaved(false);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const newState = { ...state, lastUpdated: Date.now() };
        await saveState(newState);
        setState(newState);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleReset = () => {
        setState({ ...DEFAULT_STATE, lastUpdated: null });
        setSaved(false);
    };

    const PERIODS = ["1ST", "2ND", "3RD", "4TH", "OT", "FT"];

    return (
        <div style={{
            minHeight: "100vh",
            background: "radial-gradient(circle at 50% 0%, #1a1a24, #0a0a0f)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        }}>
            <GlobalStyles />

            {/* Header */}
            <div style={{
                width: "100%",
                maxWidth: 1400,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                flexWrap: "wrap",
                gap: 16,
            }}>
                <button
                    className="btn"
                    onClick={onBack}
                    style={{
                        background: "var(--surface-2)",
                        color: "var(--text-2)",
                        padding: "10px 20px",
                        fontSize: 14,
                        border: "1px solid var(--border)",
                    }}
                >
                    ← Back
                </button>

                <div style={{
                    fontWeight: 700,
                    fontSize: "clamp(18px, 4vw, 22px)",
                    background: "linear-gradient(135deg, #f43f5e, #ec4899)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.02em",
                }}>
                    OPERATOR CONTROL
                </div>

                <div style={{ width: 80 }} />
            </div>

            <div style={{
                width: "100%",
                maxWidth: 1400,
                padding: "0 24px 40px",
                display: "grid",
                gridTemplateColumns: window.innerWidth < 1024 ? "1fr" : "1fr 380px",
                gap: 24,
            }}>

                {/* Left: Preview */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16
                }}>
                    <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        color: "var(--text-2)",
                        textTransform: "uppercase",
                    }}>
                        Live Preview
                    </div>
                    <Scoreboard state={state} />
                </div>

                {/* Right: Controls */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                }}>
                    {/* Team A */}
                    <div style={{
                        background: "var(--surface)",
                        borderRadius: 24,
                        border: "1px solid var(--border)",
                        padding: 24,
                    }}>
                        <div style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--primary)",
                            marginBottom: 20,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />
                            HOME TEAM
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            <TeamNameInput
                                label="Team Name"
                                value={state.teamA.name}
                                color="var(--primary)"
                                onChange={(v: string) => updateState(s => ({ ...s, teamA: { ...s.teamA, name: v } }))}
                            />
                            <ScoreInput
                                label="Score"
                                value={state.teamA.score}
                                color="var(--primary)"
                                onChange={(v: number) => updateState(s => ({ ...s, teamA: { ...s.teamA, score: v } }))}
                            />
                        </div>
                    </div>

                    {/* Team B */}
                    <div style={{
                        background: "var(--surface)",
                        borderRadius: 24,
                        border: "1px solid var(--border)",
                        padding: 24,
                    }}>
                        <div style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--secondary)",
                            marginBottom: 20,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--secondary)" }} />
                            AWAY TEAM
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            <TeamNameInput
                                label="Team Name"
                                value={state.teamB.name}
                                color="var(--secondary)"
                                onChange={(v: string) => updateState(s => ({ ...s, teamB: { ...s.teamB, name: v } }))}
                            />
                            <ScoreInput
                                label="Score"
                                value={state.teamB.score}
                                color="var(--secondary)"
                                onChange={(v: number) => updateState(s => ({ ...s, teamB: { ...s.teamB, score: v } }))}
                            />
                        </div>
                    </div>

                    {/* Match Info */}
                    <div style={{
                        background: "var(--surface)",
                        borderRadius: 24,
                        border: "1px solid var(--border)",
                        padding: 24,
                    }}>
                        <div style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text)",
                            marginBottom: 20,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text)" }} />
                            MATCH INFO
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            {/* Period */}
                            <div>
                                <label style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    letterSpacing: "0.05em",
                                    color: "var(--text-2)",
                                    marginBottom: 12,
                                    display: "block",
                                }}>
                                    Period
                                </label>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: 8
                                }}>
                                    {PERIODS.map(p => (
                                        <button
                                            key={p}
                                            className="btn"
                                            onClick={() => updateState(s => ({ ...s, period: p }))}
                                            style={{
                                                padding: "12px 8px",
                                                fontSize: 14,
                                                fontWeight: 600,
                                                background: state.period === p ? "var(--primary)" : "var(--surface-2)",
                                                color: state.period === p ? "#fff" : "var(--text-2)",
                                                border: "1px solid var(--border)",
                                                borderRadius: 12,
                                            }}
                                        >{p}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Clock */}
                            <div>
                                <label style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    letterSpacing: "0.05em",
                                    color: "var(--text-2)",
                                    marginBottom: 8,
                                    display: "block",
                                }}>
                                    Clock
                                </label>
                                <input
                                    type="text"
                                    value={state.clock}
                                    placeholder="00:00"
                                    onChange={e => updateState(s => ({ ...s, clock: e.target.value }))}
                                    style={{
                                        width: "100%",
                                        height: 48,
                                        padding: "0 16px",
                                        fontSize: 18,
                                        fontWeight: 600,
                                        color: "var(--text)",
                                        background: "var(--surface-2)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 12,
                                        outline: "none",
                                        fontFamily: "monospace",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <button
                            className="btn"
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                background: saving ? "var(--surface-2)" : saved ? "var(--accent)" : "var(--primary)",
                                color: "#fff",
                                padding: "16px 0",
                                fontSize: 16,
                                fontWeight: 600,
                                width: "100%",
                                borderRadius: 16,
                                border: "none",
                                boxShadow: saved ? "0 8px 20px rgba(16, 185, 129, 0.3)" : "0 8px 20px rgba(99, 102, 241, 0.3)",
                            }}
                        >
                            {saving ? "PUBLISHING..." : saved ? "PUBLISHED!" : "PUBLISH SCORES"}
                        </button>

                        <button
                            className="btn"
                            onClick={handleReset}
                            style={{
                                background: "transparent",
                                color: "var(--text-2)",
                                padding: "12px 0",
                                fontSize: 14,
                                fontWeight: 500,
                                border: "1px solid var(--border)",
                                borderRadius: 16,
                                width: "100%",
                            }}
                        >
                            Reset All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}