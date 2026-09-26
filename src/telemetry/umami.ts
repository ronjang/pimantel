const UMAMI_WEBSITE_ID = process.env.REACT_APP_UMAMI_WEBSITE_ID;
const UMAMI_SCRIPT_URL = process.env.REACT_APP_UMAMI_SCRIPT_URL;
const UMAMI_DOMAINS = process.env.REACT_APP_UMAMI_DOMAINS;

type UmamiEventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: UmamiEventData) => void;
    };
  }
}

function hasUsableValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function initUmamiTelemetry(): void {
  if (!hasUsableValue(UMAMI_WEBSITE_ID) || !hasUsableValue(UMAMI_SCRIPT_URL)) {
    return;
  }

  if (document.querySelector('script[data-website-id]')) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.src = UMAMI_SCRIPT_URL;
  script.setAttribute("data-website-id", UMAMI_WEBSITE_ID);
  if (hasUsableValue(UMAMI_DOMAINS)) {
    // Only record visits on these hostnames (skips localhost and forks).
    script.setAttribute("data-domains", UMAMI_DOMAINS);
  }
  document.head.appendChild(script);
}

export function trackEvent(eventName: string, eventData?: UmamiEventData): void {
  try {
    window.umami?.track(eventName, eventData);
  } catch {
    // Telemetry must never break the game.
  }
}
