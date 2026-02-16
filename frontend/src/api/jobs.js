import { API } from "./client";

export const getJobs = () => API.get("jobs/list/");
export const createJob = (data) => API.post("jobs/create/", data);
