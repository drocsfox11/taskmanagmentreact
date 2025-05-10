import { createApi } from '@reduxjs/toolkit/query/react';

const BASE_URL = process.env.REACT_APP_API_BASE_URL + "/";

// Кастомный baseQuery с авторизацией и обработкой ошибок
const customBaseQuery = async (args, api, extraOptions) => {
  console.log(args, api, extraOptions);

  const { url, method = 'GET', body, params, headers, formData } = args;
  let endpoint = url;
  // Добавляем query-параметры, если есть
  if (params) {
    const queryParams = new URLSearchParams(params).toString();
    endpoint = `${url}?${queryParams}`;
  }

  // Настраиваем опции для fetch
  const fetchOptions = {
    credentials: 'include',
    method,
    headers: { ...headers },
  };

  // Добавляем тело запроса для мутаций
  if (body) {
    // Check if this is a FormData request (for file uploads)
    if (formData) {
      // For FormData, don't set Content-Type (browser will set it with boundary)
      // and don't try to JSON.stringify the body
      fetchOptions.body = body;
    } else {
      // For regular JSON requests
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, fetchOptions);

    if (response.status === 401) {
      window.location.href = '/login';
      return { error: { status: 401, data: 'Срок авторизации истек' } };
    }

    if (!response.ok) {
      const errorBody = await response.json();
      return { error: { status: response.status, data: errorBody.message || response.statusText } };
    }

    // Handle responses with no content (like 204 No Content)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return { data: null };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API request error:', error);
    return { error: { status: error.status || 500, data: error.message || 'Unknown error' } };
  }
};


export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: customBaseQuery,
  endpoints: () => ({}),
  tagTypes: ['Projects', 'Boards', 'Columns', 'Tasks', 'Users', 'Tags', 'CurrentUser', 'ProjectRights', 'Events'],
}); 