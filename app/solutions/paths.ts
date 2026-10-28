/**
 * URL paths of the commercial "solution" pages. Kept apart from solutions.ts
 * (the page copy) so client code such as ClientLayout can import the list
 * without pulling every page's text into the browser bundle.
 */
export const SOLUTION_PATHS = [
  '/hotspot-billing-system-kenya',
  '/pppoe-billing-system-kenya',
  '/mpesa-wifi-billing-kenya',
  '/wifi-billing-system-kenya',
] as const;

export type SolutionPath = (typeof SOLUTION_PATHS)[number];
