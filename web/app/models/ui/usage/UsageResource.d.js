/**
 * Detail row for a resource list item.
 *
 * @typedef {Object} UsageResourceDetailRow
 * @property {string} id
 * @property {string} [color]
 * @property {number} callCount
 * @property {string} [iconPath]
 * @property {{ href: string, target?: string }} [link]
 * @property {string} [name]
 * @property {number} share - Share percentage (0-100)
 * @property {string} type
 */

/**
 * Resource list item view model.
 *
 * @typedef {Object} UsageResourceItem
 * @property {string} [color]
 * @property {UsageResourceDetailRow[]} detailRows
 * @property {string} [icon]
 * @property {string} i18nTitle
 * @property {number} instanceCount
 * @property {string} resourceType
 * @property {number} totalCallCount
 */
