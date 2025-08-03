import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

const NARRATIVES_API_BASE_URL = "https://narratives-api-765852113927.asia-northeast1.run.app";

// CORS proxy function for narratives-test API
export const narrativesApiProxy = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "https://narratives-crm-site.web.app");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.set("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }

  try {
    // Extract the path from the request
    const apiPath = req.path || "/";
    const targetUrl = `${NARRATIVES_API_BASE_URL}${apiPath}`;
    
    console.log(`Proxying ${req.method} ${targetUrl}`);

    // Forward the request to the narratives API
    const cleanHeaders: Record<string, string> = {};
    Object.entries(req.headers).forEach(([key, value]) => {
      if (key !== 'host' && typeof value === 'string') {
        cleanHeaders[key] = value;
      }
    });

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: cleanHeaders,
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
    });

    // Forward the response
    const responseData = await response.text();
    
    // Set response headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "access-control-allow-origin") {
        res.set(key, value);
      }
    });

    res.status(response.status).send(responseData);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error: "Proxy error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
