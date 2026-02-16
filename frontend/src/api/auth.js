import { API } from "./client";

export const login = ({ username, password }) =>
  API.post("token/", { username, password });
