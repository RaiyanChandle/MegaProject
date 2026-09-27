import dotenv from "dotenv";
import express from "express";
import cors from "cors";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const APP_NAME = process.env.APP_NAME || "NEXUS DevOps Demo";
const NODE_ENV = process.env.NODE_ENV || "development";

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: APP_NAME,
    environment: NODE_ENV,
    message: "Hello from Express backend!",
  });
});

app.listen(PORT, () => {
  console.log(`${APP_NAME} running on port ${PORT}`);
});