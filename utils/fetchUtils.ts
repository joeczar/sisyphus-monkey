/**
 * Fetches data from the specified URL with a timeout.
 * @param url The URL to fetch data from.
 * @param options The fetch options.
 * @param timeout The timeout duration in milliseconds.
 * @returns A promise that resolves to the fetched data or rejects with an error.
 */
export const fetchWithTimeout = (
  url: string,
  options = {},
  timeout = 10000
) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    ),
  ]);
};

/**
 * Fetches data from the specified URL with retries.
 * @param url The URL to fetch data from.
 * @param options The fetch options.
 * @param maxRetries The maximum number of retries.
 * @returns A promise that resolves to the fetched data or rejects with an error.
 */
export const fetchWithRetry = async (
  url: string,
  options = {},
  maxRetries = 3,
  retryDelay = 1000 // Default delay between retries is 1000 milliseconds
): Promise<Response | 'NotFound'> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = (await fetchWithTimeout(url, options)) as Response;
      response.headers.forEach((value, name) => {
        console.log(`${name}: ${value}`);
      });

      if (response.ok) {
        return response; // Success, return response
      } else if (response.status === 404) {
        // Treat 404 differently - return a specific indicator instead of throwing an error
        return 'NotFound';
      } else if (response.status === 429) {
        // Rate limited by the API
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : retryDelay;
        console.log(`Rate limited. Retrying after ${waitTime} milliseconds.`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        retryDelay *= 2; // Optional: implement exponential backoff
        continue; // Retry
      } else {
        // For other errors, throw immediately without retrying
        throw new Error(
          `Failed to fetch: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error; // Throw error if all retries exhausted
      }
      console.log(`Error on attempt ${i + 1}:`, error);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('All retries exhausted'); // Fallback error if loop exits without returning
};
