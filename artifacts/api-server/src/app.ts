import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const PgStore = connectPgSimple(session);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required.");
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
    name: "pf_session",
  }),
);

app.use("/api", router);

// Serve static files (Vite build) in production
const staticPath =
  process.env.STATIC_FILES_PATH ||
  path.join(__dirname, "../../ponto-app/dist/public");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(staticPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

export default app;
