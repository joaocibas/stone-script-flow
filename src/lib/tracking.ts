declare global {
  interface Window {
    dataLayer: Record<string, any>[];
  }
}

/**
 * Push a custom event to the GTM data layer.
 * Works whether GTM is loaded or not (events queue in dataLayer).
 */
export const trackEvent = (
  event: string,
  params?: Record<string, any>
) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
};
