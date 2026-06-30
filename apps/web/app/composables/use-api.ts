import type { ApiResponse } from "@mealmind/contracts";

type ApiErrorPayload = {
  error?: { message?: string };
};

export function errorMessage(error: unknown, fallback = "Request failed.") {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : fallback;
}

export async function apiRequest<T>(path: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
  try {
    const payload = await $fetch<ApiResponse<T>>(path, options);
    if (!payload.ok) throw new Error(payload.error.message);
    return payload.data;
  } catch (error) {
    const payload = (error as { data?: ApiErrorPayload } | null)?.data;
    const message = payload?.error?.message;
    throw new Error(message ?? errorMessage(error));
  }
}
