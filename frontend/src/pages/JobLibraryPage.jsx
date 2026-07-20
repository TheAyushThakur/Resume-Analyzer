import { useCallback, useEffect, useState } from "react";
import { deleteJob, getJobs } from "../api/jobs";

function extractApiError(error, fallbackMessage) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
  return fallbackMessage;
}

function getJobBadgeClass(status) {
  if (status === "success") return "status-chip bg-emerald-100 text-emerald-800";
  if (status === "pending") return "status-chip bg-amber-100 text-amber-800";
  if (status === "failed") return "status-chip bg-rose-100 text-rose-800";
  if (status === "needs_manual") return "status-chip bg-orange-100 text-orange-800";
  return "status-chip bg-slate-100 text-slate-700";
}

function formatDateTime(value) {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not yet";
  return parsed.toLocaleString();
}

export default function JobLibraryPage({ selectedJobIdForAnalysis, onSelectForAnalysis, onGoHome }) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await getJobs();
      const payload = res.data;
      setJobs(Array.isArray(payload) ? payload : payload?.results ?? []);
    } catch (err) {
      setError(extractApiError(err, "Failed to load jobs."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this job description? This cannot be undone.");
    if (!ok) return;

    setDeletingId(id);
    setError("");

    try {
      await deleteJob(id);
      if (selectedJobIdForAnalysis === id) onSelectForAnalysis?.(null);
      await fetchJobs();
    } catch (err) {
      setError(extractApiError(err, "Failed to delete the job."));
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
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">All Job Descriptions</h1>
        <p className="mt-4 max-w-2xl text-sm text-slate-200">
          Manage every extracted job in one place. Pick one for analysis or delete anything you no longer need.
        </p>
      </section>

      <section className="glass-card mt-6 p-5 sm:p-6 animate-fade-up animate-delay-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stored jobs</p>
            <h2 className="section-title mt-1 text-2xl">Job Library</h2>
          </div>
          <button className="btn-secondary" type="button" onClick={fetchJobs} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error ? <p className="error-banner mt-4">{error}</p> : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {isLoading ? (
            <>
              <div className="skeleton h-44 w-full" />
              <div className="skeleton h-44 w-full" />
            </>
          ) : null}

          {!isLoading && jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600 lg:col-span-2">
              No jobs have been extracted yet.
            </div>
          ) : null}

          {jobs.map((job) => {
            const isSelected = selectedJobIdForAnalysis === job.id;
            return (
              <article className={`rounded-2xl border bg-white p-5 shadow-sm ${isSelected ? "border-cyan-400 ring-2 ring-cyan-100" : "border-slate-200"}`} key={job.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{job.company_name || "Unknown Company"}</p>
                    <p className="mt-1 text-sm text-slate-600">{job.job_title || "Untitled role"}</p>
                  </div>
                  <span className={getJobBadgeClass(job.extraction_status)}>{job.extraction_status || "pending"}</span>
                </div>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p className="break-all rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">{job.job_url || "No URL stored"}</p>
                  <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">{job.job_description || "No description available."}</p>
                  <p className="text-xs text-slate-500">Created {formatDateTime(job.created_at)}</p>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100"
                    type="button"
                    onClick={() => handleUse(job.id)}
                  >
                    {isSelected ? "Selected for analysis" : "Use for analysis"}
                  </button>
                  <button
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                    type="button"
                    onClick={() => handleDelete(job.id)}
                    disabled={deletingId === job.id}
                  >
                    {deletingId === job.id ? "Deleting..." : "Delete"}
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
