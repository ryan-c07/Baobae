import { app } from "./app.js";

const PORT = Number(process.env.PORT) || 3847;

app.listen(PORT, () => {
  console.log(`Epic Form API listening on http://localhost:${PORT}`);
});
