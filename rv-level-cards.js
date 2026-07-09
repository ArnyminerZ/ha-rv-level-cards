/**
 * RV Level Cards — bubble level + top-down chock view.
 *
 * Single self-contained file on purpose: no build step, no npm
 * dependencies, and no ES-module imports across files, so HACS only ever
 * has to fetch (and the browser only ever has to load) this one resource.
 * `ha-card`, `ha-icon` and `ha-form` (including its `device`/`text`/`media`
 * selector renderers) are already registered as custom elements by the
 * Home Assistant frontend itself.
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

  /**
   * A generic entity-based suggestion: any entity belonging to an RV Level
   * device suggests the whole card, wired to that device.
   */
  function suggestForDevice(hass, entityId, cardType) {
    const entry = hass?.entities?.[entityId];
    if (!entry || entry.platform !== DOMAIN || !entry.device_id) return null;
    return { config: { type: cardType, device_id: entry.device_id } };
  }

  /** True for `media-source://...` identifiers, which need resolving before they're a usable <img src>. */
  function isMediaSourceContentId(id) {
    return typeof id === "string" && id.startsWith("media-source://");
  }

  /**
   * Resolves the `image` selector's config value into a usable <img src>.
   * `image` can be: unset, a plain URL string (manual YAML, or values from
   * before this card supported the media picker), or a `{ media_content_id,
   * ... }` object (what the `media` selector — Home Assistant's own
   * upload-or-browse-a-media-source picker — writes to the config). Only
   * `media-source://` ids need a round trip to resolve to a real URL; plain
   * URLs (e.g. `/local/...`, `/api/image/serve/...`) are already usable.
   */
  async function resolveImageSrc(hass, image) {
    const contentId = (typeof image === "object" && image !== null ? image.media_content_id : image) || null;
    if (!contentId) return null;
    if (!isMediaSourceContentId(contentId)) return contentId;
    const result = await hass.callWS({ type: "media_source/resolve_media", media_content_id: contentId });
    return result.url;
  }

  // --------------------------------------------------------------------
  // Localization (English / Catalan / Spanish)
  // --------------------------------------------------------------------

  const STRINGS = {
    en: {
      device: "RV Level device",
      title: "Title",
      select_device: "Please select an RV Level device.",
      not_found: "RV Level device not found or not set up yet.",
      level: "Level",
      not_level: "Not level",
      not_levelable: "Not levelable",
      unavailable: "Unavailable",
      wheels_need_chock: (n) => `${n} wheel${n === 1 ? "" : "s"} need a chock`,
      needs_lift: (n) => `Needs ${n.toFixed(1)} cm lift`,
      image_label: "Top-down vehicle image",
      image_secondary: "Optional — leave empty to use the bundled generic van illustration.",
      bubble_card_name: "RV Level - Bubble level",
      bubble_card_desc: "A circular bubble-level indicator that moves with the RV Level device's pitch/roll and turns green when the vehicle is level.",
      topdown_card_name: "RV Level - Top-down chocks",
      topdown_card_desc: "A top-down view of your vehicle showing how tall a chock to place under each wheel, and whether the vehicle is level/levelable.",
      default_bubble_title: "Level",
      default_topdown_title: "RV Level",
    },
    ca: {
      device: "Dispositiu RV Level",
      title: "Títol",
      select_device: "Selecciona un dispositiu RV Level.",
      not_found: "No s'ha trobat el dispositiu RV Level o encara no està configurat.",
      level: "Anivellat",
      not_level: "No anivellat",
      not_levelable: "No es pot anivellar",
      unavailable: "No disponible",
      wheels_need_chock: (n) => (n === 1 ? "1 roda necessita falca" : `${n} rodes necessiten falca`),
      needs_lift: (n) => `Cal aixecar ${n.toFixed(1)} cm`,
      image_label: "Imatge del vehicle en planta",
      image_secondary: "Opcional: deixa-ho buit per utilitzar la il·lustració genèrica de furgoneta inclosa.",
      bubble_card_name: "RV Level - Nivell de bombolla",
      bubble_card_desc: "Un indicador circular de nivell de bombolla que es mou amb el cabeceig/balanceig del dispositiu RV Level i es torna verd quan el vehicle està anivellat.",
      topdown_card_name: "RV Level - Falques en planta",
      topdown_card_desc: "Una vista en planta del vehicle que mostra l'alçada de falca a col·locar a cada roda, i si el vehicle està anivellat o es pot anivellar.",
      default_bubble_title: "Nivell",
      default_topdown_title: "RV Level",
    },
    es: {
      device: "Dispositivo RV Level",
      title: "Título",
      select_device: "Selecciona un dispositivo RV Level.",
      not_found: "No se ha encontrado el dispositivo RV Level o aún no está configurado.",
      level: "Nivelado",
      not_level: "No nivelado",
      not_levelable: "No se puede nivelar",
      unavailable: "No disponible",
      wheels_need_chock: (n) => (n === 1 ? "1 rueda necesita calzo" : `${n} ruedas necesitan calzo`),
      needs_lift: (n) => `Necesita levantar ${n.toFixed(1)} cm`,
      image_label: "Imagen del vehículo en planta",
      image_secondary: "Opcional: déjalo vacío para usar la ilustración genérica de furgoneta incluida.",
      bubble_card_name: "RV Level - Nivel de burbuja",
      bubble_card_desc: "Un indicador circular de nivel de burbuja que se mueve con el cabeceo/balanceo del dispositivo RV Level y se pone verde cuando el vehículo está nivelado.",
      topdown_card_name: "RV Level - Calzos en planta",
      topdown_card_desc: "Una vista en planta del vehículo que muestra la altura de calzo a colocar en cada rueda, y si el vehículo está nivelado o se puede nivelar.",
      default_bubble_title: "Nivel",
      default_topdown_title: "RV Level",
    },
  };

  /**
   * Resolves the active language from `hass` (when available) or, failing
   * that, from the document itself — the HA frontend sets `<html lang>` to
   * the user's chosen language on boot, so this also covers call sites
   * (static `getConfigForm`, the `window.customCards` registration) that run
   * before/without a `hass` object at hand. Falls back to English.
   */
  function resolveLang(hass) {
    const raw =
      hass?.locale?.language ||
      hass?.language ||
      (typeof document !== "undefined" && document.documentElement.lang) ||
      (typeof navigator !== "undefined" && navigator.language) ||
      "en";
    const short = String(raw).toLowerCase().split("-")[0];
    return STRINGS[short] ? short : "en";
  }

  /** Translates `key`, optionally formatting it via extra args when it's a function string. */
  function t(hass, key, ...args) {
    const dict = STRINGS[resolveLang(hass)] || STRINGS.en;
    const value = dict[key] ?? STRINGS.en[key];
    return typeof value === "function" ? value(...args) : value;
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

  // Same selector shape Home Assistant's own Picture card/element editors use
  // for their "image" field: a picker that offers uploading a file straight
  // to the server *or* browsing any configured media source, not just a raw
  // URL/path text box.
  const IMAGE_SELECTOR_SCHEMA = {
    name: "image",
    selector: {
      media: {
        accept: ["image/*"],
        clearable: true,
        image_upload: true,
        hide_content_type: true,
      },
    },
  };

  /** Shared `computeLabel` logic for both cards' form fields. */
  function formFieldLabel(hass, schemaName) {
    if (schemaName === "device_id") return t(hass, "device");
    if (schemaName === "title") return t(hass, "title");
    if (schemaName === "image") return t(hass, "image_label");
    return schemaName;
  }

  /** Shared `computeHelper` logic for both cards' form fields. */
  function formFieldHelper(hass, schemaName) {
    if (schemaName === "image") return t(hass, "image_secondary");
    return undefined;
  }

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

  class RvLevelBubbleCard extends HTMLElement {
    setConfig(config) {
      if (!config?.device_id) {
        throw new Error(t(this._hass, "select_device"));
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
        computeLabel: (schema) => formFieldLabel(undefined, schema.name),
      };
    }

    static getStubConfig(hass) {
      return { device_id: firstRvLevelDeviceId(hass) ?? "", title: t(hass, "default_bubble_title") };
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
        this._status.textContent = t(this._hass, "not_found");
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

      this._status.textContent = isLevel ? t(this._hass, "level") : t(this._hass, "not_level");
    }
  }

  customElements.define("rv-level-bubble-card", RvLevelBubbleCard);

  // --------------------------------------------------------------------
  // Top-down chocks card
  // --------------------------------------------------------------------

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
        throw new Error(t(this._hass, "select_device"));
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

    static getConfigForm() {
      return {
        schema: [DEVICE_SELECTOR_SCHEMA, TITLE_SELECTOR_SCHEMA, IMAGE_SELECTOR_SCHEMA],
        computeLabel: (schema) => formFieldLabel(undefined, schema.name),
        computeHelper: (schema) => formFieldHelper(undefined, schema.name),
      };
    }

    static getStubConfig(hass) {
      return { device_id: firstRvLevelDeviceId(hass) ?? "", title: t(hass, "default_topdown_title") };
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

      const image = this._config.image;
      const artKey =
        (typeof image === "object" && image !== null ? image.media_content_id : image) || "__default__";
      if (this._artKey !== artKey) {
        this._artKey = artKey;
        if (artKey === "__default__") {
          this._art.innerHTML = DEFAULT_VAN_SVG;
        } else {
          // Resolving a media-source id is async; re-check `_artKey` when it
          // settles in case the config (or device) changed in the meantime.
          resolveImageSrc(this._hass, image).then((src) => {
            if (this._artKey !== artKey) return;
            this._art.innerHTML = src ? `<img src="${src}" alt="" />` : DEFAULT_VAN_SVG;
          });
        }
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
      el.title = liftState ? t(this._hass, "needs_lift", Number(liftState.state)) : "";
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
        value.textContent = t(this._hass, "unavailable");
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
        text = t(this._hass, "level");
        iconName = "mdi:thumb-up";
        cls = "good";
      } else if (!isLevelable) {
        text = t(this._hass, "not_levelable");
        iconName = "mdi:close-octagon";
        cls = "bad";
      } else {
        text = t(this._hass, "not_level");
        iconName = "mdi:thumb-down";
        cls = "warn";
      }

      icon.icon = iconName;
      value.textContent = text;
      el.className = `tile center ${cls}`;
      sub.textContent = wheelsState ? t(this._hass, "wheels_need_chock", Number(wheelsState.state)) : "";
    }
  }

  customElements.define("rv-level-topdown-card", RvLevelTopdownCard);

  // --------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------

  window.customCards = window.customCards || [];
  window.customCards.push(
    {
      type: "rv-level-bubble-card",
      name: t(undefined, "bubble_card_name"),
      description: t(undefined, "bubble_card_desc"),
      preview: true,
      documentationURL: DOCS_URL,
      getEntitySuggestion: (hass, entityId) => suggestForDevice(hass, entityId, "custom:rv-level-bubble-card"),
    },
    {
      type: "rv-level-topdown-card",
      name: t(undefined, "topdown_card_name"),
      description: t(undefined, "topdown_card_desc"),
      preview: true,
      documentationURL: DOCS_URL,
      getEntitySuggestion: (hass, entityId) => suggestForDevice(hass, entityId, "custom:rv-level-topdown-card"),
    }
  );

  // eslint-disable-next-line no-console
  console.info("%c RV-LEVEL-CARDS %c loaded ", "color: white; background: #2ecc71; font-weight: 700;", "color: #2ecc71; background: transparent;");
})();
