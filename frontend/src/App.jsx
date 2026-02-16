import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import { getAccessToken, clearTokens } from "./auth/token";

function App() {
  const [isAuthed, setIsAuthed] = useState(Boolean(getAccessToken()));

  const handleLoginSuccess = () => setIsAuthed(true);

  const handleLogout = () => {
    clearTokens();
    setIsAuthed(false);
  };

  return isAuthed ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <Login onLoginSuccess={handleLoginSuccess} />
  );
}

export default App;
