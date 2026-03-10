import { useEffect, useState } from "react";
import { getJobs, createJob } from "../api/jobs";

function extractApiError(error, fallbackMessage) {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
    return String(data.non_field_errors[0]);
  }

  return fallbackMessage;
}

function getStatusBadgeClass(status) {
  if (status === "success") return "bg-green-100 text-green-800";
  if (status === "pending") return "bg-yellow-100 text-yellow-800";
  if (status === "needs_manual") return "bg-orange-100 text-orange-800";
  if (status === "failed") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

export default function Dashboard({ onLogout, onOpenJob }) {
  const [jobs, setJobs] = useState([]);
  const [url, setUrl] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showManualFields, setShowManualFields] = useState(false);

  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [createError, setCreateError] = useState("");

  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    setJobsError("");

    try {
      const res = await getJobs();
      setJobs(res.data);
    } catch (error) {
      setJobsError(extractApiError(error, "Failed to load jobs."));
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const hasUrl = url.trim() !== "";
  const hasManualFields =
    companyName.trim() !== "" &&
    jobTitle.trim() !== "" &&
    jobDescription.trim() !== "";

  const isCreateDisabled = isCreatingJob || (!hasUrl && !hasManualFields);

  const handleCreate = async () => {
    if (isCreateDisabled) return;

    setIsCreatingJob(true);
    setCreateError("");

    const payload = {};

    if (hasUrl) payload.job_url = url.trim();
    if (companyName.trim()) payload.company_name = companyName.trim();
    if (jobTitle.trim()) payload.job_title = jobTitle.trim();
    if (jobDescription.trim()) payload.job_description = jobDescription.trim();

    try {
      await createJob(payload);
      setUrl("");
      setCompanyName("");
      setJobTitle("");
      setJobDescription("");
      setShowManualFields(false);
      await fetchJobs();
    } catch (error) {
      const message = extractApiError(error, "Failed to create job.");
      setCreateError(message);

      const lower = message.toLowerCase();
      if (lower.includes("manual") || lower.includes("provide")) {
        setShowManualFields(true);
      }
    } finally {
      setIsCreatingJob(false);
    }
  };

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Job Dashboard</h1>
        {typeof onLogout === "function" ? (
          <button
            className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        ) : null}
      </div>

      <div className="space-y-3 mb-6">
        <input
          className="border p-2 w-full"
          placeholder="Paste job URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        {showManualFields ? (
          <div className="space-y-2 border p-3 bg-gray-50">
            <p className="text-sm font-medium">Manual details (required if extraction fails)</p>
            <input
              className="border p-2 w-full"
              placeholder="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <input
              className="border p-2 w-full"
              placeholder="Job title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
            <textarea
              className="border p-2 w-full min-h-28"
              placeholder="Job description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
        ) : null}

        {createError ? <p className="text-sm text-red-600">{createError}</p> : null}

        <button
          className={`px-4 py-2 text-white ${
            isCreateDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500"
          }`}
          onClick={handleCreate}
          disabled={isCreateDisabled}
          type="button"
        >
          {isCreatingJob ? "Creating..." : "Create Job"}
        </button>
      </div>

      {jobsError ? <p className="mb-3 text-sm text-red-600">{jobsError}</p> : null}

      {isLoadingJobs ? <p className="text-sm text-gray-600">Loading jobs...</p> : null}

      <div className="space-y-2">
        {jobs.map((job) => (
          <div key={job.id} className="border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{job.company_name || "No Company"}</p>
                <p>{job.job_title || "No Title"}</p>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded ${getStatusBadgeClass(
                  job.extraction_status
                )}`}
              >
                {job.extraction_status || "unknown"}
              </span>
            </div>
            {job.extraction_error ? (
              <p className="text-xs text-red-600 mt-2">{job.extraction_error}</p>
            ) : null}
            <button
              className="mt-3 px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300"
              onClick={() => {
                if (typeof onOpenJob === "function") onOpenJob(job.id);
              }}
              type="button"
            >
              View / Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
