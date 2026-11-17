# SatisStyles

SatisStyles is a visual CSS workspace for building and keeping a stylesheet one rule at a time. Add element, class, ID, and media-query styles, define global `:root` variables, preview the selected style, and copy or download the complete CSS.

## Requirements

- Node.js 18.17 or later
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the address printed by Next.js, usually [http://localhost:3000](http://localhost:3000).

To check a production build locally:

```bash
npm run build
npm run start:prod
```

## Create and edit styles

The **Styles** list contains every style in the current stylesheet. The `:root` global styles are pinned at the top and are selected when the workspace is first opened. Select any list item to return to its editor. Use **New style** to add another rule, and the remove button on a rule to delete it.

Enter a selector in the editor:

| Input | CSS target |
| --- | --- |
| `button` | An HTML element |
| `.card` | A class (include the leading `.`) |
| `#header` | An ID (include the leading `#`) |

Each new style starts with `font-family`, `font-size`, `color`, and `background-color`. Use **Add CSS property** to add another declaration from the built-in property list. Added declarations can be removed; the four starter declarations stay available. For any property value, type a CSS value directly or choose a declared `:root` variable from the menu below the value field. Choosing `--primary-color` inserts `var(--primary-color)`; you can still edit the value by hand at any time.

## Global variables and media queries

Select **:root** at the top of the Styles list to define CSS custom properties such as `--primary-color`. Reference them in any property value with `var(--primary-color)`.

To create a responsive rule, type a query beginning with `@media`, for example `@media (max-width: 700px)`. Choose the element, class, or ID the query affects, then optionally set a media type, minimum or maximum width, orientation, or preferred color scheme. The query and its declarations are saved as one item in the Styles list.

## Save and export

Changes are automatically saved in the current browser using local storage. They remain available on that browser and device; clearing browser site data removes them. There is no account or cloud sync.

The output panel contains the complete stylesheet, including `:root` and all saved rules. Use **Copy all CSS** to copy it or **Download .css** to save it as `satisstyles.css`.

## Development and project status

```bash
npm test
npm run build
```

The current `npm test` command is a placeholder because automated tests have not been added yet. SatisStyles is an early prototype and does not validate every CSS value or replace browser developer tools.
