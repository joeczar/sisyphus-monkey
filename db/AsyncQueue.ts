export class AsyncQueue<T> {
  private queue: T[] = [];
  private resolveDequeue: ((value: T | PromiseLike<T>) => void) | null = null;

  constructor() {
    this.queue = [];
    this.resolveDequeue = null;
  }

  enqueue(item: T) {
    if (this.resolveDequeue) {
      this.resolveDequeue(item);
      this.resolveDequeue = null;
    } else {
      this.queue.push(item);
    }
  }

  async dequeue(): Promise<T> {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift()!);
    }
    return new Promise((resolve) => {
      this.resolveDequeue = resolve;
    });
  }

  isEmpty() {
    return this.queue.length === 0 && !this.resolveDequeue;
  }
}
