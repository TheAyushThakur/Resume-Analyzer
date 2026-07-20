import { API } from "./client";

export const startAIAnalysis = ({
  jobId,
  resumeId,
}) =>
  API.post(`ai/analyze/${jobId}/`, {
    resume_id: resumeId,
  });

export const getAIResult = (jobId) => API.get(`ai/result/${jobId}/`);
