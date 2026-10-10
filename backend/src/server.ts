import http from "http";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { ENV } from "./config/env";
import authRoutes from "./routes/auth.routes";
import chaptersRoutes from "./routes/chapters.routes";
import tasksRoutes from "./routes/tasks.routes";
import radiometerRoutes from "./routes/radiometer.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import adminRoutes from "./routes/admin.routes";
import vecnaRoutes from "./routes/vecna.routes";
import specGameRoutes from "./routes/specGame.routes";
import { socketService } from "./services/socket.service";

const app = express();
const server = http.createServer(app);

// Initialize Realtime Socket.io
socketService.init(server);

// Configure Global Middlewares
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
    database: "TIDB_DISTRIBUTED_SQL",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/chapters", chaptersRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/radiometer", radiometerRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vecna", vecnaRoutes);
app.use("/api", specGameRoutes);

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
  console.error("[SERVER UNHANDLED ERROR]", err);
  res.status(500).json({
    success: false,
    error: "INTERNAL_SERVER_ERROR",
    message: "An unhandled parity failure occurred in the telemetry mainframe.",
  });
});

// Start Server with high-concurrency settings
server.listen(ENV.PORT, "0.0.0.0", () => {
  console.log(`======================================================`);
  console.log(`★ HAWKINS PROTOCOL SECURITY BACKEND V2 ONLINE ★`);
  console.log(`Listening on http://localhost:${ENV.PORT} and http://127.0.0.1:${ENV.PORT}`);
  console.log(`Database Engine: TiDB Serverless / Distributed SQL`);
  console.log(`WebSocket Engine: Socket.io on port ${ENV.PORT}`);
  console.log(`Security Vault Status: ENCRYPTED & ISOLATED`);
  console.log(`Concurrency Capacity: 5,000 max connections`);
  console.log(`CORS Allowed Origin: *`);
  console.log(`======================================================`);
});

// High concurrency socket tuning
server.maxConnections = 5000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

export default app;
