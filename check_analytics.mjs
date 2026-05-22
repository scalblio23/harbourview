import * as dotenv from "dotenv";
dotenv.config();

const apiUrl = process.env.VITE_ANALYTICS_ENDPOINT;
const websiteId = process.env.VITE_ANALYTICS_WEBSITE_ID;
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

console.log("Analytics endpoint:", apiUrl);
console.log("Website ID:", websiteId);

if (!apiUrl || !websiteId) {
  console.log("No analytics config found in env");
  process.exit(0);
}

// Try Umami-style stats endpoint
const startAt = 0;
const endAt = Date.now();

try {
  const res = await fetch(`${apiUrl}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "x-umami-api-key": apiKey || "",
    }
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text.substring(0, 1000));
} catch (e) {
  console.log("Error:", e.message);
}

// Also try pageviews
try {
  const res2 = await fetch(`${apiUrl}/api/websites/${websiteId}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=day&timezone=Australia/Sydney`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    }
  });
  console.log("\nPageviews status:", res2.status);
  const text2 = await res2.text();
  console.log("Pageviews response:", text2.substring(0, 1000));
} catch (e) {
  console.log("Pageviews error:", e.message);
}
