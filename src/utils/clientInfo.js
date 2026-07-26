import geoip from "geoip-lite";
import {UAParser} from "ua-parser-js";

export const getClientInfo = (req) => {
  const ipAddress = req.headers["x-forwarded-for"] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    req.ip;

  const userAgent = req.headers["user-agent"] || "Unknown";
  
  const parser = new UAParser();
  parser.setUA(userAgent);
  const ua = parser.getResult();

  // Get location from IP (optional - requires geoip-lite)
  let location = null;
  try {
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      location = {
        country: geo.country,
        city: geo.city,
        latitude: geo.ll?.[0],
        longitude: geo.ll?.[1]
      };
    }
  } catch (error) {
    // Silently fail - location is optional
  }

  return {
    ipAddress: ipAddress.replace("::ffff:", ""),
    userAgent,
    deviceInfo: `${ua.device.vendor || "Unknown"} ${ua.device.model || ""}`.trim() || "Unknown Device",
    browserInfo: `${ua.browser.name || "Unknown"} ${ua.browser.version || ""}`.trim(),
    osInfo: `${ua.os.name || "Unknown"} ${ua.os.version || ""}`.trim(),
    location,
    timestamp: new Date()
  };
};