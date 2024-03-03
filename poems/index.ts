import { processFolder } from "./readAndParse"
import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import neo4jDb from "../db/Neo4jDb";

const app = new Hono();

app.get("/", async (c) => c.json({ server: "Poems", neo4j:await neo4jDb.checkConnection(), packets: await neo4jDb.countPackets() }));
app.get("/packets", async (c) => {
  const packets = await neo4jDb.getPackets(5)
  console.log(packets)
  return c.json(packets)
})

app.use(prettyJSON());
app.use(cors());
app.notFound((c) => c.json({ message: "No Bueno", ok: false }, 404));
export const main = async ()=>{
  console.log("Starting POEMS")
  const connection = await neo4jDb.checkConnection()
  await neo4jDb.clearDatabase()
  console.log("Connected: ", connection)
  if (!connection) {

  }
  await processFolder()

}
main()

export default {
  port: 4002,
  fetch: app.fetch,
};
