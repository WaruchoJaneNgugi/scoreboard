import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { RoleSelect, ViewerView, AdminView } from "./scoreboard";
import type { ScoreboardState } from "./scoreboard";

// Add this function to encode state in URL
const encodeState = (state: ScoreboardState) => {
    return btoa(JSON.stringify(state));
};

const decodeState = (str: string): ScoreboardState | null => {
    try {
        return JSON.parse(atob(str));
    } catch {
        return null;
    }
};

// Update your App component:
function App() {
    const [searchParams, _setSearchParams] = useSearchParams();
    const [role, setRole] = useState<string >("");
    const [sharedState, setSharedState] = useState<ScoreboardState | null>(null);

    // Check for shared state in URL
    useEffect(() => {
        const stateParam = searchParams.get('state');
        if (stateParam) {
            const decoded = decodeState(stateParam);
            if (decoded) {
                setSharedState(decoded);
            }
        }
    }, [searchParams]);

    // Generate shareable URL
    const getShareableUrl = (state: ScoreboardState) => {
        const encoded = encodeState(state);
        return `${window.location.origin}?state=${encoded}`;
    };

    if (!role) return <RoleSelect onSelect={setRole} />;
    if (role === "viewer") return <ViewerView onBack={() => setRole("")} sharedState={sharedState} />;
    if (role === "admin") return <AdminView onBack={() => setRole("")} onShare={getShareableUrl} />;
}

export default App;