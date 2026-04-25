export async function safeFetch<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!process.env.DATABASE_URL) return fallback;
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
