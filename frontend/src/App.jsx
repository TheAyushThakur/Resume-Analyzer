import { useCallback, useEffect, useState } from "react";
import { getMe } from "./api/auth";
import { clearTokens, hasValidAccessToken } from "./auth/token";
import HomePage from "./pages/HomePage";
import JobLibraryPage from "./pages/JobLibraryPage";
import Login from "./pages/Login";
import ResumeLibraryPage from "./pages/ResumeLibraryPage";

const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "jobs", label: "Job Library" },
  { id: "resumes", label: "Resume Library" },
];

function AppHeader({ me, activePage, onNavigate, onLogout }) {
  return (
    <header className="top-nav-wrap">
      <div className="app-shell-wide py-4">
        <div className="top-nav glass-card">
          <div className="flex items-center gap-3">
            <div className="brand-chip">
              <span className="brand-dot" />
              JobTracker
            </div>
            {me ? <span className="text-xs text-slate-600 hidden sm:block">{me.full_name || me.username}</span> : null}
          </div>

          <nav className="hidden lg:flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`nav-link ${activePage === item.id ? "nav-link-active" : ""}`}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button className="btn-secondary" onClick={onLogout} type="button">
            Logout
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${activePage === item.id ? "nav-link-active" : ""}`}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function App() {
  const [isAuthed, setIsAuthed] = useState(() => {
    const valid = hasValidAccessToken();
    if (!valid) clearTokens();
    return valid;
  });
  const [activePage, setActivePage] = useState("home");
  const [selectedJobIdForAnalysis, setSelectedJobIdForAnalysis] = useState(null);
  const [selectedResumeIdForAnalysis, setSelectedResumeIdForAnalysis] = useState(null);
  const [me, setMe] = useState(null);
  const [isMeLoading, setIsMeLoading] = useState(false);

  const handleLoginSuccess = () => setIsAuthed(true);

  const handleLogout = () => {
    clearTokens();
    setIsAuthed(false);
    setMe(null);
    setActivePage("home");
    setSelectedJobIdForAnalysis(null);
    setSelectedResumeIdForAnalysis(null);
  };

  const refreshMe = useCallback(async () => {
    setIsMeLoading(true);
    try {
      const { data } = await getMe();
      setMe(data);
      return data;
    } catch {
      clearTokens();
      setIsAuthed(false);
      setMe(null);
      return null;
    } finally {
      setIsMeLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleForcedLogout = () => {
      setIsAuthed(false);
      setMe(null);
      setActivePage("home");
      setSelectedJobIdForAnalysis(null);
      setSelectedResumeIdForAnalysis(null);
    };

    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    refreshMe();
  }, [isAuthed, refreshMe]);

  if (!isAuthed) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div>
      <AppHeader
        me={me}
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
      />

      {isMeLoading ? (
        <div className="app-shell-wide">
          <div className="glass-card p-6 animate-fade-up">
            <p className="processing-text">Syncing account details...</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="processing-bar" />
            </div>
          </div>
        </div>
      ) : null}

      {activePage === "home" ? (
        <HomePage
          me={me}
          selectedJobIdForAnalysis={selectedJobIdForAnalysis}
          selectedResumeIdForAnalysis={selectedResumeIdForAnalysis}
          onNavigate={setActivePage}
        />
      ) : null}
      {activePage === "jobs" ? (
        <JobLibraryPage
          selectedJobIdForAnalysis={selectedJobIdForAnalysis}
          onSelectForAnalysis={setSelectedJobIdForAnalysis}
          onGoHome={() => setActivePage("home")}
        />
      ) : null}
      {activePage === "resumes" ? (
        <ResumeLibraryPage
          selectedResumeIdForAnalysis={selectedResumeIdForAnalysis}
          onSelectForAnalysis={setSelectedResumeIdForAnalysis}
          onGoHome={() => setActivePage("home")}
        />
      ) : null}
    </div>
  );
}

export default App;
