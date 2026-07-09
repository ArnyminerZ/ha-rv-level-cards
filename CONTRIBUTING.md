# Contributing

Thanks for considering a contribution! The most approachable contribution
by far is **adding a new language** — it's a single JavaScript object, no
build step or Lovelace knowledge required.

## Adding a translation

All user-facing text lives in one place: the `STRINGS` object near the top
of [`rv-level-cards.js`](rv-level-cards.js), keyed by
[two-letter language code](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes)
(`en`, `ca`, `es`, ...):

```js
const STRINGS = {
  en: { device: "RV Level device", title: "Title", /* ... */ },
  ca: { device: "Dispositiu RV Level", title: "Títol", /* ... */ },
  es: { device: "Dispositivo RV Level", title: "Título", /* ... */ },
};
```

To add a new language:

1. Copy the entire `en: { ... }` block, rename the key to your language's
   code, and translate every value.
2. Two entries are **functions**, not plain strings, because they need to
   pluralize a number — keep them as functions and translate the text
   inside:
   ```js
   wheels_need_chock: (n) => `${n} wheel${n === 1 ? "" : "s"} need a chock`,
   needs_lift: (n) => `Needs ${n.toFixed(1)} cm lift`,
   ```
   Adapt the pluralization logic to your language's rules — see the `ca`/`es`
   entries for an example of a language that needs a distinct singular form:
   ```js
   wheels_need_chock: (n) => (n === 1 ? "1 roda necessita falca" : `${n} rodes necessiten falca`),
   ```
3. Don't translate the object's **keys** (`device`, `select_device`,
   `needs_lift`, ...) — only the values. The keys are looked up by the code
   and must stay exactly as in the `en` block.
4. `bubble_card_name` / `bubble_card_desc` / `topdown_card_name` /
   `topdown_card_desc` are what shows up when a user searches "RV Level" in
   the Lovelace card picker — keep these reasonably short and, if possible,
   keep "RV Level" itself untranslated in the name so search still works.
5. Verify the file is still valid JavaScript:
   ```bash
   node --check rv-level-cards.js
   ```

That's it — no registration step needed. The card automatically picks the
right language from the user's Home Assistant profile language (falling
back to English for any key or language it doesn't recognize), so a partial
or new translation can never break the cards for other users.

### How the language is chosen

`resolveLang()` (right above `STRINGS`) picks the language from, in order:
`hass.locale.language`, `hass.language`, the `<html lang>` attribute Home
Assistant sets on page load, then the browser's own language — falling back
to `en` if none of those match a language you've added to `STRINGS`.

### Testing your translation

There's no live Home Assistant instance in CI, so please sanity-check your
translation by hand: install the cards in a real Home Assistant instance
(see the [README](README.md#manual)), switch your user profile's language
(**Settings -> your profile -> Language**) to the one you're adding, and
confirm the card titles, status text, and the editor form all show your
translation. Also check the bubble/wheel tiles don't overflow their box with
your (possibly longer) translated strings — shorten the wording if they do.

## Adding or fixing a card feature

For anything beyond translations — new options, layout changes, bug fixes —
open an issue or PR describing what you're changing and why; there's no
formal process beyond that for a project this size.
