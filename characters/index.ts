import { processFolder } from './readAndParse';

const main = async () => {
  console.log('Starting application ...');

  await processFolder();
};
main()
  .catch((error) => {
    console.error('Failed to start the application:', error);
  })
  .finally(async () => {
    console.log('Application exiting');
  });
