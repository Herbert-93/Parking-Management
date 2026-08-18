import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import ratesRoutes from "./routes/rates";
import sessionsRoutes from "./routes/sessions";
import statsRoutes from "./routes/stats";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
app.use(morgan("combined"));
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (curl, mobile apps) with no Origin header,
      // and any origin explicitly whitelisted via CORS_ORIGINS.
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "parking-backend" });
});

app.get("/health", (_req, res) => res.status(200).send("OK"));

app.use("/api/auth", authRoutes);
app.use("/api/rates", ratesRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/stats", statsRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Central error handler
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error." });
  }
);

app.listen(PORT, () => {
  console.log(`Parking backend listening on port ${PORT}`);
});
