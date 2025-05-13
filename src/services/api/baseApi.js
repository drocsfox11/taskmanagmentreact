import { createApi } from '@reduxjs/toolkit/query/react';

const BASE_URL = process.env.REACT_APP_API_BASE_URL + "/";

const customBaseQuery = async (args, api, extraOptions) => {
  console.log(args, api, extraOptions);

  const { url, method = 'GET', body, params, headers, formData } = args;
  let endpoint = url;
  if (params) {
    const queryParams = new URLSearchParams(params).toString();
    endpoint = `${url}?${queryParams}`;
  }

  const fetchOptions = {
    credentials: 'include',
    method,
    headers: { ...headers },
  };

  if (body) {
    if (formData) {
      
      fetchOptions.body = body;
    } else {
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
  tagTypes: [
    'Projects',
    'Boards',
    'Columns',
    'Tasks',
    'Users',
    'Tags',
    'CurrentUser',
    'ProjectRights',
    'Events',
    'Chats',
    'Messages',
    'ChatParticipants'
  ],
}); 