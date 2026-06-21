import type { ApiErrorCode } from "./errors.js";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function fail(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiFailure {
  return { ok: false, error: { code, message, details } };
}
