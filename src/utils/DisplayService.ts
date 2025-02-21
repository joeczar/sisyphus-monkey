/* src/utils/DisplayService.ts */

import { createInterface } from 'readline';
import { stdout, stdin } from 'process';
import chalk from 'chalk';

export interface ScrollOptions {
  speed?: number;          // Delay between characters in ms
  color?: string;          // Text color
  style?: 'normal' | 'bold' | 'dim' | 'italic';
  pauseOnNewline?: boolean;// Pause briefly on newlines
  width?: number;          // Max line width (0 for terminal width)
  interruptible?: boolean; // Allow Ctrl+C to stop
}

export interface PageOptions {
  linesPerPage?: number;   // Number of lines per page
  color?: string;          // Text color
  style?: 'normal' | 'bold' | 'dim' | 'italic';
  width?: number;          // Max line width (0 for terminal width)
  prompt?: string;         // Custom prompt for next page
  header?: string;         // Header text for each page
  footer?: string;         // Footer text for each page
  pageNumbers?: boolean;   // Show page numbers
}

export class DisplayService {
  private isScrolling: boolean = false;
  private defaultScrollOptions: Required<ScrollOptions> = {
    speed: 50,
    color: 'white',
    style: 'normal',
    pauseOnNewline: true,
    width: 0,
    interruptible: true
  };

  private defaultPageOptions: Required<PageOptions> = {
    linesPerPage: 20,
    color: 'white',
    style: 'normal',
    width: 0,
    prompt: 'Press Enter for next page...',
    header: '',
    footer: '',
    pageNumbers: true
  };

  /**
   * Scrolls text character by character with configurable options
   */
  async scrollText(text: string, options: ScrollOptions = {}): Promise<void> {
    const opts = { ...this.defaultScrollOptions, ...options };
    this.isScrolling = true;

    // Handle interruption
    if (opts.interruptible) {
      const cleanup = this.setupInterruptHandler();
      try {
        await this.performScroll(text, opts);
      } finally {
        cleanup();
      }
    } else {
      await this.performScroll(text, opts);
    }
  }

  /**
   * Displays text in pages with configurable options
   */
  async paginateText(text: string, options: PageOptions = {}): Promise<void> {
    const opts = { ...this.defaultPageOptions, ...options };
    
    // Calculate terminal width if not specified
    const width = opts.width || stdout.columns || 80;
    
    // Word wrap and split into lines
    const wrappedText = this.wordWrap(text, width);
    const lines = wrappedText.split('\n');
    const totalPages = Math.ceil(lines.length / opts.linesPerPage);

    for (let page = 0; page < totalPages; page++) {
      // Clear screen for each page
      console.clear();

      // Display header if set
      if (opts.header) {
        console.log(this.formatText(opts.header, opts));
        console.log('-'.repeat(width));
      }

      // Display page content
      const pageLines = lines.slice(
        page * opts.linesPerPage,
        (page + 1) * opts.linesPerPage
      );
      
      pageLines.forEach(line => {
        console.log(this.formatText(line, opts));
      });

      // Display footer and page numbers
      if (opts.footer || opts.pageNumbers) {
        console.log('-'.repeat(width));
        if (opts.footer) {
          console.log(this.formatText(opts.footer, opts));
        }
        if (opts.pageNumbers) {
          console.log(this.formatText(
            `Page ${page + 1} of ${totalPages}`,
            opts
          ));
        }
      }

      // Wait for user input if not last page
      if (page < totalPages - 1) {
        await this.waitForEnter(opts.prompt);
      }
    }
  }

  /**
   * Stops any ongoing scroll operation
   */
  stop(): void {
    this.isScrolling = false;
  }

  private async performScroll(text: string, options: Required<ScrollOptions>): Promise<void> {
    const width = options.width || stdout.columns || 80;
    const wrappedText = this.wordWrap(text, width);
    
    for (const char of wrappedText) {
      if (!this.isScrolling) break;
      
      stdout.write(this.formatText(char, options));
      
      // Pause longer on newlines if enabled
      const delay = char === '\n' && options.pauseOnNewline 
        ? options.speed * 5 
        : options.speed;
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    stdout.write('\n');
  }

  private setupInterruptHandler(): () => void {
    const handler = () => this.stop();
    process.on('SIGINT', handler);
    return () => process.off('SIGINT', handler);
  }

  private async waitForEnter(prompt: string): Promise<void> {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      await new Promise<void>(resolve => {
        rl.question(prompt, () => resolve());
      });
    } finally {
      rl.close();
    }
  }

  private wordWrap(text: string, width: number): string {
    if (width === 0) return text;
    
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.join('\n');
  }

  private formatText(text: string, options: ScrollOptions | PageOptions): string {
    let formatted = text;
    
    // Apply style
    if (options.style === 'bold') formatted = chalk.bold(formatted);
    if (options.style === 'dim') formatted = chalk.dim(formatted);
    if (options.style === 'italic') formatted = chalk.italic(formatted);
    
    // Apply color
    if (options.color && options.color in chalk) {
      formatted = (chalk as any)[options.color](formatted);
    }
    
    return formatted;
  }
}

export const displayService = new DisplayService(); 