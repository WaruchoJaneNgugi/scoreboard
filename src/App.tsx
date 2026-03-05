
import './App.css'
import {useState} from "react";
import {AdminView, RoleSelect, ViewerView} from "./scoreboard.tsx";

function App() {

    const [role, setRole] = useState<string>("");

    if (!role) return <RoleSelect onSelect={setRole} />;
    if (role === "viewer") return <ViewerView onBack={() => setRole("")} />;
    if (role === "admin")  return <AdminView  onBack={() => setRole("")} />;
}

export default App
