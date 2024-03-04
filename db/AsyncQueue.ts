import EventEmitter from "events";

export class AsyncQueue<T> extends EventEmitter {
  private queue: T[] = [];
  private pendingEnqueues: ((value: void) => void)[] = [];
  private resolveDequeue: ((value: T | PromiseLike<T>) => void) | null = null;
  private hasStarted = false;
  private hasFinished = false;

  constructor(private maxSize: number = Infinity) {
    super();
    this.queue = [];
    this.resolveDequeue = null;
    this.maxSize = maxSize;
  }

  enqueue(item: T): Promise<void> {
    if (this.resolveDequeue) {
      // If there is someone waiting to dequeue, resolve their promise and don't add to the queue
      const resolve = this.resolveDequeue;
      this.resolveDequeue = null;
      resolve(item);
      return Promise.resolve();
    } else if (this.queue.length < this.maxSize) {
      // Queue length check
      this.queue.push(item);
      return Promise.resolve();
    } else {
      // Wait for space to be available
      return new Promise((resolve) => {
        this.pendingEnqueues.push(resolve);
      });
    }
  }

  async dequeue(): Promise<T> {
    // If there's an item already in the queue, return it immediately.
    if (this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.notifyPendingEnqueue();
      return Promise.resolve(item);
    }
    // If the queue is empty, return a Promise that will
    // be resolved when an item is enqueued.
    return new Promise((resolve) => {
      this.resolveDequeue = resolve;
    });
  }

  private notifyPendingEnqueue(): void {
    if (this.pendingEnqueues.length > 0 && this.queue.length < this.maxSize) {
      const resolve = this.pendingEnqueues.shift()!;
      resolve();
    }
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

  async close() {
    // Resolve all pending enqueue promises with a rejection when closing the queue.
    for (const resolve of this.pendingEnqueues) {
      resolve(await Promise.reject(new Error("Queue closed")));
    }
    this.pendingEnqueues = [];

    // Emit an event to signal closure
    this.emit("finished");

    // Perform cleanup
    this.queue = [];
    this.resolveDequeue = null;
    this.hasFinished = true;
  }
}
