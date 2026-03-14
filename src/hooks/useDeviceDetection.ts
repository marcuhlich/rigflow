import { useState, useEffect } from "react";

export type OS = "windows" | "macos" | "linux" | "android" | "ios" | "unknown";

export interface DeviceInfo {
  isMobile: boolean;
  isDesktop: boolean;
  os: OS;
}

function detectOS(userAgent: string): OS {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes("windows")) return "windows";
  if (ua.includes("mac") || ua.includes("macos") || ua.includes("macintosh")) return "macos";
  if (ua.includes("linux") && !ua.includes("android")) return "linux";
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
  
  return "unknown";
}

function detectMobile(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  
  // Check for mobile user agent patterns
  const mobilePatterns = [
    /android.*mobile/i,
    /iphone/i,
    /ipod/i,
    /ipad/i,
    /blackberry/i,
    /windows phone/i,
    /webos/i,
    /palm/i,
  ];
  
  // Check touch capability
  const hasTouchScreen = navigator.maxTouchPoints > 0;
  
  // Check for mobile patterns in user agent
  const isMobileUA = mobilePatterns.some(pattern => pattern.test(ua));
  
  // iPad on iOS 13+ reports as Mac but has touch
  const isIpadOS = ua.includes("mac") && hasTouchScreen;
  
  return isMobileUA || isIpadOS;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isDesktop: true,
    os: "unknown",
  });

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const os = detectOS(userAgent);
    const isMobile = detectMobile(userAgent);
    
    setDeviceInfo({
      isMobile,
      isDesktop: !isMobile,
      os,
    });
  }, []);

  return deviceInfo;
}