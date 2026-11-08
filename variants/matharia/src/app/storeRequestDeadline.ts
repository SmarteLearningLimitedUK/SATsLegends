/** Bound read-only native lookups. Never apply this deadline to a purchase prompt. */
export async function storeRequestDeadline<T>(request: Promise<T>, timeoutMs = 8000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('App Store access check timed out.')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}
