import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import chaptersRouter from "./routes/chapters.routes";
import radiometerRouter from "./routes/radiometer.routes";
import adminRouter from "./routes/admin.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// Middlewares
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["*"],
    credentials: true,
  })
);
app.use(express.json());

// Request logging in development
app.use((req: Request, _res: Response, next: NextFunction) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ONLINE",
    sector: "HAWKINS_MAINFRAME_BACKEND",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use("/api/chapters", chaptersRouter);
app.use("/api/radiometer", radiometerRouter);
app.use("/api/admin", adminRouter);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "ENDPOINT_NOT_FOUND",
    message: "The requested telemetry endpoint does not exist on the Hawkins mainframe.",
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[SERVER ERROR]", err);
  res.status(500).json({
    success: false,
    error: "INTERNAL_SERVER_ERROR",
    message: "An unhandled parity failure occurred in the telemetry mainframe.",
  });
});

// Start Server with high-concurrency settings (handles 100+ simultaneous requests)
const server = app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`======================================================`);
  console.log(`★ HAWKINS PROTOCOL SECURITY BACKEND ONLINE ★`);
  console.log(`Listening on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
  console.log(`Security Vault Status: ENCRYPTED & ISOLATED`);
  console.log(`Concurrency Capacity: 5,000 max connections`);
  console.log(`CORS Allowed Origin: * (dynamic reflection)`);
  console.log(`======================================================`);
});

// Configure server connection pool for high concurrency
server.maxConnections = 5000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

export default app;
