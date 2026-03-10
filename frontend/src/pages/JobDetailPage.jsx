import { useCallback, useEffect, useState } from "react";
import { getJobDetail, updateJob } from "../api/jobs";

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

export default function JobDetailPage({ jobId, onBack, onLogout }) {
  const [job, setJob] = useState(null);
  const [form, setForm] = useState({
    company_name: "",
    job_title: "",
    job_description: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadJob = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await getJobDetail(jobId);
      const detail = res.data;
      setJob(detail);
      setForm({
        company_name: detail.company_name || "",
        job_title: detail.job_title || "",
        job_description: detail.job_description || "",
      });
    } catch (err) {
      setError(extractApiError(err, "Failed to load job details."));
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    try {
      await updateJob(jobId, {
        company_name: form.company_name.trim(),
        job_title: form.job_title.trim(),
        job_description: form.job_description.trim(),
      });
      await loadJob();
    } catch (err) {
      setError(extractApiError(err, "Failed to update job."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Job Details</h1>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300"
            onClick={onBack}
            type="button"
          >
            Back
          </button>
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
      </div>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {isLoading ? <p className="text-sm text-gray-600">Loading details...</p> : null}

      {job ? (
        <div className="space-y-3 border p-4 bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status:</span>
            <span className={`px-2 py-1 text-xs rounded ${getStatusBadgeClass(job.extraction_status)}`}>
              {job.extraction_status || "unknown"}
            </span>
          </div>

          {job.extraction_error ? (
            <p className="text-sm text-red-600">{job.extraction_error}</p>
          ) : null}

          <div className="space-y-1">
            <p className="text-sm text-gray-600">Job URL</p>
            <p className="border p-2 w-full bg-gray-100 break-all">{job.job_url || "N/A"}</p>
          </div>
          <input
            className="border p-2 w-full"
            placeholder="Company name"
            value={form.company_name}
            onChange={(e) => handleChange("company_name", e.target.value)}
          />
          <input
            className="border p-2 w-full"
            placeholder="Job title"
            value={form.job_title}
            onChange={(e) => handleChange("job_title", e.target.value)}
          />
          <textarea
            className="border p-2 w-full min-h-40"
            placeholder="Job description"
            value={form.job_description}
            onChange={(e) => handleChange("job_description", e.target.value)}
          />

          <button
            className={`px-4 py-2 text-white ${
              isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500"
            }`}
            onClick={handleSave}
            disabled={isSaving}
            type="button"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
