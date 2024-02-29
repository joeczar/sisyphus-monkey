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
    if (item === undefined) {
      console.error(`Attempted to enqueue undefined item`);
      return;
    }

    if (this.resolveDequeue) {
      // If the dequeue method is waiting (because the queue was empty),
      // immediately resolve the dequeue Promise with the newly enqueued item.
      const resolve = this.resolveDequeue;
      this.resolveDequeue = null; // Clear the resolve function to accept new dequeues.
      resolve(item);
    } else {
      // Put the item into the queue normally.
      this.queue.push(item);
    }
  }

  async dequeue(): Promise<T> {
    // If there's an item already in the queue, return it immediately.
    if (this.queue.length > 0) {
      const item = this.queue.shift()!;
      console.log("Dequeueing", item);
      return Promise.resolve(item);
    }
    // If the queue is empty, return a Promise that will
    // be resolved when an item is enqueued.
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

  setHasStarted(started: boolean): void {
    this.hasStarted = started;
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
