"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrativesApiProxy = exports.proxyHealth = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
const NARRATIVES_API_BASE_URL = "https://narratives-api-765852113927.asia-northeast1.run.app";
// Health check endpoint to test if the proxy is working
exports.proxyHealth = (0, https_1.onRequest)(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET");
    try {
        // Test connection to the narratives API
        console.log("Testing connection to narratives API...");
        const response = await fetch(`${NARRATIVES_API_BASE_URL}/health`, {
            method: "GET",
            headers: {
                "User-Agent": "Firebase-Functions-Health-Check/1.0"
            }
        });
        const responseText = await response.text();
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            narrativesApi: {
                url: `${NARRATIVES_API_BASE_URL}/health`,
                status: response.status,
                statusText: response.statusText,
                response: responseText
            }
        });
    }
    catch (error) {
        console.error("Health check failed:", error);
        res.status(500).json({
            status: "error",
            timestamp: new Date().toISOString(),
            error: error.message,
            narrativesApi: {
                url: `${NARRATIVES_API_BASE_URL}/health`,
                error: true
            }
        });
    }
});
// CORS proxy function for narratives-test API
exports.narrativesApiProxy = (0, https_1.onRequest)(async (req, res) => {
    var _a;
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "https://narratives-crm.web.app");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Allow-Credentials", "true");
    // Handle preflight requests
    if (req.method === "OPTIONS") {
        console.log("Handling OPTIONS preflight request");
        res.status(200).send();
        return;
    }
    try {
        // Extract the path from the request
        const apiPath = req.path || "/";
        const targetUrl = `${NARRATIVES_API_BASE_URL}${apiPath}`;
        console.log(`=== Proxy Request ===`);
        console.log(`Method: ${req.method}`);
        console.log(`Target URL: ${targetUrl}`);
        console.log(`Original headers:`, req.headers);
        // Prepare headers for forwarding - be more selective
        const forwardHeaders = {};
        // Only forward specific headers we need
        if (req.headers.authorization) {
            forwardHeaders["Authorization"] = Array.isArray(req.headers.authorization)
                ? req.headers.authorization[0]
                : req.headers.authorization;
        }
        if (req.headers["content-type"]) {
            forwardHeaders["Content-Type"] = Array.isArray(req.headers["content-type"])
                ? req.headers["content-type"][0]
                : req.headers["content-type"];
        }
        // Add user agent
        forwardHeaders["User-Agent"] = "Firebase-Functions-Proxy/1.0";
        console.log(`Forward headers:`, forwardHeaders);
        // Add timeout and better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: req.method !== "GET" && req.method !== "HEAD" && req.body ? JSON.stringify(req.body) : undefined,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log(`=== Proxy Response ===`);
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
        // Get response data
        const responseData = await response.text();
        console.log(`Response data length: ${responseData.length}`);
        console.log(`Response preview: ${responseData.substring(0, 200)}...`);
        // Forward response headers (except CORS ones we're handling ourselves)
        response.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (!lowerKey.startsWith("access-control-") && lowerKey !== "server") {
                res.set(key, value);
            }
        });
        res.status(response.status).send(responseData);
    }
    catch (error) {
        console.error("=== Proxy Error ===");
        console.error("Error type:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        let errorMessage = "Unknown proxy error";
        let statusCode = 500;
        if (error.name === "AbortError") {
            errorMessage = "Request timeout - API took too long to respond";
            statusCode = 504;
        }
        else if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("fetch")) {
            errorMessage = `Failed to connect to API: ${error.message}`;
            statusCode = 502;
        }
        else if (error.code === "ENOTFOUND") {
            errorMessage = "API server not found";
            statusCode = 502;
        }
        else if (error.code === "ECONNREFUSED") {
            errorMessage = "API server refused connection";
            statusCode = 502;
        }
        else if (error.message) {
            errorMessage = error.message;
        }
        res.status(statusCode).json({
            error: "Proxy error",
            message: errorMessage,
            targetUrl: `${NARRATIVES_API_BASE_URL}${req.path || "/"}`,
            timestamp: new Date().toISOString(),
            errorCode: error.code || "UNKNOWN"
        });
    }
});
//# sourceMappingURL=index.js.map