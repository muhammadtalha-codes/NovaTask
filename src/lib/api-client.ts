"use client";

// Thin fetch wrapper for authenticated JSON API calls from the client.

export async function api<T = any>(
  path: string,
  options?: RequestInit & { json?: any }
): Promise<T> {
  const { json, headers, ...rest } = options ?? {};
  const init: RequestInit = {
    ...rest,
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    credentials: "include",
  };
  if (json !== undefined) {
    init.body = JSON.stringify(json);
  }
  const res = await fetch(path, init);
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && data.error) ||
      `Request failed (${res.status})`;
    const e: any = new Error(msg);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data as T;
}
