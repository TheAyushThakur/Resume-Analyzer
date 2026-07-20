import { API } from "./client";

export const listResumes = () => API.get("resumes/list/");

export const uploadResume = ({ file, jobApplicationId }) => {
  const formData = new FormData();
  formData.append("file", file);
  if (jobApplicationId) {
    formData.append("job_application", String(jobApplicationId));
  }

  return API.post("resumes/upload/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deleteResume = (id) => API.delete(`resumes/${id}/delete/`);
