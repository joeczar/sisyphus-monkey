self.on('message', async (data) => {
  try {
    await printChars(data.data); // Call your printing logic
    self.postMessage({ status: 'finished' });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
});