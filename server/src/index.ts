import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
// import helmet from "helmet";
import cors from "cors";
import path from "path";
import connectDB from "./config/db";
import v1Routes from "./routes/v1/index";
import errorHandlerMiddleware from "./middlewares/errorHandler";
import notFoundMiddleware from "./middlewares/notFound";
import cookieParser from "cookie-parser";
import { initializeSocket } from "./services/socket/index";
import http from "http";

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

connectDB();

const app = express();

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// app.use(helmet())

// Create HTTP server BEFORE initializing Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = initializeSocket(server);

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", v1Routes);

if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging") {
  const buildPath = path.join(__dirname, "..", "..", "client", "dist");
  app.use(express.static(buildPath));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(buildPath, "index.html"));
  });
}

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const args = process.argv.slice(2);
const portArgIndex = args.indexOf("--port");


const PORT =
  portArgIndex !== -1
    ? Number(args[portArgIndex + 1])
    : Number(process.env.PORT) || 5000;


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server initialized and running`);
});