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
  maxRetries = 3
) => {
  let lastError;
  const word = url.split('/').pop();

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = (await fetchWithTimeout(url, options)) as Response;
      if (response.ok) {
        return response;
      }
      if (word) return null;
      lastError = new Error(
        `Failed to fetch ${word}: ${response.status} ${response.statusText}`
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};
