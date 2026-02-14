import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000/api/",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcxMDgxMTAzLCJpYXQiOjE3NzEwNzc1MDMsImp0aSI6ImY4MzhlNmE0YjliMjQ1Njc4MjY4YjI3ZjkwNTk3ZGU2IiwidXNlcl9pZCI6IjEifQ.qJ2HvSTDr9paLTGPKj1aO96KS5zBCuHqFxyq4nvWzJE",
    },
});

export const getJobs =()=> API.get("jobs/list/");
export const createJob = (data) => API.post("jobs/create/", data);
