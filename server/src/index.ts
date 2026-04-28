import { app } from "./app.js";

const PORT = Number(process.env.PORT) || 3847;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;

app.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}`;
  console.log(`Epic Form API listening on ${localUrl}`);
  if (PUBLIC_BASE_URL) {
    console.log(`Public base URL: ${PUBLIC_BASE_URL}`);
  }
});
