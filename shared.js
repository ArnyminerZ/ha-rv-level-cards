/**
 * Shared helpers used by every RV Level card.
 *
 * There are no build tools and no npm dependencies here on purpose: this
 * file (and the rest of the repo) is loaded by the browser as a plain ES
 * module, exactly as HACS/Home Assistant serve it. `ha-card`, `ha-icon`,
 * `ha-form` and `ha-picture-upload` are already registered as custom
 * elements by the Home Assistant frontend itself, so we can use them
 * directly with no imports at all.
 */

export const DOMAIN = "rv_level";

// Fixed suffixes of the entity IDs created by the RV Level integration
// (see custom_components/rv_level/{sensor,binary_sensor}.py). The device
// name / entity_id prefix can be renamed by the user, but `_attr_name` for
// each of these is not expected to change, so matching on the trailing
// slug is stable enough to resolve "sibling" entities of a device without
// requiring the user to pick eight sensors by hand.
const ENTITY_SUFFIXES = [
  "front_left_lift",
  "front_right_lift",
  "rear_left_lift",
  "rear_right_lift",
  "front_left_chock",
  "front_right_chock",
  "rear_left_chock",
  "rear_right_chock",
  "wheels_to_lift",
  "bubble_position",
  "levelable",
  "level",
];

/**
 * Given a device_id, return a { suffix: entity_id } map of every RV Level
 * entity that belongs to it, e.g. { bubble_position: "sensor.rv_level_bubble_position", ... }.
 */
export function resolveDeviceEntities(hass, deviceId) {
  const map = {};
  if (!deviceId || !hass?.entities) return map;
  for (const [entityId, entry] of Object.entries(hass.entities)) {
    if (entry.device_id !== deviceId || entry.platform !== DOMAIN) continue;
    const suffix = ENTITY_SUFFIXES.find((s) => entityId.endsWith(`_${s}`));
    if (suffix) map[suffix] = entityId;
  }
  return map;
}

/** Finds the device_id of the first RV Level device known to `hass`, if any. */
export function firstRvLevelDeviceId(hass) {
  const entry = Object.values(hass?.entities || {}).find((e) => e.platform === DOMAIN);
  return entry?.device_id;
}

/** Home Assistant's own dom-event helper, reimplemented to avoid a frontend import. */
export function fireEvent(node, type, detail = {}, options = {}) {
  const event = new CustomEvent(type, {
    bubbles: options.bubbles ?? true,
    cancelable: Boolean(options.cancelable),
    composed: options.composed ?? true,
    detail,
  });
  node.dispatchEvent(event);
  return event;
}

/**
 * A generic entity-based suggestion: any entity belonging to an RV Level
 * device suggests the whole card, wired to that device.
 */
export function suggestForDevice(hass, entityId, cardType) {
  const entry = hass?.entities?.[entityId];
  if (!entry || entry.platform !== DOMAIN || !entry.device_id) return null;
  return { config: { type: cardType, device_id: entry.device_id } };
}

export const DEVICE_SELECTOR_SCHEMA = {
  name: "device_id",
  required: true,
  selector: { device: { filter: { integration: DOMAIN } } },
};

export const TITLE_SELECTOR_SCHEMA = {
  name: "title",
  selector: { text: {} },
};

/** A generic, top-down van/RV outline used when no custom image is configured. */
export const DEFAULT_VAN_SVG = `
<svg viewBox="0 0 300 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <rect x="55" y="15" width="190" height="570" rx="46" ry="46"
        fill="var(--rv-level-body-color, var(--secondary-background-color, #cfd8dc))"
        stroke="var(--rv-level-outline-color, var(--divider-color, #90a4ae))" stroke-width="4" />
  <rect x="85" y="45" width="130" height="70" rx="14"
        fill="var(--rv-level-glass-color, #90caf9)" opacity="0.55" />
  <rect x="95" y="520" width="110" height="40" rx="10"
        fill="var(--rv-level-glass-color, #90caf9)" opacity="0.4" />
  <line x1="150" y1="130" x2="150" y2="500"
        stroke="var(--rv-level-outline-color, var(--divider-color, #90a4ae))"
        stroke-width="2" stroke-dasharray="10 10" opacity="0.6" />
  <rect x="30" y="120" width="34" height="90" rx="12" fill="var(--rv-level-outline-color, #607d8b)" />
  <rect x="236" y="120" width="34" height="90" rx="12" fill="var(--rv-level-outline-color, #607d8b)" />
  <rect x="30" y="400" width="34" height="90" rx="12" fill="var(--rv-level-outline-color, #607d8b)" />
  <rect x="236" y="400" width="34" height="90" rx="12" fill="var(--rv-level-outline-color, #607d8b)" />
</svg>`;
