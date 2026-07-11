const UMAMI_WEBSITE_ID = process.env.REACT_APP_UMAMI_WEBSITE_ID;
const UMAMI_SCRIPT_URL = process.env.REACT_APP_UMAMI_SCRIPT_URL;

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
  document.head.appendChild(script);
}
