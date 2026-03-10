import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import JobDetailPage from "./pages/JobDetailPage";
import Login from "./pages/Login";
import { getAccessToken, clearTokens } from "./auth/token";

function App() {
  const [isAuthed, setIsAuthed] = useState(Boolean(getAccessToken()));
  const [selectedJobId, setSelectedJobId] = useState(null);

  const handleLoginSuccess = () => setIsAuthed(true);

  const handleLogout = () => {
    clearTokens();
    setIsAuthed(false);
    setSelectedJobId(null);
  };

  if (!isAuthed) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (selectedJobId) {
    return (
      <JobDetailPage
        jobId={selectedJobId}
        onBack={() => setSelectedJobId(null)}
        onLogout={handleLogout}
      />
    );
  }

  return <Dashboard onLogout={handleLogout} onOpenJob={setSelectedJobId} />;
}

export default App;
