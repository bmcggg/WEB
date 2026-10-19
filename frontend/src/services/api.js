const API_BASE_URL = "http://localhost:5000/api";

export async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem("fella_token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Có lỗi xảy ra, vui lòng thử lại!");
  }

  return data;
}
