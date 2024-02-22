type TrieNode = {
  children: { [key: string]: TrieNode };
  isEndOfWord: boolean;
};

export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = { children: {}, isEndOfWord: false };
  }

  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = { children: {}, isEndOfWord: false };
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
  }

  search(word: string): boolean {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        return false;
      }
      node = node.children[char];
    }
    return node.isEndOfWord;
  }

  startsWith(prefix: string): boolean {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children[char]) {
        return false;
      }
      node = node.children[char];
    }
    return true;
  }

  serialize(node: TrieNode = this.root): object {
    const obj: any = {};
    if (node.isEndOfWord) {
      obj['end'] = true;
    }
    Object.keys(node.children).forEach((char) => {
      obj[char] = this.serialize(node.children[char]);
    });
    return obj;
  }
  deserialize(data: any, node: TrieNode = this.root): void {
    Object.keys(data).forEach((key) => {
      if (key === 'end') {
        node.isEndOfWord = true;
      } else {
        node.children[key] = { children: {}, isEndOfWord: false };
        this.deserialize(data[key], node.children[key]);
      }
    });
  }
}
