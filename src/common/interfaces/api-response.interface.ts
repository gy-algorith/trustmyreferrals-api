/**
 * API 응답 인터페이스
 * 모든 API 응답에 success 필드를 포함하기 위한 인터페이스
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

/**
 * API 배열 응답 인터페이스
 * 배열 데이터를 포함하는 API 응답을 위한 인터페이스
 */
export interface ApiArrayResponse<T> {
  success: boolean;
  data: T[];
}
