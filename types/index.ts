// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

