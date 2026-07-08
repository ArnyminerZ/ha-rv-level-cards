/**
 * RV Level Cards — bubble level + top-down chock view.
 *
 * Single self-contained file on purpose: no build step, no npm
 * dependencies, and no ES-module imports across files, so HACS only ever
 * has to fetch (and the browser only ever has to load) this one resource.
 * `ha-card`, `ha-icon`, `ha-form` and `ha-picture-upload` are already
 * registered as custom elements by the Home Assistant frontend itself.
 */
(() => {
  const DOMAIN = "rv_level";
  const DOCS_URL = "https://github.com/ArnyminerZ/ha-rv-level-cards";

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
  function resolveDeviceEntities(hass, deviceId) {
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
  function firstRvLevelDeviceId(hass) {
    const entry = Object.values(hass?.entities || {}).find((e) => e.platform === DOMAIN);
    return entry?.device_id;
  }

  /** Home Assistant's own dom-event helper, reimplemented to avoid a frontend import. */
  function fireEvent(node, type, detail = {}, options = {}) {
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
  function suggestForDevice(hass, entityId, cardType) {
    const entry = hass?.entities?.[entityId];
    if (!entry || entry.platform !== DOMAIN || !entry.device_id) return null;
    return { config: { type: cardType, device_id: entry.device_id } };
  }

  const DEVICE_SELECTOR_SCHEMA = {
    name: "device_id",
    required: true,
    selector: { device: { filter: { integration: DOMAIN } } },
  };

  const TITLE_SELECTOR_SCHEMA = {
    name: "title",
    selector: { text: {} },
  };

  /** A generic, top-down van/RV outline used when no custom image is configured. */
  const DEFAULT_VAN_SVG = `
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

  // --------------------------------------------------------------------
  // Bubble level card
  // --------------------------------------------------------------------

  const BUBBLE_DEFAULT_TITLE = "Level";

  const BUBBLE_FORM_LABELS = {
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
        computeLabel: (schema) => BUBBLE_FORM_LABELS[schema.name] ?? schema.name,
      };
    }

    static getStubConfig(hass) {
      return { device_id: firstRvLevelDeviceId(hass) ?? "", title: BUBBLE_DEFAULT_TITLE };
    }

    _build() {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          /* Fills whatever height the layout gives this card (e.g. the fixed
             row-height cell of the Sections dashboard view). In the Masonry
             view no ancestor has a definite height, so this simply computes
             to "auto" and the card just sizes to its content, as before. */
          :host { display: block; height: 100%; box-sizing: border-box; }
          ha-card {
            height: 100%;
            box-sizing: border-box;
            overflow: hidden;
          }
          .wrap {
            height: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            padding: 0 16px 8px;
          }
          .title {
            flex: none;
            padding: 16px 0 0;
            font-size: 1.25rem;
            font-weight: 500;
            line-height: 1.2;
            color: var(--ha-card-header-color, var(--primary-text-color));
          }
          .content {
            flex: 1;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .dial {
            position: relative;
            height: 100%;
            width: auto;
            max-width: min(220px, 100%);
            aspect-ratio: 1 / 1;
            border-radius: 50%;
            background: radial-gradient(circle, var(--card-background-color, #fff) 0%, var(--secondary-background-color, #eceff1) 100%);
            border: 2px solid var(--divider-color, #888);
            box-sizing: border-box;
          }
          .axis-x, .axis-y { position: absolute; background: var(--divider-color, #888); opacity: 0.5; }
          .axis-x { left: 50%; top: 8%; bottom: 8%; width: 1px; }
          .axis-y { top: 50%; left: 8%; right: 8%; height: 1px; }
          .zone {
            position: absolute; left: 50%; top: 50%;
            transform: translate(-50%, -50%);
            border: 1.5px dashed var(--success-color, #2ecc71);
            border-radius: 50%;
          }
          .bubble {
            position: absolute;
            width: 12%; height: 12%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            border: 1.5px solid var(--card-background-color, #1b1b1b);
            opacity: 0.9;
            transition: left 0.2s ease, top 0.2s ease, background 0.2s ease;
          }
          .status {
            flex: none;
            font-size: var(--ha-font-size-l, 1rem);
            color: var(--secondary-text-color);
            text-align: center;
          }
        </style>
        <ha-card>
          <div class="wrap">
            <div class="title"></div>
            <div class="content">
              <div class="dial">
                <div class="axis-x"></div>
                <div class="axis-y"></div>
                <div class="zone"></div>
                <div class="bubble"></div>
              </div>
            </div>
            <div class="status"></div>
          </div>
        </ha-card>
      `;
      this._title = this.shadowRoot.querySelector(".title");
      this._zone = this.shadowRoot.querySelector(".zone");
      this._bubble = this.shadowRoot.querySelector(".bubble");
      this._status = this.shadowRoot.querySelector(".status");
      this._built = true;
    }

    _update() {
      if (!this._hass || !this._config || !this._built) return;

      const title = this._config.title || "";
      this._title.textContent = title;
      this._title.style.display = title ? "" : "none";

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

      // Positions/sizes are all in % of the dial's own box (not fixed px),
      // so the dial stays inside the card regardless of how narrow the
      // column is (e.g. the Sections dashboard view). Same scale is used
      // for the bubble and the dashed "level zone" so the zone boundary is
      // exactly where the vehicle stops being level.
      const leftPct = 50 + x * 41;
      const topPct = 50 + y * 41;
      const zoneWPct = (rollMargin / maxAngle) * 82;
      const zoneHPct = (pitchMargin / maxAngle) * 82;

      this._bubble.style.left = `${leftPct}%`;
      this._bubble.style.top = `${topPct}%`;
      this._bubble.style.background = isLevel
        ? "var(--success-color, #2ecc71)"
        : "var(--error-color, #e74c3c)";
      this._zone.style.width = `${zoneWPct}%`;
      this._zone.style.height = `${zoneHPct}%`;

      this._status.textContent = isLevel ? "Level" : "Not level";
    }
  }

  customElements.define("rv-level-bubble-card", RvLevelBubbleCard);

  // --------------------------------------------------------------------
  // Top-down chocks card
  // --------------------------------------------------------------------

  const TOPDOWN_DEFAULT_TITLE = "RV Level";

  const CORNERS = ["front_left", "front_right", "rear_left", "rear_right"];
  const CORNER_POSITION = {
    front_left: { top: "20%", left: "26%" },
    front_right: { top: "20%", left: "74%" },
    rear_left: { top: "80%", left: "26%" },
    rear_right: { top: "80%", left: "74%" },
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
      return { device_id: firstRvLevelDeviceId(hass) ?? "", title: TOPDOWN_DEFAULT_TITLE };
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
          /* Fills whatever height the layout gives this card (e.g. the fixed
             row-height cell of the Sections dashboard view). In the Masonry
             view no ancestor has a definite height, so this simply computes
             to "auto" and the card just sizes to its content, as before. */
          :host { display: block; height: 100%; box-sizing: border-box; }
          ha-card { height: 100%; box-sizing: border-box; overflow: hidden; }
          .wrap {
            height: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            padding: 0 16px 8px;
          }
          .title {
            flex: none;
            padding: 16px 0 0;
            font-size: 1.25rem;
            font-weight: 500;
            line-height: 1.2;
            color: var(--ha-card-header-color, var(--primary-text-color));
          }
          .content {
            flex: 1;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .plan {
            position: relative;
            height: 100%;
            width: auto;
            max-width: min(320px, 100%);
            aspect-ratio: 1 / 2;
            overflow: hidden;
            box-sizing: border-box;
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
            max-width: 40%;
            box-sizing: border-box;
            padding: 4px 6px;
            border-radius: var(--ha-border-radius-md, 8px);
            background: var(--card-background-color, #fff);
            border: 1px solid var(--divider-color, #ddd);
            box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,0.2));
            font-size: 0.8rem;
            color: var(--primary-text-color);
            text-align: center;
          }
          .tile .value, .tile .sub {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .tile.corner.active ha-icon { color: var(--info-color, #2196f3); }
          .tile.corner ha-icon { color: var(--disabled-text-color, #9e9e9e); }
          .tile.center.good ha-icon { color: var(--success-color, #2ecc71); }
          .tile.center.warn ha-icon { color: var(--warning-color, #e78400); }
          .tile.center.bad ha-icon { color: var(--error-color, #e74c3c); }
          .tile .sub { font-size: 0.7rem; color: var(--secondary-text-color); }
        </style>
        <ha-card>
          <div class="wrap">
            <div class="title"></div>
            <div class="content">
              <div class="plan">
                <div class="art"></div>
                ${cornerTiles}
                <div class="tile center" data-corner="center" style="top:50%;left:50%;">
                  <ha-icon></ha-icon>
                  <div class="value"></div>
                  <div class="sub"></div>
                </div>
              </div>
            </div>
          </div>
        </ha-card>
      `;
      this._title = this.shadowRoot.querySelector(".title");
      this._art = this.shadowRoot.querySelector(".art");
      this._cornerEls = Object.fromEntries(
        CORNERS.map((c) => [c, this.shadowRoot.querySelector(`.tile[data-corner="${c}"]`)])
      );
      this._centerEl = this.shadowRoot.querySelector('.tile[data-corner="center"]');
      this._built = true;
    }

    _update() {
      if (!this._hass || !this._config || !this._built) return;

      const title = this._config.title || "";
      this._title.textContent = title;
      this._title.style.display = title ? "" : "none";

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

  const TOPDOWN_EDITOR_LABELS = {
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
      // Build the child elements only once both `hass` and `config` are
      // known. `ha-form`/`ha-picture-upload` read `this.hass` during their
      // very first render, so connecting them to the DOM before `hass` is
      // set makes them throw and get stuck blank instead of showing the
      // device picker / upload widget.
      if (!this._hass || !this._config) return;

      if (!this.shadowRoot) {
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `<style>ha-picture-upload { display: block; margin-top: 16px; }</style>`;

        this._form = document.createElement("ha-form");
        this._form.schema = [DEVICE_SELECTOR_SCHEMA, TITLE_SELECTOR_SCHEMA];
        this._form.computeLabel = (schema) => TOPDOWN_EDITOR_LABELS[schema.name] ?? schema.name;
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

      this._form.hass = this._hass;
      this._form.data = this._config;
      this._upload.hass = this._hass;
      this._upload.value = this._config.image ?? null;
    }
  }

  customElements.define("rv-level-topdown-card-editor", RvLevelTopdownCardEditor);

  // --------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------

  window.customCards = window.customCards || [];
  window.customCards.push(
    {
      type: "rv-level-bubble-card",
      name: "RV Level - Bubble level",
      description: "A circular bubble-level indicator that moves with the RV Level device's pitch/roll and turns green when the vehicle is level.",
      preview: true,
      documentationURL: DOCS_URL,
      getEntitySuggestion: (hass, entityId) => suggestForDevice(hass, entityId, "custom:rv-level-bubble-card"),
    },
    {
      type: "rv-level-topdown-card",
      name: "RV Level - Top-down chocks",
      description: "A top-down view of your vehicle showing how tall a chock to place under each wheel, and whether the vehicle is level/levelable.",
      preview: true,
      documentationURL: DOCS_URL,
      getEntitySuggestion: (hass, entityId) => suggestForDevice(hass, entityId, "custom:rv-level-topdown-card"),
    }
  );

  // eslint-disable-next-line no-console
  console.info("%c RV-LEVEL-CARDS %c loaded ", "color: white; background: #2ecc71; font-weight: 700;", "color: #2ecc71; background: transparent;");
})();
