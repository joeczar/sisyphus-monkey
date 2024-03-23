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
) => {
  let lastError;
  const word = url.split('/').pop() || 'unknown';

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = (await fetchWithTimeout(url, options)) as Response;
      if (response.ok) {
        return response;
      }
      if (response.status === 429) {
        // Handle rate limiting
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : retryDelay;
        console.log(
          `Rate limited. Retrying ${word} after ${waitTime} milliseconds.`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue; // Continue to the next iteration for a retry
      }
      // If not rate limited but response is not OK, don't retry and return null immediately
      lastError = new Error(
        `Failed to fetch ${word}: ${response.status} ${response.statusText}`
      );
      return null; // Early return for non-OK, non-429 responses
    } catch (error) {
      console.error(`Error on attempt ${i + 1} for ${word}:`, error);
      lastError = error;
      // Wait before retrying for non-rate limit errors
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw lastError; // If all retries exhausted, throw the last encountered error
};
