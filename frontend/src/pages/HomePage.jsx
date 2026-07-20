import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createJob, getJobs } from "../api/jobs";
import { listResumes, uploadResume } from "../api/resumes";
import { getAIResult, startAIAnalysis } from "../api/ai";

function extractApiError(error, fallbackMessage) {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
  if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
    return String(data.non_field_errors[0]);
  }

  if (data && typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    const firstValue = data[firstKey];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }

  return fallbackMessage;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
}

function getJobBadgeClass(status) {
  if (status === "success") return "status-chip bg-emerald-100 text-emerald-800";
  if (status === "pending") return "status-chip bg-amber-100 text-amber-800";
  if (status === "failed") return "status-chip bg-rose-100 text-rose-800";
  if (status === "needs_manual") return "status-chip bg-orange-100 text-orange-800";
  return "status-chip bg-slate-100 text-slate-700";
}

function getAnalysisBadgeClass(status) {
  if (status === "completed") return "status-chip bg-emerald-100 text-emerald-800";
  if (status === "processing") return "status-chip bg-sky-100 text-sky-800";
  if (status === "failed") return "status-chip bg-rose-100 text-rose-800";
  return "status-chip bg-amber-100 text-amber-800";
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

export default function HomePage({
  me,
  selectedJobIdForAnalysis,
  selectedResumeIdForAnalysis,
  onNavigate,
}) {
  const pollTimerRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [createJobError, setCreateJobError] = useState("");
  const [createJobInfo, setCreateJobInfo] = useState("");

  const [resumes, setResumes] = useState([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeInfo, setResumeInfo] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const latestJob = useMemo(() => jobs[0] || null, [jobs]);
  const latestResume = useMemo(() => resumes[0] || null, [resumes]);
  const selectedJobForAnalysis = useMemo(
    () => jobs.find((item) => item.id === selectedJobIdForAnalysis) || null,
    [jobs, selectedJobIdForAnalysis]
  );
  const selectedResumeForAnalysis = useMemo(
    () => resumes.find((item) => item.id === selectedResumeIdForAnalysis) || null,
    [resumes, selectedResumeIdForAnalysis]
  );

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    setJobsError("");

    try {
      const res = await getJobs();
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload?.results ?? [];
      setJobs(list);
      setSelectedJobId(list[0]?.id || null);
    } catch (err) {
      setJobsError(extractApiError(err, "Failed to load jobs."));
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  const loadResumes = useCallback(async () => {
    setIsLoadingResumes(true);
    setResumeError("");

    try {
      const res = await listResumes();
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload?.results ?? [];
      setResumes(list);
    } catch (err) {
      setResumeError(extractApiError(err, "Failed to load resumes."));
    } finally {
      setIsLoadingResumes(false);
    }
  }, []);

  const loadAIResult = useCallback(
    async ({ quiet = false } = {}) => {
      const analysisJobId = selectedJobForAnalysis?.id;
      if (!analysisJobId) {
        setAnalysis(null);
        return;
      }

      if (!quiet) {
        setIsLoadingAnalysis(true);
        setAnalysisError("");
      }

      try {
        const res = await getAIResult(analysisJobId);
        const payload = res.data || {};
        setAnalysis(payload);

        if (payload.status === "completed" || payload.status === "failed") {
          stopPolling();
        }
      } catch (err) {
        if (!quiet) setAnalysisError(extractApiError(err, "Failed to load AI analysis."));
      } finally {
        if (!quiet) setIsLoadingAnalysis(false);
      }
    },
    [selectedJobForAnalysis, stopPolling]
  );

  useEffect(() => {
    fetchJobs();
    loadResumes();
    return () => stopPolling();
  }, [fetchJobs, loadResumes, stopPolling]);

  useEffect(() => {
    stopPolling();
    setAnalysis(null);
    setAnalysisError("");
  }, [selectedJobIdForAnalysis, selectedResumeIdForAnalysis, stopPolling]);

  const handleCreateJob = async () => {
    const trimmedUrl = jobUrl.trim();
    if (!trimmedUrl) {
      setCreateJobError("Paste a job URL first.");
      return;
    }

    setIsCreatingJob(true);
    setCreateJobError("");
    setCreateJobInfo("");

    try {
      const payload = {
        job_url: trimmedUrl,
        company_name: companyName.trim(),
        job_title: jobTitle.trim(),
        job_description: jobDescription.trim(),
      };

      const { data } = await createJob(payload);
      setCreateJobInfo("Job extracted and saved successfully.");
      setJobUrl("");
      setCompanyName("");
      setJobTitle("");
      setJobDescription("");
      await fetchJobs();
      if (data?.id) setSelectedJobId(data.id);
    } catch (err) {
      setCreateJobError(extractApiError(err, "Failed to extract the job from the URL."));
    } finally {
      setIsCreatingJob(false);
    }
  };

  const handleUploadResume = async () => {
    if (!resumeFile) {
      setResumeError("Choose a PDF resume first.");
      return;
    }

    setIsUploadingResume(true);
    setResumeError("");
    setResumeInfo("");

    try {
      await uploadResume({ file: resumeFile, jobApplicationId: selectedJobId || undefined });
      setResumeInfo("Resume uploaded successfully.");
      setResumeFile(null);
      await loadResumes();
    } catch (err) {
      setResumeError(extractApiError(err, "Failed to upload resume."));
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedJobForAnalysis || !selectedResumeForAnalysis) {
      setAnalysisError("Select a job from Job Library and a resume from Resume Library first.");
      return;
    }

    if (!selectedJobForAnalysis.job_description?.trim()) {
      setAnalysisError("The selected job does not have a description yet.");
      return;
    }

    if (!(selectedResumeForAnalysis.parsed_text || "").trim()) {
      setAnalysisError("The selected resume is still being parsed.");
      return;
    }

    setIsStartingAnalysis(true);
    setAnalysisError("");
    setAnalysis(null);

    try {
      const res = await startAIAnalysis({
        jobId: selectedJobForAnalysis.id,
        resumeId: selectedResumeForAnalysis.id,
      });

      setAnalysis(res.data);
    } catch (err) {
      setAnalysisError(extractApiError(err, "Failed to start AI analysis."));
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  const scoreBreakdown = analysis?.score_breakdown || {};
  const missingKeywords = normalizeArray(analysis?.missing_keywords);
  const strengths = normalizeArray(analysis?.strengths);
  const suggestions = normalizeArray(analysis?.suggestions);

  return (
    <div className="app-shell-wide pb-12">
      <section className="glass-card hero-panel mt-4 animate-fade-up overflow-hidden">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="hero-label">Focused ATS workflow</p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Extract jobs, upload resumes, and get grounded ATS analysis in one clean workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-200 sm:text-base">
              Home shows only the latest extracted job and latest uploaded resume. Step 3 uses the specific job and resume you
              choose from the libraries.
            </p>
            {me ? <p className="mt-4 text-xs uppercase tracking-wide text-slate-200/80">Signed in as {me.full_name || me.username}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="hero-stat">
              <p className="text-xs uppercase tracking-wide text-slate-200/80">Job Extraction</p>
              <p className="mt-2 text-2xl font-bold">Latest only</p>
            </div>
            <div className="hero-stat">
              <p className="text-xs uppercase tracking-wide text-slate-200/80">Resume Parsing</p>
              <p className="mt-2 text-2xl font-bold">Latest only</p>
            </div>
            <div className="hero-stat">
              <p className="text-xs uppercase tracking-wide text-slate-200/80">ATS Scoring</p>
              <p className="mt-2 text-2xl font-bold">Evidence based</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <section className="glass-card p-5 sm:p-6 xl:col-span-4 animate-fade-up">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
              <h2 className="section-title mt-1 text-2xl">Job Extraction</h2>
            </div>
            <span className="status-chip bg-cyan-100 text-cyan-800">URL</span>
          </div>
          <p className="muted-text mt-2">Paste a job link and let the backend extract the role details.</p>

          <div className="mt-5 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Job URL</label>
              <input className="input-control" placeholder="https://company.com/careers/role" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} />
            </div>

            <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Optional fallback details</summary>
              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Company Name</label>
                  <input className="input-control" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Job Title</label>
                  <input className="input-control" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Job Description</label>
                  <textarea className="input-control min-h-32" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
                </div>
              </div>
            </details>

            <button className="btn-primary w-full" type="button" onClick={handleCreateJob} disabled={isCreatingJob}>
              {isCreatingJob ? "Extracting..." : "Extract Job"}
            </button>
          </div>

          {createJobError ? <p className="error-banner mt-3">{createJobError}</p> : null}
          {createJobInfo ? <p className="success-banner mt-3">{createJobInfo}</p> : null}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Job</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Most recent extracted role</h3>
              </div>
              <span className={getJobBadgeClass(latestJob?.extraction_status)}>{latestJob?.extraction_status || "pending"}</span>
            </div>

            {isLoadingJobs ? <div className="skeleton mt-4 h-20 w-full" /> : null}
            {jobsError ? <p className="error-banner mt-4">{jobsError}</p> : null}

            {latestJob && !isLoadingJobs ? (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Company</p>
                  <p className="mt-1 font-semibold text-slate-900">{latestJob.company_name || "Unknown Company"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Title</p>
                  <p className="mt-1 font-semibold text-slate-900">{latestJob.job_title || "Untitled role"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">URL</p>
                  <p className="mt-1 break-all rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">{latestJob.job_url || "No URL stored"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-1 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">{latestJob.job_description || "No description available."}</p>
                </div>
              </div>
            ) : null}

            {!latestJob && !isLoadingJobs ? <p className="mt-4 text-sm text-slate-600">No jobs extracted yet.</p> : null}
          </div>
        </section>

        <section className="glass-card p-5 sm:p-6 xl:col-span-4 animate-fade-up animate-delay-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
              <h2 className="section-title mt-1 text-2xl">Resume Upload</h2>
            </div>
            <span className="status-chip bg-emerald-100 text-emerald-800">PDF</span>
          </div>
          <p className="muted-text mt-2">Upload a resume PDF. The app will parse the newest one before analysis starts.</p>

          <div className="mt-5 space-y-3">
            <input className="input-control" type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="btn-primary w-full" type="button" onClick={handleUploadResume} disabled={isUploadingResume}>
                {isUploadingResume ? "Uploading..." : "Upload Resume"}
              </button>
              <button className="btn-secondary w-full" type="button" onClick={loadResumes} disabled={isLoadingResumes}>
                {isLoadingResumes ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {resumeInfo ? <p className="success-banner mt-3">{resumeInfo}</p> : null}
          {resumeError ? <p className="error-banner mt-3">{resumeError}</p> : null}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Resume</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Most recent upload</h3>
              </div>
              <span className={`status-chip ${latestResume && (latestResume.parsed_text || "").trim() ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {latestResume && (latestResume.parsed_text || "").trim() ? "Parsed" : "Parsing"}
              </span>
            </div>

            {isLoadingResumes ? <div className="skeleton mt-4 h-20 w-full" /> : null}
            {resumeError ? <p className="error-banner mt-4">{resumeError}</p> : null}

            {latestResume && !isLoadingResumes ? (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">File</p>
                  <p className="mt-1 font-semibold text-slate-900">{getResumeFileName(latestResume.file)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Uploaded</p>
                  <p className="mt-1 text-slate-700">{formatDateTime(latestResume.created_at)}</p>
                </div>
              </div>
            ) : null}

            {!latestResume && !isLoadingResumes ? <p className="mt-4 text-sm text-slate-600">No resumes uploaded yet.</p> : null}
          </div>
        </section>

        <section className="glass-card p-5 sm:p-6 xl:col-span-4 animate-fade-up animate-delay-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</p>
              <h2 className="section-title mt-1 text-2xl">AI Analysis</h2>
            </div>
            <span className="status-chip bg-sky-100 text-sky-800">ATS</span>
          </div>
          <p className="muted-text mt-2">Scoring is based on the job and resume you explicitly select from the libraries.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn-primary"
              type="button"
              onClick={handleStartAnalysis}
              disabled={
                isStartingAnalysis ||
                !selectedJobForAnalysis ||
                !selectedJobForAnalysis.job_description?.trim() ||
                !selectedResumeForAnalysis ||
                !(selectedResumeForAnalysis.parsed_text || "").trim()
              }
            >
              {isStartingAnalysis ? "Starting Analysis..." : "Run AI Analysis"}
            </button>
            <button className="btn-secondary" type="button" onClick={() => loadAIResult()} disabled={isLoadingAnalysis}>
              {isLoadingAnalysis ? "Refreshing..." : "Refresh Result"}
            </button>
            <button className="btn-secondary" type="button" onClick={() => onNavigate?.("jobs")}>
              Pick Job
            </button>
            <button className="btn-secondary" type="button" onClick={() => onNavigate?.("resumes")}>
              Pick Resume
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Using</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                Job: <span className="font-semibold">{selectedJobForAnalysis ? `${selectedJobForAnalysis.company_name || "Unknown Company"} - ${selectedJobForAnalysis.job_title || "Untitled role"}` : "Choose a job from Job Library"}</span>
              </p>
              <p>
                Resume: <span className="font-semibold">{selectedResumeForAnalysis ? getResumeFileName(selectedResumeForAnalysis.file) : "Choose a resume from Resume Library"}</span>
              </p>
              <p>
                Resume status: <span className="font-semibold">{selectedResumeForAnalysis && (selectedResumeForAnalysis.parsed_text || "").trim() ? "Parsed and ready" : "Waiting for parsing"}</span>
              </p>
            </div>
          </div>

          {!selectedJobForAnalysis ? <p className="mt-3 text-xs text-amber-700">Choose a job from Job Library to run analysis.</p> : null}
          {selectedJobForAnalysis && !selectedJobForAnalysis.job_description?.trim() ? (
            <p className="mt-3 text-xs text-amber-700">The selected job still needs a description before analysis can run.</p>
          ) : null}
          {!selectedResumeForAnalysis ? <p className="mt-2 text-xs text-amber-700">Choose a resume from Resume Library to run analysis.</p> : null}
          {selectedResumeForAnalysis && !(selectedResumeForAnalysis.parsed_text || "").trim() ? (
            <p className="mt-2 text-xs text-amber-700">The selected resume is still parsing, so the analysis button will remain blocked.</p>
          ) : null}

          {analysisError ? <p className="error-banner mt-4">{analysisError}</p> : null}

          {analysis?.status === "processing" ? (
            <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="processing-text">Analysis is processing. Results refresh automatically every 4 seconds.</p>
            </div>
          ) : null}

          {analysis?.status === "failed" ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-medium text-rose-700">Analysis failed.</p>
              <p className="mt-1 text-sm text-rose-600">{analysis.error_message || "Something went wrong during analysis."}</p>
            </div>
          ) : null}
        </section>
      </div>

      <section className="glass-card mt-6 p-5 sm:p-6 animate-fade-up animate-delay-300">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 4</p>
            <h2 className="section-title mt-1 text-2xl">Analysis Result</h2>
            <p className="muted-text mt-2">Grounded suggestions, ATS score, and keyword gaps from the selected job and resume.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={getAnalysisBadgeClass(analysis?.status)}>{analysis?.status || "pending"}</span>
          </div>
        </div>

        {!selectedJobForAnalysis ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Select a job and resume from the libraries to see analysis results.
          </div>
        ) : null}

        {selectedJobForAnalysis && !analysis ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            No analysis yet. Choose a job and resume from the libraries, then run AI analysis.
          </div>
        ) : null}

        {isLoadingAnalysis ? (
          <div className="mt-5 space-y-3">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-40 w-full" />
          </div>
        ) : null}

        {analysis?.status === "completed" ? (
          <div className="mt-5 space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1">
                <p className="text-sm font-semibold text-slate-900">ATS Score</p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-5xl font-bold text-slate-900">{analysis.ats_score ?? 0}</p>
                    <p className="mt-2 text-xs text-slate-500">Computed from the final analysis payload</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                    <p className="font-semibold text-slate-900">{analysis.status || "pending"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
                <p className="text-sm font-semibold text-slate-900">Score Breakdown</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.keys(scoreBreakdown).length === 0 ? (
                    <p className="text-sm text-slate-500">No breakdown available.</p>
                  ) : (
                    Object.entries(scoreBreakdown).map(([key, value]) => (
                      <div className="rounded-xl bg-slate-50 px-3 py-3" key={key}>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{key.replaceAll("_", " ")}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Missing Keywords</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {missingKeywords.length === 0 ? (
                    <p className="text-sm text-slate-500">No missing keywords detected.</p>
                  ) : (
                    missingKeywords.map((item) => <span className="status-chip bg-amber-100 text-amber-800" key={item}>{item}</span>)
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Strengths</p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                  {strengths.length === 0 ? <li className="list-none text-slate-500">No strengths returned.</li> : null}
                  {strengths.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Suggestions</p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                  {suggestions.length === 0 ? <li className="list-none text-slate-500">No suggestions returned.</li> : null}
                  {suggestions.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              The ATS score and suggestions are generated only after the selected resume is parsed and matched against the selected job description.
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
