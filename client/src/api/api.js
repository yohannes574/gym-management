export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getToken = () => {
  return localStorage.getItem("token");
};

export const getUser = () => {
  try {
    const stored = localStorage.getItem("user");

    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const saveAuth = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] =
      headers["Content-Type"] || "application/json";
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Authentication failed or token expired
  if (response.status === 401) {
    clearAuth();
    window.location.href = "/login";
  }

  return response;
};