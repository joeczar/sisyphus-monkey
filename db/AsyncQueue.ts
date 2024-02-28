export class AsyncQueue<T> {
  private queue: T[] = [];
  private resolveDequeue: ((value: T | PromiseLike<T>) => void) | null = null;
  private hasStarted = false;
  private hasFinished = false;

  constructor() {
    this.queue = [];
    this.resolveDequeue = null;
  }

  enqueue(item: T) {
    // Ensure item is defined before resolving or pushing to the queue
    if (item === undefined) {
      console.error(`Attempted to enqueue undefined item`);
    } else if (this.resolveDequeue) {
      this.resolveDequeue(item);
      this.resolveDequeue = null;
    } else {
      this.queue.push(item);
    }
  }

  async dequeue(): Promise<T> {

    if (this.queue.length > 0) {
      const item = this.queue.shift()!;
      console.log('Dequeueing', Promise.resolve(item));
      return Promise.resolve(this.queue.shift()!);
    }
    return new Promise((resolve) => {
      this.resolveDequeue = resolve;
    });
  }

  isEmpty() {
    return this.queue.length === 0 && !this.resolveDequeue;
  }

  getHasStarted() {
    return this.hasStarted;
  }

  getQueue() {
    return this.queue;
  }

  close() {
    this.queue = [];
    this.resolveDequeue = null;
    this.hasFinished = true;
  }

}
