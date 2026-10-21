import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fella_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getAPIErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.message || "Có lỗi xảy ra, vui lòng thử lại!";
  }

  return error instanceof Error
    ? error.message
    : "Có lỗi xảy ra, vui lòng thử lại!";
}
