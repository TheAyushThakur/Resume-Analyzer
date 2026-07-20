import { useState } from "react";
import { login, signup } from "../api/auth";
import { setTokens } from "../auth/token";

function extractApiError(err, fallback) {
  const data = err?.response?.data;
  if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
  if (typeof data === "string" && data.trim()) return data;

  if (data && typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    const firstValue = data[firstKey];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }

  return fallback;
}

export default function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignIn = mode === "signin";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      if (isSignIn) {
        const { data } = await login({ username, password });
        setTokens({ access: data.access, refresh: data.refresh });
        onLoginSuccess();
      } else {
        await signup({ username, email, fullName, password });
        setSuccess("Account created successfully. Please sign in.");
        setMode("signin");
      }
    } catch (err) {
      setError(extractApiError(err, isSignIn ? "Login failed" : "Signup failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell min-h-screen flex items-center">
      <div className="grid w-full gap-6 lg:grid-cols-5">
        <section className="glass-card animate-fade-up overflow-hidden lg:col-span-3">
          <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-teal-700 p-8 text-white sm:p-10">
            <p className="inline-flex rounded-full border border-white/30 px-3 py-1 text-xs tracking-wide text-white/90">
              JobTracker 
            </p>
            <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
              Build your interview pipeline with confidence.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-slate-200 sm:text-base">
              Centralize job applications, automate extraction, and get ATS insights from resumes in one production-ready workspace.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="animate-fade-up rounded-xl border border-white/20 bg-white/10 px-4 py-3 animate-delay-100">
                <p className="text-2xl font-bold">Smart</p>
                <p className="text-xs text-slate-200">Job extraction workflow</p>
              </div>
              <div className="animate-fade-up rounded-xl border border-white/20 bg-white/10 px-4 py-3 animate-delay-200">
                <p className="text-2xl font-bold">Fast</p>
                <p className="text-xs text-slate-200">AI ATS scoring engine</p>
              </div>
              <div className="animate-fade-up rounded-xl border border-white/20 bg-white/10 px-4 py-3 animate-delay-300">
                <p className="text-2xl font-bold">Secure</p>
                <p className="text-xs text-slate-200">JWT auth and isolated data</p>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card animate-fade-up lg:col-span-2 animate-delay-100">
          <div className="p-6 sm:p-8">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${isSignIn ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}
                onClick={() => setMode("signin")}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${!isSignIn ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}
                onClick={() => setMode("signup")}
                type="button"
              >
                Create Account
              </button>
            </div>

            <h2 className="section-title mt-5 text-3xl">{isSignIn ? "Welcome Back" : "Create Your Workspace"}</h2>
            <p className="muted-text mt-2">
              {isSignIn
                ? "Sign in to continue managing your job applications."
                : "Set up your account and start tracking applications today."}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {!isSignIn ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <input
                    className="input-control"
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required={!isSignIn}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Username</label>
                <input
                  className="input-control"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              {!isSignIn ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    className="input-control"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    type="email"
                    required={!isSignIn}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  className="input-control"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignIn ? "current-password" : "new-password"}
                  required
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {success}
                </p>
              ) : null}

              <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isSignIn
                    ? "Signing in..."
                    : "Creating account..."
                  : isSignIn
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
