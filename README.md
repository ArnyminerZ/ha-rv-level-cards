# RV Level Cards

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![Validate](https://github.com/ArnyminerZ/ha-rv-level-cards/actions/workflows/validate.yaml/badge.svg)](https://github.com/ArnyminerZ/ha-rv-level-cards/actions/workflows/validate.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Two Lovelace cards for the [RV Level](https://github.com/arnyminerz/ha-rv-level)
integration: a bubble-level indicator, and a top-down view of your vehicle
showing which chock to use at each wheel. Both are plain, dependency-free
custom elements — no Mushroom, no `html-card`, no build step, just this
repository's JS files served straight to the browser.

> [!IMPORTANT]
> **This entire repository — both cards, their UI editors, and this
> documentation — was generated with the help of an AI coding assistant
> (Claude, by Anthropic), as a companion to the [RV Level](https://github.com/arnyminerz/ha-rv-level)
> integration.** It has been reviewed, but as with any AI-assisted project,
> please review the code yourself before trusting it with your dashboard.

## Installation

### HACS (recommended)

Not yet in the default HACS store, so add it as a custom repository:

1. HACS -> the "..." menu (top right) -> **Custom repositories**.
2. Repository: `https://github.com/ArnyminerZ/ha-rv-level-cards`, category:
   **Dashboard**.
3. Install "RV Level Cards". HACS registers the Lovelace resource for you.
4. Reload your browser.

### Manual

1. Copy `rv-level-cards.js`, `bubble-card.js`, `topdown-card.js` and
   `shared.js` into `config/www/rv-level-cards/`.
2. Settings -> Dashboards -> top-right "..." menu -> **Resources** -> **Add
   resource**:
   - URL: `/local/rv-level-cards/rv-level-cards.js`
   - Resource type: **JavaScript module**
3. Reload your browser.

> [!IMPORTANT]
> Requires the [RV Level](https://github.com/arnyminerz/ha-rv-level)
> integration to be installed and configured first — both cards read its
> entities.

## Adding the cards

Both cards only need one thing from you: the **RV Level device** — every
sensor/binary_sensor it needs is then resolved automatically, so renaming
the device later doesn't break the card.

- **Edit Dashboard -> Add Card -> search "RV Level"**, or
- Go to the RV Level device page and use **Add to dashboard**, or click on
  any of its entities in the card picker — both cards appear under
  **Suggested*** for it (requires Home Assistant 2026.6+).
- Both cards are fully configurable from the UI editor (no YAML required):
  a device picker, an optional title, and — for the top-down card — an
  image upload field.

<sup>*The "suggested cards for an entity/device" picker is a Home Assistant
2026.6 feature. On older versions, add the cards manually by searching for
"RV Level" in the card picker.</sup>

### Bubble level card

```yaml
type: custom:rv-level-bubble-card
device_id: <your RV Level device id>
title: Level # optional
```

A circular dial that moves with pitch/roll and turns green when the
vehicle is level, red otherwise. The dashed "level zone" circle is drawn at
the same pixels-per-degree scale as the bubble, so the zone boundary is
exactly where the vehicle stops counting as level.

### Top-down chocks card

```yaml
type: custom:rv-level-topdown-card
device_id: <your RV Level device id>
title: RV Level # optional
image: /api/image/serve/<id>/original # optional, set via the UI editor
```

A top-down illustration of your vehicle with a tile at each corner showing
the chock height to use (and a chevron icon reflecting the chock's step —
single/double/triple, matching how many steps up your chock preset needs),
plus a center tile showing whether the vehicle is level, not level, or not
levelable at all with your configured chocks.

By default a generic top-down van outline is used. To use a photo/drawing
of your own vehicle instead, open the card's UI editor and use the **Top-down
vehicle image** upload field — no need to place files in `www/` by hand.

## Notes / known limitations

- Entity resolution matches on the fixed suffix of each entity ID (e.g.
  `..._front_left_chock`, `..._bubble_position`). This is stable across
  device renames, but if you ever rename an *individual entity* away from
  its default name, the card won't find it and will show a placeholder
  ("—" / "Unavailable") for that corner instead.
- The chock chevron icon reflects the chock's *index* within your
  configured preset (1st/2nd/3rd step), not an absolute height — presets
  with fewer steps simply never show the triple-chevron icon.

## License

[MIT](LICENSE)
