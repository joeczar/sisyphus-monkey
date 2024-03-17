export const safeParseJson = async (message: string) => {
  try {
    return JSON.parse(message);
  } catch (error) {
    console.error('Error parsing JSON message:', error);
    return null;
  }
};
