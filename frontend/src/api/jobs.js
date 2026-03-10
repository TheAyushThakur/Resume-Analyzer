import { API } from "./client";

export const getJobs = () => API.get("jobs/list/");
export const createJob = (data) => API.post("jobs/create/", data);
export const getJobDetail = (id) => API.get(`jobs/${id}/`);
export const updateJob = (id, data) => API.patch(`jobs/${id}/update/`, data);
