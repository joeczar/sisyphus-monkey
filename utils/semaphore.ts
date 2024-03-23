export class Semaphore {
  private tasks: (() => void)[] = [];
  private count: number;

  constructor(count: number) {
    if (count <= 0) {
      throw new Error('Semaphore count must be greater than 0');
    }
    this.count = count;
  }

  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count -= 1;
      return Promise.resolve();
    }

    // If no permits are available, return a promise that resolves when the semaphore releases a permit
    return new Promise<void>((resolve) => {
      this.tasks.push(resolve);
    });
  }

  release(): void {
    this.count += 1;
    if (this.tasks.length > 0) {
      // Take the first task from the queue and resolve it, effectively releasing a permit
      const nextTask = this.tasks.shift();
      nextTask!(); // Using the non-null assertion operator since we know tasks array is not empty
    }
  }
}
