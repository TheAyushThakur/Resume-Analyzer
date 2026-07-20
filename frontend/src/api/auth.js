import { API } from "./client";

export const login = ({ username, password }) =>
  API.post("token/", { username, password });

export const signup = ({ username, email, fullName, password }) =>
  API.post("auth/signup/", {
    username,
    email,
    full_name: fullName,
    password,
  });

export const getMe = () => API.get("auth/me/");

export const updateMe = (data) => API.patch("auth/me/update/", data);
