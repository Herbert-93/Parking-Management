"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const rates_1 = __importDefault(require("./routes/rates"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const stats_1 = __importDefault(require("./routes/stats"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("combined"));
app.use(express_1.default.json({ limit: "2mb" }));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow non-browser tools (curl, mobile apps) with no Origin header,
        // and any origin explicitly whitelisted via CORS_ORIGINS.
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
            return callback(null, true);
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
}));
app.use((0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.get("/", (_req, res) => {
    res.json({ status: "ok", service: "parking-backend" });
});
app.get("/health", (_req, res) => res.status(200).send("OK"));
app.use("/api/auth", auth_1.default);
app.use("/api/rates", rates_1.default);
app.use("/api/sessions", sessions_1.default);
app.use("/api/stats", stats_1.default);
// 404
app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
});
// Central error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error." });
});
app.listen(PORT, () => {
    console.log(`Parking backend listening on port ${PORT}`);
});
