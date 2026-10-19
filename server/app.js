import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./Routes/authRoutes.js";
import propertyRoutes from "./Routes/propertyRoutes.js";
import { dataSource } from "./database/dataSource.js";
import { importLegacyJsonData } from "./Services/legacyDataImport.js";
import { sendFailure, sendSuccess } from "./middlewares/apiResponse.js";

const app = express();

const PORT = process.env.PORT ;

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured in production");
}

const allowedClientOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = [
        allowedClientOrigin,
        "https://my-property-manager-my-property-manager.vercel.app",
      ];

      const isLocalDevelopmentOrigin =
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        isLocalDevelopmentOrigin
      ) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);

app.get("/api/health", (_request, response) => {
  return sendSuccess(response, 200, "השרת זמין", { status: "ok" });
});

app.use((_request, response) => {
  return sendFailure(response, 404, "הכתובת המבוקשת לא נמצאה", "ROUTE_NOT_FOUND");
});

app.use((error, _request, response, _next) => {
  if (error?.type === "entity.parse.failed") {
    return sendFailure(response, 400, "גוף הבקשה אינו JSON תקין", "INVALID_JSON");
  }
  const isCorsError = error?.message === "Origin is not allowed by CORS";
  if (isCorsError) {
    return sendFailure(response, 403, "האתר הזה אינו מורשה לגשת לשרת", "CORS_ORIGIN_DENIED");
  }
  console.error(error);
  return sendFailure(response, 500, "השרת לא הצליח להשלים את הפעולה. נסו שוב בעוד רגע.", "INTERNAL_SERVER_ERROR");
});

await dataSource.initialize();
const legacyImport = await importLegacyJsonData();
if (legacyImport.imported) {
  console.log(`Imported legacy records into PostgreSQL: ${legacyImport.users} users, ${legacyImport.properties} properties`);
}

app.listen(PORT
  , () => {
  console.log(`Server is running on port ${PORT}`);
});