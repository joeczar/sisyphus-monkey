import EventEmitter from "events";

export class AsyncQueue<T> extends EventEmitter{
  private queue: T[] = [];
  private resolveDequeue: ((value: T | PromiseLike<T>) => void) | null = null;
  private hasStarted = false;
  private hasFinished = false;


  constructor(private maxSize: number = Infinity) {
    super()
    this.queue = [];
    this.resolveDequeue = null;
    this.maxSize = maxSize
  }

  
  enqueue(item: T): boolean {
    //...
    if (this.resolveDequeue && this.queue.length < this.maxSize) {
      // Additional condition to ensure queue length is under maxSize
      const resolve = this.resolveDequeue;
      this.resolveDequeue = null;
      resolve(item);
      return true;
    } else if (this.queue.length < this.maxSize) {
      // Queue length check
      this.queue.push(item);
      return true;
    } else {
      console.error(`Queue is at maximum capacity (${this.maxSize}). Discarding new item.`);
      return false;
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
    this.emit('finished')
    this.queue = [];
    this.resolveDequeue = null;
    this.hasFinished = true;
  }
}
