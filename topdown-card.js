import {
  resolveDeviceEntities,
  firstRvLevelDeviceId,
  suggestForDevice,
  fireEvent,
  DEFAULT_VAN_SVG,
  DEVICE_SELECTOR_SCHEMA,
  TITLE_SELECTOR_SCHEMA,
} from "./shared.js";

const DEFAULT_TITLE = "RV Level";

const CORNERS = ["front_left", "front_right", "rear_left", "rear_right"];
const CORNER_POSITION = {
  front_left: { top: "18%", left: "16%" },
  front_right: { top: "18%", left: "84%" },
  rear_left: { top: "82%", left: "16%" },
  rear_right: { top: "82%", left: "84%" },
};

function chockIcon(chockIndex) {
  if (chockIndex >= 3) return "mdi:chevron-triple-up";
  if (chockIndex === 2) return "mdi:chevron-double-up";
  if (chockIndex === 1) return "mdi:chevron-up";
  return "mdi:circle-outline";
}

class RvLevelTopdownCard extends HTMLElement {
  setConfig(config) {
    if (!config?.device_id) {
      throw new Error("Please select an RV Level device.");
    }
    this._config = config;
    this._built = false;
    this._artKey = undefined;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    this._update();
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { rows: 6, columns: 6, min_rows: 5, min_columns: 4 };
  }

  static getConfigElement() {
    return document.createElement("rv-level-topdown-card-editor");
  }

  static getStubConfig(hass) {
    return { device_id: firstRvLevelDeviceId(hass) ?? "", title: DEFAULT_TITLE };
  }

  _build() {
    this.attachShadow({ mode: "open" });
    const cornerTiles = CORNERS.map((corner) => {
      const pos = CORNER_POSITION[corner];
      return `<div class="tile corner" data-corner="${corner}" style="top:${pos.top};left:${pos.left};">
        <ha-icon></ha-icon>
        <div class="value"></div>
      </div>`;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        .plan {
          position: relative;
          width: 100%;
          max-width: 320px;
          aspect-ratio: 1 / 2;
          margin: 8px auto 16px;
        }
        .art { position: absolute; inset: 0; }
        .art svg, .art img { width: 100%; height: 100%; object-fit: contain; }
        .tile {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-width: 64px;
          padding: 6px 8px;
          border-radius: var(--ha-border-radius-md, 8px);
          background: var(--card-background-color, #fff);
          border: 1px solid var(--divider-color, #ddd);
          box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,0.2));
          font-size: 0.85rem;
          color: var(--primary-text-color);
          text-align: center;
        }
        .tile.corner.active ha-icon { color: var(--info-color, #2196f3); }
        .tile.corner ha-icon { color: var(--disabled-text-color, #9e9e9e); }
        .tile.center { min-width: 96px; }
        .tile.center.good ha-icon { color: var(--success-color, #2ecc71); }
        .tile.center.warn ha-icon { color: var(--warning-color, #e78400); }
        .tile.center.bad ha-icon { color: var(--error-color, #e74c3c); }
        .tile .sub { font-size: 0.7rem; color: var(--secondary-text-color); }
      </style>
      <ha-card>
        <div class="plan">
          <div class="art"></div>
          ${cornerTiles}
          <div class="tile center" data-corner="center" style="top:50%;left:50%;">
            <ha-icon></ha-icon>
            <div class="value"></div>
            <div class="sub"></div>
          </div>
        </div>
      </ha-card>
    `;
    this._card = this.shadowRoot.querySelector("ha-card");
    this._art = this.shadowRoot.querySelector(".art");
    this._cornerEls = Object.fromEntries(
      CORNERS.map((c) => [c, this.shadowRoot.querySelector(`.tile[data-corner="${c}"]`)])
    );
    this._centerEl = this.shadowRoot.querySelector('.tile[data-corner="center"]');
    this._built = true;
  }

  _update() {
    if (!this._hass || !this._config || !this._built) return;

    this._card.header = this._config.title || DEFAULT_TITLE;

    const artKey = this._config.image || "__default__";
    if (this._artKey !== artKey) {
      this._art.innerHTML =
        artKey === "__default__" ? DEFAULT_VAN_SVG : `<img src="${this._config.image}" alt="" />`;
      this._artKey = artKey;
    }

    const entities = resolveDeviceEntities(this._hass, this._config.device_id);
    for (const corner of CORNERS) this._renderCorner(corner, entities);
    this._renderCenter(entities);
  }

  _renderCorner(corner, entities) {
    const el = this._cornerEls[corner];
    const icon = el.querySelector("ha-icon");
    const value = el.querySelector(".value");

    const chockId = entities[`${corner}_chock`];
    const chockState = chockId && this._hass.states[chockId];

    if (!chockState) {
      icon.icon = "mdi:help-circle-outline";
      value.textContent = "—";
      el.classList.remove("active");
      el.title = "";
      return;
    }

    const chockIndex = Number(chockState.attributes.chock_index ?? 0);
    const height = Number(chockState.state) || 0;

    icon.icon = chockIcon(chockIndex);
    value.textContent = `${height.toFixed(1)} cm`;
    el.classList.toggle("active", chockIndex > 0);

    const liftId = entities[`${corner}_lift`];
    const liftState = liftId && this._hass.states[liftId];
    el.title = liftState ? `Needs ${Number(liftState.state).toFixed(1)} cm lift` : "";
  }

  _renderCenter(entities) {
    const el = this._centerEl;
    const icon = el.querySelector("ha-icon");
    const value = el.querySelector(".value");
    const sub = el.querySelector(".sub");

    const levelState = entities.level && this._hass.states[entities.level];
    const levelableState = entities.levelable && this._hass.states[entities.levelable];
    const wheelsState = entities.wheels_to_lift && this._hass.states[entities.wheels_to_lift];

    if (!levelState) {
      icon.icon = "mdi:help-circle-outline";
      value.textContent = "Unavailable";
      sub.textContent = "";
      el.className = "tile center";
      return;
    }

    const isLevel = levelState.state === "on";
    const isLevelable = levelableState ? levelableState.state === "on" : true;

    let text;
    let iconName;
    let cls;
    if (isLevel) {
      text = "Level";
      iconName = "mdi:thumb-up";
      cls = "good";
    } else if (!isLevelable) {
      text = "Not levelable";
      iconName = "mdi:close-octagon";
      cls = "bad";
    } else {
      text = "Not level";
      iconName = "mdi:thumb-down";
      cls = "warn";
    }

    icon.icon = iconName;
    value.textContent = text;
    el.className = `tile center ${cls}`;
    sub.textContent = wheelsState
      ? `${wheelsState.state} wheel${wheelsState.state === "1" ? "" : "s"} need a chock`
      : "";
  }
}

customElements.define("rv-level-topdown-card", RvLevelTopdownCard);

const EDITOR_LABELS = {
  device_id: "RV Level device",
  title: "Title",
};

class RvLevelTopdownCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>ha-picture-upload { display: block; margin-top: 16px; }</style>`;

      this._form = document.createElement("ha-form");
      this._form.schema = [DEVICE_SELECTOR_SCHEMA, TITLE_SELECTOR_SCHEMA];
      this._form.computeLabel = (schema) => EDITOR_LABELS[schema.name] ?? schema.name;
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._config = { ...this._config, ...ev.detail.value };
        fireEvent(this, "config-changed", { config: this._config });
      });

      this._upload = document.createElement("ha-picture-upload");
      this._upload.label = "Top-down vehicle image";
      this._upload.secondary = "Optional — leave empty to use the bundled generic van illustration.";
      this._upload.addEventListener("change", (ev) => {
        const value = ev.target.value || undefined;
        this._config = { ...this._config, image: value };
        fireEvent(this, "config-changed", { config: this._config });
      });

      this.shadowRoot.append(this._form, this._upload);
    }

    if (!this._hass || !this._config) return;

    this._form.hass = this._hass;
    this._form.data = this._config;
    this._upload.hass = this._hass;
    this._upload.value = this._config.image ?? null;
  }
}

customElements.define("rv-level-topdown-card-editor", RvLevelTopdownCardEditor);

export function getEntitySuggestion(hass, entityId) {
  return suggestForDevice(hass, entityId, "custom:rv-level-topdown-card");
}
