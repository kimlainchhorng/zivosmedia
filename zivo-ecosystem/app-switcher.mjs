// @ts-check
/**
 * ZIVO Ecosystem — App Switcher / Global Navigation Access Model (v1)
 *
 * Pure access model: given a user's product grants, decide which products the
 * switcher shows. Shows ONLY products the user can access; Admin appears only
 * when explicitly authorized. Dependency-free.
 */

import { PRODUCTS } from './identity.mjs';

/** Display metadata (EN/KM) for each product. */
export const PRODUCT_META = Object.freeze({
  wallet:   { en: 'Wallet',   km: 'កាបូប' },
  driver:   { en: 'Driver',   km: 'អ្នកបើកបរ' },
  travel:   { en: 'Travel',   km: 'ការធ្វើដំណើរ' },
  software: { en: 'Business', km: 'អាជីវកម្ម' },
  chat:     { en: 'Chat',     km: 'ជជែក' },
  media:    { en: 'Media',    km: 'មេឌៀ' },
  admin:    { en: 'Admin',    km: 'អ្នកគ្រប់គ្រង' },
});

/**
 * @typedef {Object} ProductGrant
 * @property {boolean} accessible  server-confirmed the user may open this product
 * @property {string[]} [roles]    canonical ZivoRole[] the user holds there
 */

/**
 * Compute the switcher entries. Never infers access from email or from a
 * product-local session — only from server-provided grants.
 * @param {Partial<Record<import('./identity.mjs').Product, ProductGrant>>} grants
 * @returns {{product: import('./identity.mjs').Product, en: string, km: string}[]}
 */
export function visibleProducts(grants) {
  const g = grants || {};
  return PRODUCTS.filter((p) => {
    const grant = g[p];
    if (!grant || grant.accessible !== true) return false;
    if (p === 'admin') {
      // Admin is shown ONLY when the user holds an admin/staff role there.
      const roles = grant.roles || [];
      return roles.includes('admin') || roles.includes('staff');
    }
    return true;
  }).map((p) => ({ product: p, en: PRODUCT_META[p].en, km: PRODUCT_META[p].km }));
}

/**
 * Whether a switch into `target` is permitted for this user (used to gate the
 * deep-link handoff before it is even offered).
 * @param {Partial<Record<import('./identity.mjs').Product, ProductGrant>>} grants
 * @param {import('./identity.mjs').Product} target
 * @returns {boolean}
 */
export function canSwitchTo(grants, target) {
  return visibleProducts(grants).some((e) => e.product === target);
}
