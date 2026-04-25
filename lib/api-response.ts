import { NextResponse } from 'next/server';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total: number; page: number; limit: number };
}

export function ok<T>(data: T, init?: { status?: number }): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status: init?.status ?? 200 },
  );
}

export function fail(
  error: string,
  status: number,
  init?: { headers?: HeadersInit },
): NextResponse<ApiResponse<never>> {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error },
    { status, headers: init?.headers },
  );
}
