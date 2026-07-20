import { useCallback, useEffect, useState } from "react";
import { deleteResume, listResumes } from "../api/resumes";

function extractApiError(error, fallbackMessage) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
  return fallbackMessage;
}

function getResumeFileName(filePath) {
  if (!filePath) return "Resume";
  const parts = filePath.split("/");
  return decodeURIComponent(parts[parts.length - 1] || "Resume");
}

function formatDateTime(value) {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not yet";
  return parsed.toLocaleString();
}

export default function ResumeLibraryPage({ selectedResumeIdForAnalysis, onSelectForAnalysis, onGoHome }) {
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchResumes = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await listResumes();
      const payload = res.data;
      setResumes(Array.isArray(payload) ? payload : payload?.results ?? []);
    } catch (err) {
      setError(extractApiError(err, "Failed to load resumes."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this resume? This cannot be undone.");
    if (!ok) return;

    setDeletingId(id);
    setError("");

    try {
      await deleteResume(id);
      if (selectedResumeIdForAnalysis === id) onSelectForAnalysis?.(null);
      await fetchResumes();
    } catch (err) {
      setError(extractApiError(err, "Failed to delete the resume."));
    } finally {
      setDeletingId(null);
    }
  };

  const handleUse = (id) => {
    onSelectForAnalysis?.(id);
    onGoHome?.();
  };

  return (
    <div className="app-shell-wide pb-12">
      <section className="glass-card hero-panel mt-4 animate-fade-up">
        <p className="hero-label">Library</p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">All Uploaded Resumes</h1>
        <p className="mt-4 max-w-2xl text-sm text-slate-200">
          Manage every uploaded resume in one place. Pick one for analysis or delete anything you do not want to keep.
        </p>
      </section>

      <section className="glass-card mt-6 p-5 sm:p-6 animate-fade-up animate-delay-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stored resumes</p>
            <h2 className="section-title mt-1 text-2xl">Resume Library</h2>
          </div>
          <button className="btn-secondary" type="button" onClick={fetchResumes} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error ? <p className="error-banner mt-4">{error}</p> : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {isLoading ? (
            <>
              <div className="skeleton h-40 w-full" />
              <div className="skeleton h-40 w-full" />
            </>
          ) : null}

          {!isLoading && resumes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600 lg:col-span-2">
              No resumes have been uploaded yet.
            </div>
          ) : null}

          {resumes.map((resume) => {
            const parsed = (resume.parsed_text || "").trim().length > 0;
            const isSelected = selectedResumeIdForAnalysis === resume.id;

            return (
              <article className={`rounded-2xl border bg-white p-5 shadow-sm ${isSelected ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"}`} key={resume.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{getResumeFileName(resume.file)}</p>
                    <p className="mt-1 text-sm text-slate-600">Uploaded {formatDateTime(resume.created_at)}</p>
                  </div>
                  <span className={`status-chip ${parsed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {parsed ? "Parsed" : "Parsing"}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  {parsed ? "Resume text has been extracted and is ready for analysis." : "Resume is still being processed."}
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                    type="button"
                    onClick={() => handleUse(resume.id)}
                  >
                    {isSelected ? "Selected for analysis" : "Use for analysis"}
                  </button>
                  <button
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                    type="button"
                    onClick={() => handleDelete(resume.id)}
                    disabled={deletingId === resume.id}
                  >
                    {deletingId === resume.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
