import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true
    })
)

//COMMON MIDDLEWARE
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser())

//IMPORT ROUTES

import healthcheckRouter from "./routes/healthcheck.routes.js";



//ROUTES

app.use("/api/v1/healthcheck", healthcheckRouter)


export { app };