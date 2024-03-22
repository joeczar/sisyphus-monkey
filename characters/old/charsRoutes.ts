import { Hono } from "hono";

import { DatabaseService } from "../db/database";

export const chars = new Hono();
console.log("chars started");
chars.get("/", async (c) => {
  try {
    const packets = await DatabaseService.getPacketCount();
    return c.json({ packets });
  } catch (err) {
    console.error("Error getting all packets:", err);
    return c.json({ message: "Error getting all packets", ok: false }, 500);
  }
});

chars.get("/:packetNr", async (c) => {
  try {
    const packetNr = c.req.param("packetNr") as string;
    const packet = await DatabaseService.getPacket(parseInt(packetNr, 10));
    return c.json({ packet });
  } catch (err) {
    console.error("Error getting packet:", err);
    return c.json({ message: "Error getting packet", ok: false }, 500);
  }
});
chars.get("/packets", async (c) => {
  try {
    const packets = await DatabaseService.getAllPackets();
    return c.json({ packets });
  } catch (err) {
    console.error("Error getting packets:", err);
    return c.json({ message: "Error getting packets", ok: false }, 500);
  }
});
