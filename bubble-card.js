import {
  resolveDeviceEntities,
  firstRvLevelDeviceId,
  suggestForDevice,
  DEVICE_SELECTOR_SCHEMA,
  TITLE_SELECTOR_SCHEMA,
} from "./shared.js";

const DEFAULT_TITLE = "Level";

const FORM_LABELS = {
  device_id: "RV Level device",
  title: "Title",
};

class RvLevelBubbleCard extends HTMLElement {
  setConfig(config) {
    if (!config?.device_id) {
      throw new Error("Please select an RV Level device.");
    }
    this._config = config;
    this._built = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    this._update();
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { rows: 4, columns: 6, min_rows: 3, min_columns: 4 };
  }

  static getConfigForm() {
    return {
      schema: [DEVICE_SELECTOR_SCHEMA, TITLE_SELECTOR_SCHEMA],
      computeLabel: (schema) => FORM_LABELS[schema.name] ?? schema.name,
    };
  }

  static getStubConfig(hass) {
    return { device_id: firstRvLevelDeviceId(hass) ?? "", title: DEFAULT_TITLE };
  }

  _build() {
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding-bottom: 8px; }
        .wrap { display: flex; flex-direction: column; align-items: center; padding: 0 16px 8px; }
        .dial {
          position: relative;
          width: 220px;
          height: 220px;
          margin: 8px auto;
          border-radius: 50%;
          background: radial-gradient(circle, var(--card-background-color, #fff) 0%, var(--secondary-background-color, #eceff1) 100%);
          border: 2px solid var(--divider-color, #888);
          box-sizing: border-box;
        }
        .axis-x, .axis-y { position: absolute; background: var(--divider-color, #888); opacity: 0.5; }
        .axis-x { left: 50%; top: 14px; bottom: 14px; width: 1px; }
        .axis-y { top: 50%; left: 14px; right: 14px; height: 1px; }
        .zone {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          border: 1.5px dashed var(--success-color, #2ecc71);
          border-radius: 50%;
        }
        .bubble {
          position: absolute;
          width: 26px; height: 26px;
          border-radius: 50%;
          border: 1.5px solid var(--card-background-color, #1b1b1b);
          opacity: 0.9;
          transition: left 0.2s ease, top 0.2s ease, background 0.2s ease;
        }
        .status { font-size: var(--ha-font-size-l, 1rem); color: var(--secondary-text-color); text-align: center; }
      </style>
      <ha-card>
        <div class="wrap">
          <div class="dial">
            <div class="axis-x"></div>
            <div class="axis-y"></div>
            <div class="zone"></div>
            <div class="bubble"></div>
          </div>
          <div class="status"></div>
        </div>
      </ha-card>
    `;
    this._card = this.shadowRoot.querySelector("ha-card");
    this._zone = this.shadowRoot.querySelector(".zone");
    this._bubble = this.shadowRoot.querySelector(".bubble");
    this._status = this.shadowRoot.querySelector(".status");
    this._built = true;
  }

  _update() {
    if (!this._hass || !this._config || !this._built) return;

    this._card.header = this._config.title || DEFAULT_TITLE;

    const entities = resolveDeviceEntities(this._hass, this._config.device_id);
    const bubbleState = entities.bubble_position && this._hass.states[entities.bubble_position];

    if (!bubbleState) {
      this._bubble.style.display = "none";
      this._zone.style.display = "none";
      this._status.textContent = "RV Level device not found or not set up yet.";
      return;
    }

    this._bubble.style.display = "";
    this._zone.style.display = "";

    const attrs = bubbleState.attributes;
    const x = Number(attrs.x ?? 0);
    const y = Number(attrs.y ?? 0);
    const pitchMargin = Number(attrs.pitch_margin ?? 1.5);
    const rollMargin = Number(attrs.roll_margin ?? 1.5);
    const maxAngle = Number(attrs.bubble_max_angle ?? 6.0) || 6.0;

    const levelState = entities.level && this._hass.states[entities.level];
    const isLevel = levelState?.state === "on";

    // Same px-per-degree scale for the bubble and the dashed "level zone" so
    // the zone boundary is exactly where the vehicle stops being level.
    const left = 97 + x * 90;
    const top = 97 + y * 90;
    const zoneW = (rollMargin / maxAngle) * 180;
    const zoneH = (pitchMargin / maxAngle) * 180;

    this._bubble.style.left = `${left}px`;
    this._bubble.style.top = `${top}px`;
    this._bubble.style.background = isLevel
      ? "var(--success-color, #2ecc71)"
      : "var(--error-color, #e74c3c)";
    this._zone.style.width = `${zoneW}px`;
    this._zone.style.height = `${zoneH}px`;

    this._status.textContent = isLevel ? "Level" : "Not level";
  }
}

customElements.define("rv-level-bubble-card", RvLevelBubbleCard);

export function getEntitySuggestion(hass, entityId) {
  return suggestForDevice(hass, entityId, "custom:rv-level-bubble-card");
}
