import axios, { AxiosError } from 'axios';
import { ProblemDetails } from '@/types/api';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ProblemDetails>) => {
    const problem = error.response?.data;
    const message = problem?.detail || problem?.title || error.message;
    return Promise.reject(new Error(message));
  },
);
