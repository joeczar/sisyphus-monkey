# 🐒 Sisyphus Monkey

A creative text analysis and poetry generation system that finds hidden words in text and uses them to generate unique poetry.

## 🌟 Features

- **Word Discovery**: Finds hidden words within text using an efficient Trie-based system
- **Poetry Generation**: Creates poems using discovered words via OpenAI
- **Interactive Display**: Beautiful terminal-based UI with color and pagination
- **SQLite Storage**: Efficient local storage of chunks, words, and poems
- **Configurable**: Adjustable settings for word packets and chunk sizes

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Bun package manager
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sisyphus-monkey.git
cd sisyphus-monkey
```

2. Install dependencies:
```bash
bun install
```

3. Set up your environment:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### Running the Project

1. Start in test mode (recommended for first run):
```bash
bun run test-step-mode
```

2. Run with default settings:
```bash
bun run start
```

## 📖 Usage

The system works in several steps:

1. **Text Analysis**
   - Processes input text in chunks
   - Discovers hidden words using Trie matching
   - Groups words into packets

2. **Poetry Generation**
   - Takes word packets as input
   - Generates creative poetry using OpenAI
   - Maintains word order and relationships

3. **Display**
   - Shows progress with color-coded output
   - Paginates long content
   - Provides interactive navigation

## ⚙️ Configuration

Key configuration options:

```typescript
// Word packet settings
minPacketSize: 5    // Minimum words per packet
maxPacketSize: 10   // Maximum words per packet
preferRelated: true // Group related words together

// Chunk settings
chunkSize: 100      // Characters per chunk
maxChunks: 3       // Maximum chunks to process
```

See `.cursor/working/tasks/configuration-settings.md` for detailed configuration documentation.

## 📝 Development

### Project Structure

```
src/
├── word-finder/     # Word discovery logic
├── poetry/          # Poetry generation
├── utils/           # Shared utilities
├── scripts/         # CLI scripts
└── types/          # TypeScript definitions
```

### Key Components

- **WordFinderService**: Discovers words in text
- **PoetryService**: Generates poetry using OpenAI
- **DisplayService**: Handles UI/UX
- **SQLiteService**: Manages data persistence

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for the GPT API
- The SQLite team
- All contributors and testers

## 🐛 Known Issues

- API rate limiting can affect poetry generation
- Large chunks may impact performance
- Some word combinations may produce unexpected results

See the issues page for more details and planned improvements.
