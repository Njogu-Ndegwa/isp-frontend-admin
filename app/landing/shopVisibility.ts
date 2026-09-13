/**
 * The equipment shop is built but not operating yet, so its entry points are
 * hidden from the public landing page — a visitor who adds a router to a cart
 * that nobody fulfils is worse than one who never saw the shop.
 *
 * The `/store` routes themselves stay reachable by direct URL on purpose:
 * existing links and bookmarks keep working rather than 404ing, and with no
 * links pointing at them they drop out of sight on their own.
 *
 * Flip this to true when the shop can actually take orders.
 */
export const SHOP_VISIBLE_ON_LANDING = false;
