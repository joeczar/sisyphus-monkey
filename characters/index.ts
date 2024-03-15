import { getAndParsePackets } from "./readAndSavePackets";

async function initializeChars() {
  await getAndParsePackets()
}

await initializeChars()