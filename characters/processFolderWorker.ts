self.on('message', async (data) => {
  try {
    await processFolder(data.data); // Call your processing logic
    self.postMessage({ status: 'finished' });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
  
});