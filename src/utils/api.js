const API_BASE_URL = process.env.REACT_APP_API_URL

export const fetchWithAuth = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
  });

  console.log("API call", endpoint, response);
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}; 