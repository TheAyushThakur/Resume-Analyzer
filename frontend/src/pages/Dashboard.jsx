import { useEffect, useState } from "react";
import { getJobs, createJob } from "../api/jobs";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [url, setUrl] = useState("");

  const fetchJobs = async () => {
    const res = await getJobs();
    setJobs(res.data);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreate = async () => {
    if (isCreateDisabled) return;
    await createJob({ job_url: url });
    setUrl("");
    fetchJobs();
  };

  const isCreateDisabled = url.trim() === "";

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Job Dashboard</h1>

      <div className="flex gap-2 mb-6">
        <input
          className="border p-2 flex-1"
          placeholder="Paste job URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className={`px-4 text-white ${
            isCreateDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500"
        }`}
          onClick={handleCreate}
          disabled={isCreateDisabled}
        >
          Create Job
        </button>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => (
          <div key={job.id} className="border p-3">
            <p className="font-semibold">
              {job.company_name || "No Company"}
            </p>
            <p>{job.job_title || "No Title"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
