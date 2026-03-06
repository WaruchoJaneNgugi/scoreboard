import { useState } from "react";
import { RoleSelect, ViewerView, AdminView, TimerOnlyView } from "./Scoreboard.tsx";

function App() {
    const [role, setRole] = useState("");

    if (!role) return <RoleSelect onSelect={setRole} />;
    if (role === "viewer") return <ViewerView onBack={() => setRole("")} />;
    if (role === "timer-only") return <TimerOnlyView onBack={() => setRole("")} />;
    if (role === "admin") return <AdminView onBack={() => setRole("")} />;
}

export default App;