"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "satisstyles.stylesheet.v1";

const coreProperties = [
  { name: "font-family", value: "Inter, sans-serif" },
  { name: "font-size", value: "16px" },
  { name: "color", value: "#14213d" },
  { name: "background-color", value: "#f8fafc" },
];

const propertyCatalog = [
  "align-content",
  "align-items",
  "align-self",
  "appearance",
  "border",
  "border-bottom",
  "border-color",
  "border-radius",
  "border-style",
  "border-width",
  "box-shadow",
  "box-sizing",
  "cursor",
  "display",
  "flex",
  "flex-direction",
  "flex-wrap",
  "gap",
  "grid-template-columns",
  "height",
  "justify-content",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "opacity",
  "overflow",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "position",
  "text-align",
  "text-decoration",
  "text-transform",
  "transition",
  "vertical-align",
  "width",
  "z-index",
];

const emptyMediaOptions = {
  type: "all",
  condition: "",
  minWidth: "",
  maxWidth: "",
  orientation: "",
  colorScheme: "",
};

function createRootRule() {
  return {
    id: "root",
    kind: "root",
    variables: [{ name: "--primary-color", value: "#2563eb" }],
  };
}

function createSelectorRule(id) {
  return {
    id,
    kind: "selector",
    selector: "",
    targetSelector: "div",
    properties: coreProperties.map((property) => ({ ...property })),
    mediaOptions: { ...emptyMediaOptions },
  };
}

function createInitialStylesheet() {
  return { rules: [createRootRule(), createSelectorRule("rule-1")], activeRuleId: "root" };
}

function loadStylesheet() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { stylesheet: createInitialStylesheet(), error: "" };

    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.rules)) {
      return { stylesheet: createInitialStylesheet(), error: "Saved styles were invalid; a fresh stylesheet was opened." };
    }

    const rootRule = parsed.rules.find((rule) => rule?.kind === "root");
    const rules = parsed.rules.filter((rule) => rule?.kind !== "root");
    const usedIds = new Set(["root"]);
    const selectorRules = rules
      .filter((rule) => rule?.kind === "selector" && typeof rule.id === "string")
      .map((rule, index) => {
        const fallback = createSelectorRule(rule.id);
        const id = usedIds.has(rule.id) ? `${rule.id}-${index + 1}` : rule.id;
        usedIds.add(id);
        return {
          ...fallback,
          ...rule,
          id,
          selector: typeof rule.selector === "string" ? rule.selector : "",
          targetSelector: typeof rule.targetSelector === "string" ? rule.targetSelector : "div",
          properties: Array.isArray(rule.properties)
            ? rule.properties
                .filter((property) => property && typeof property.name === "string" && typeof property.value === "string")
                .map((property) => ({ name: property.name, value: property.value }))
            : fallback.properties,
          mediaOptions: {
            ...emptyMediaOptions,
            ...(rule.mediaOptions && typeof rule.mediaOptions === "object" ? rule.mediaOptions : {}),
          },
        };
      });
    const normalizedRules = [
      {
        ...createRootRule(),
        ...(rootRule && Array.isArray(rootRule.variables) ? rootRule : {}),
        variables: rootRule && Array.isArray(rootRule.variables)
          ? rootRule.variables
              .filter((variable) => variable && typeof variable.name === "string" && typeof variable.value === "string")
              .map((variable) => ({ name: variable.name, value: variable.value }))
          : createRootRule().variables,
      },
      ...selectorRules,
    ];
    const activeRuleId = normalizedRules.some((rule) => rule.id === parsed.activeRuleId)
      ? parsed.activeRuleId
      : normalizedRules[0].id;

    return { stylesheet: { rules: normalizedRules, activeRuleId }, error: "" };
  } catch {
    return {
      stylesheet: createInitialStylesheet(),
      error: "Could not read saved styles; a fresh stylesheet was opened.",
    };
  }
}

function getSelectorKind(selector) {
  const trimmedSelector = selector.trim();
  if (/^@media\b/i.test(trimmedSelector)) return "Media query";
  if (/^#[\w-]+$/.test(trimmedSelector)) return "ID";
  if (/^\.[\w-]+$/.test(trimmedSelector)) return "Class";
  if (/^[a-zA-Z][\w-]*$/.test(trimmedSelector)) return "Element";
  return "Enter a valid selector";
}

function isValidTargetSelector(selector) {
  return /^(?:[a-zA-Z][\w-]*|[.#][\w-]+)$/.test(selector.trim());
}

function getDeclarations(properties) {
  return properties
    .filter((property) => property.name.trim() && property.value.trim())
    .map((property) => `  ${property.name.trim()}: ${property.value.trim()};`);
}

function buildRootCss(rootRule) {
  const declarations = rootRule.variables
    .filter((variable) => variable.name.trim() && variable.value.trim())
    .map((variable) => `  ${variable.name.trim()}: ${variable.value.trim()};`);
  return `:root {\n${declarations.join("\n")}\n}`;
}

function buildMediaConditions(mediaOptions) {
  return [
    mediaOptions.type !== "all" ? mediaOptions.type : "",
    mediaOptions.condition.trim().replace(/^and\s+/i, ""),
    mediaOptions.minWidth ? `(min-width: ${mediaOptions.minWidth})` : "",
    mediaOptions.maxWidth ? `(max-width: ${mediaOptions.maxWidth})` : "",
    mediaOptions.orientation ? `(orientation: ${mediaOptions.orientation})` : "",
    mediaOptions.colorScheme ? `(prefers-color-scheme: ${mediaOptions.colorScheme})` : "",
  ].filter(Boolean);
}

function buildSelectorCss(rule) {
  const isMediaQuery = /^@media\b/i.test(rule.selector.trim());
  const selector = (isMediaQuery ? rule.targetSelector : rule.selector).trim();
  if (!selector) return "";

  const declarations = getDeclarations(rule.properties);
  const cssRule = `${selector} {\n${declarations.join("\n")}\n}`;
  if (!isMediaQuery) return cssRule;

  const conditions = buildMediaConditions(rule.mediaOptions);
  return `@media ${conditions.join(" and ") || "all"} {\n${cssRule
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n")}\n}`;
}

function buildStylesheet(rules) {
  return rules
    .map((rule) => (rule.kind === "root" ? buildRootCss(rule) : buildSelectorCss(rule)))
    .filter(Boolean)
    .join("\n\n");
}

function getNextProperty(usedProperties) {
  return propertyCatalog.find((property) => !usedProperties.includes(property)) ?? "";
}

function toReactStyleName(property) {
  return property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function createRuleLabel(rule) {
  if (rule.kind === "root") return ":root";
  const selector = rule.selector.trim();
  if (!selector) return "Untitled rule";
  if (/^@media\b/i.test(selector)) return `${selector} → ${rule.targetSelector}`;
  return selector;
}

export default function Home() {
  const [stylesheet, setStylesheet] = useState(createInitialStylesheet);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    const saved = loadStylesheet();
    setStylesheet(saved.stylesheet);
    setStorageError(saved.error);
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stylesheet));
      setStorageError("");
    } catch {
      setStorageError("Autosave is unavailable. Check your browser storage settings.");
    }
  }, [stylesheet, hasLoaded]);

  const activeRule = stylesheet.rules.find((rule) => rule.id === stylesheet.activeRuleId)
    ?? stylesheet.rules[0];
  const rootRule = stylesheet.rules.find((rule) => rule.kind === "root");
  const isRootRule = activeRule.kind === "root";
  const isMediaQuery = !isRootRule && /^@media\b/i.test(activeRule.selector.trim());
  const selectorKind = isRootRule ? "Global variables" : getSelectorKind(activeRule.selector);
  const validSelector = isRootRule || (isMediaQuery
    ? isValidTargetSelector(activeRule.targetSelector)
    : selectorKind !== "Enter a valid selector");
  const css = useMemo(() => buildStylesheet(stylesheet.rules), [stylesheet.rules]);
  const availableVariables = rootRule.variables.filter(
    (variable) => /^--[a-zA-Z_][\w-]*$/.test(variable.name.trim()) && variable.value.trim(),
  );
  const activePreviewStyle = !isRootRule
    ? Object.fromEntries(
        activeRule.properties
          .filter((property) => property.name.trim() && property.value.trim())
          .map((property) => [toReactStyleName(property.name.trim()), property.value.trim()]),
      )
    : {};

  const updateRule = (ruleId, updates) => {
    setStylesheet((current) => ({
      ...current,
      rules: current.rules.map((rule) => rule.id === ruleId ? { ...rule, ...updates } : rule),
    }));
    setCopied(false);
  };

  const selectRule = (ruleId) => {
    setStylesheet((current) => ({ ...current, activeRuleId: ruleId }));
    setCopied(false);
  };

  const addRule = () => {
    const nextNumber = stylesheet.rules.filter((rule) => rule.kind === "selector").length + 1;
    let id = `rule-${nextNumber}`;
    let suffix = nextNumber;
    while (stylesheet.rules.some((rule) => rule.id === id)) {
      suffix += 1;
      id = `rule-${suffix}`;
    }

    const newRule = createSelectorRule(id);
    setStylesheet((current) => ({
      rules: [...current.rules, newRule],
      activeRuleId: id,
    }));
    setCopied(false);
  };

  const removeRule = (ruleId) => {
    setStylesheet((current) => {
      const rules = current.rules.filter((rule) => rule.kind === "root" || rule.id !== ruleId);
      const activeRuleId = current.activeRuleId === ruleId ? rules[0].id : current.activeRuleId;
      return { rules, activeRuleId };
    });
    setCopied(false);
  };

  const updateProperty = (index, key, value) => {
    updateRule(activeRule.id, {
      properties: activeRule.properties.map((property, propertyIndex) =>
        propertyIndex === index ? { ...property, [key]: value } : property,
      ),
    });
  };

  const updateRootVariable = (index, key, value) => {
    updateRule(activeRule.id, {
      variables: activeRule.variables.map((variable, variableIndex) =>
        variableIndex === index ? { ...variable, [key]: value } : variable,
      ),
    });
  };

  const updateMediaOption = (key, value) => {
    updateRule(activeRule.id, {
      mediaOptions: { ...activeRule.mediaOptions, [key]: value },
    });
  };

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setCopyError("Could not copy CSS. Check clipboard permissions and try again.");
    }
  };

  const downloadCss = () => {
    const blob = new Blob([css], { type: "text/css;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "satisstyles.css";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="/" aria-label="SatisStyles home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SatisStyles</span>
        </a>
        <div className="save-status" role="status">
          <span className={`save-dot${storageError ? " save-dot-error" : ""}`} />
          {storageError || (hasLoaded ? "Saved in this browser" : "Loading saved styles…")}
        </div>
      </header>

      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Your stylesheet</p>
          <h1>Style, save, and keep building.</h1>
          <p className="page-description">
            Every rule is kept in your list and saved automatically in this browser.
          </p>
        </div>
        <button type="button" className="new-rule-button" onClick={addRule}>
          <span aria-hidden="true">+</span> New style
        </button>
      </div>

      <div className="workspace-grid">
        <aside className="panel rules-panel" aria-labelledby="rules-heading">
          <div className="rules-heading">
            <div>
              <h2 id="rules-heading">Styles</h2>
              <span>{stylesheet.rules.length} {stylesheet.rules.length === 1 ? "item" : "items"}</span>
            </div>
            <button type="button" className="icon-button" onClick={addRule} aria-label="Add a style">
              +
            </button>
          </div>

          <nav className="rules-list" aria-label="Saved styles">
            {stylesheet.rules.map((rule, index) => {
              const isSelected = rule.id === activeRule.id;
              return (
                <div
                  className={`rule-item${isSelected ? " rule-item-active" : ""}${rule.kind === "root" ? " root-item" : ""}`}
                  key={rule.id}
                >
                  <button
                    type="button"
                    className="rule-select"
                    onClick={() => selectRule(rule.id)}
                    aria-current={isSelected ? "page" : undefined}
                  >
                    <span className="rule-icon" aria-hidden="true">
                      {rule.kind === "root" ? "◎" : rule.selector.trim().startsWith("@media") ? "◷" : "◇"}
                    </span>
                    <span className="rule-item-text">
                      <span className="rule-label">{createRuleLabel(rule)}</span>
                      <span className="rule-type">{rule.kind === "root" ? "Global styles" : rule.selector.trim() ? "CSS rule" : `New style ${index}`}</span>
                    </span>
                  </button>
                  {rule.kind !== "root" && (
                    <button
                      type="button"
                      className="rule-remove"
                      onClick={() => removeRule(rule.id)}
                      aria-label={`Remove ${createRuleLabel(rule)}`}
                      title="Remove style"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="rules-footer">
            <span className="storage-icon" aria-hidden="true">✓</span>
            <span>Changes save as you work</span>
          </div>
        </aside>

        <section className="panel editor-panel" aria-labelledby="editor-heading">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{isRootRule ? "Global styles" : "Style editor"}</p>
              <h2 id="editor-heading">{isRootRule ? "Root variables" : "Edit style"}</h2>
            </div>
            <span className={`selector-kind${validSelector ? "" : " invalid"}`}>
              {selectorKind}
            </span>
          </div>

          {isRootRule ? (
            <section className="subsection root-editor" aria-labelledby="root-heading">
              <div className="subsection-heading">
                <div>
                  <h3 id="root-heading">:root custom properties</h3>
                  <p>Set global CSS variables that can be reused by any style in this sheet.</p>
                </div>
                <button
                  type="button"
                  className="small-add-button"
                  onClick={() => updateRule(activeRule.id, {
                    variables: [...activeRule.variables, { name: "--new-variable", value: "" }],
                  })}
                >
                  + Variable
                </button>
              </div>
              <div className="property-list root-variable-list">
                {activeRule.variables.map((variable, index) => (
                  <div className="property-row root-variable-row" key={`root-${index}`}>
                    <label className="property-name">
                      Variable
                      <input
                        value={variable.name}
                        onChange={(event) => updateRootVariable(index, "name", event.target.value)}
                        placeholder="--primary-color"
                        spellCheck="false"
                      />
                    </label>
                    <label className="property-value">
                      Value
                      <input
                        value={variable.value}
                        onChange={(event) => updateRootVariable(index, "value", event.target.value)}
                        placeholder="#2563eb"
                      />
                    </label>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() =>
                        updateRule(activeRule.id, {
                          variables: activeRule.variables.filter((_, itemIndex) => itemIndex !== index),
                        })
                      }
                      aria-label={`Remove ${variable.name || "root variable"}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {activeRule.variables.length === 0 && (
                  <p className="empty-message">No variables yet. Add one to get started.</p>
                )}
              </div>
              <div className="root-tip">
                <span aria-hidden="true">i</span>
                <p>Reference a variable in any rule with <code>var(--variable-name)</code>.</p>
              </div>
            </section>
          ) : (
            <>
              <label className="selector-field">
                Element, class, ID, or media query
                <input
                  value={activeRule.selector}
                  onChange={(event) => {
                    const selector = event.target.value;
                    const updates = { selector };
                    if (/^@media\b/i.test(selector.trim())) {
                      updates.mediaOptions = {
                        ...activeRule.mediaOptions,
                        condition: selector.trim().replace(/^@media\b/i, "").trim(),
                      };
                    }
                    updateRule(activeRule.id, updates);
                  }}
                  placeholder="e.g. button, .card, #header, @media (max-width: 700px)"
                  aria-describedby="selector-help"
                  spellCheck="false"
                />
                <span id="selector-help" className="field-hint">
                  Use a tag name, a .class, an #id, or start with @media.
                </span>
                {!validSelector && !isMediaQuery && (
                  <span className="error-text">Enter one element name, .class, or #id.</span>
                )}
              </label>

              {isMediaQuery && (
                <>
                  <label className="selector-field">
                    Rule selector inside the media query
                    <input
                      value={activeRule.targetSelector}
                      onChange={(event) => updateRule(activeRule.id, { targetSelector: event.target.value })}
                      placeholder="e.g. .card or body"
                    />
                    {!isValidTargetSelector(activeRule.targetSelector) && (
                      <span className="error-text">Use one element name, .class, or #id.</span>
                    )}
                  </label>
                  <section className="subsection" aria-labelledby="media-options-heading">
                    <div className="subsection-heading">
                      <div>
                        <h3 id="media-options-heading">Responsive options</h3>
                        <p>Combine the query with optional conditions.</p>
                      </div>
                    </div>
                    <div className="field-grid media-grid">
                      <label>
                        Media type
                        <select value={activeRule.mediaOptions.type} onChange={(event) => updateMediaOption("type", event.target.value)}>
                          <option value="all">All</option>
                          <option value="screen">Screen</option>
                          <option value="print">Print</option>
                        </select>
                      </label>
                      <label>
                        Minimum width
                        <input value={activeRule.mediaOptions.minWidth} onChange={(event) => updateMediaOption("minWidth", event.target.value)} placeholder="e.g. 768px" />
                      </label>
                      <label>
                        Maximum width
                        <input value={activeRule.mediaOptions.maxWidth} onChange={(event) => updateMediaOption("maxWidth", event.target.value)} placeholder="e.g. 1200px" />
                      </label>
                      <label>
                        Orientation
                        <select value={activeRule.mediaOptions.orientation} onChange={(event) => updateMediaOption("orientation", event.target.value)}>
                          <option value="">Any</option>
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      </label>
                      <label>
                        Color scheme
                        <select value={activeRule.mediaOptions.colorScheme} onChange={(event) => updateMediaOption("colorScheme", event.target.value)}>
                          <option value="">Any</option>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </label>
                    </div>
                  </section>
                </>
              )}

              <section className="subsection property-section" aria-labelledby="properties-heading">
                <div className="subsection-heading">
                  <div>
                    <h3 id="properties-heading">CSS properties</h3>
                    <p>Choose properties and values for this style.</p>
                  </div>
                </div>
                <div className="property-list">
                  {activeRule.properties.map((property, index) => (
                    <div className="property-row" key={`property-${index}`}>
                      <label className="property-name">
                        Property
                        <select
                          value={property.name}
                          onChange={(event) => updateProperty(index, "name", event.target.value)}
                          disabled={index < coreProperties.length}
                          aria-label={`Property ${index + 1}`}
                        >
                          {[...new Set([...propertyCatalog, property.name])]
                            .sort()
                            .map((name) => (
                              <option
                                key={name}
                                value={name}
                                disabled={activeRule.properties.some(
                                  (item, itemIndex) => itemIndex !== index && item.name === name,
                                )}
                              >
                                {name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="property-value">
                        Value
                        <input
                          value={property.value}
                          onChange={(event) => updateProperty(index, "value", event.target.value)}
                          placeholder={`Value for ${property.name}`}
                          aria-label={`Value for ${property.name}`}
                        />
                        <select
                          className="variable-picker"
                          value={
                            /^var\((--[\w-]+)\)$/.exec(property.value.trim())?.[1] ?? ""
                          }
                          onChange={(event) => {
                            if (event.target.value) {
                              updateProperty(index, "value", `var(${event.target.value})`);
                            }
                          }}
                          aria-label={`Use a CSS variable for ${property.name}`}
                          disabled={availableVariables.length === 0}
                        >
                          <option value="">
                            {availableVariables.length ? "Use CSS variable…" : "No CSS variables"}
                          </option>
                          {availableVariables.map((variable, variableIndex) => (
                            <option key={`${variable.name}-${variableIndex}`} value={variable.name}>
                              {variable.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {index >= coreProperties.length ? (
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() =>
                            updateRule(activeRule.id, {
                              properties: activeRule.properties.filter((_, itemIndex) => itemIndex !== index),
                            })
                          }
                          aria-label={`Remove ${property.name} property`}
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="required-mark">Core</span>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="add-property-button"
                  onClick={() => {
                    const nextProperty = getNextProperty(activeRule.properties.map((property) => property.name));
                    if (nextProperty) {
                      updateRule(activeRule.id, {
                        properties: [...activeRule.properties, { name: nextProperty, value: "" }],
                      });
                    }
                  }}
                  disabled={!getNextProperty(activeRule.properties.map((property) => property.name))}
                >
                  <span aria-hidden="true">+</span> Add CSS property
                </button>
              </section>
            </>
          )}
        </section>

        <section className="panel preview-panel" aria-labelledby="preview-heading">
          <div className="preview-header">
            <div>
              <p className="eyebrow">Stylesheet output</p>
              <h2 id="preview-heading">Preview &amp; export</h2>
            </div>
            <span className="rule-count">{stylesheet.rules.length} rules</span>
          </div>

          <div className="preview-surface">
            {isRootRule ? (
              rootRule.variables.length > 0 ? (
                <div className="root-preview">
                  <span className="root-preview-icon" aria-hidden="true">◎</span>
                  <strong>Global variables</strong>
                  <span>Available throughout your stylesheet</span>
                  <div className="variable-chips">
                    {rootRule.variables
                      .filter((variable) => variable.name.trim() && variable.value.trim())
                      .map((variable, index) => (
                        <span className="variable-chip" key={`${variable.name}-${index}`}>
                          <i style={{ backgroundColor: variable.value }} />
                          {variable.name}
                        </span>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="preview-placeholder">Add a custom property to start building your global styles.</p>
              )
            ) : validSelector ? (
              <div
                className="demo-card"
                style={activePreviewStyle}
                id={!isMediaQuery && activeRule.selector.startsWith("#") ? activeRule.selector.slice(1) : undefined}
                data-preview-class={!isMediaQuery && activeRule.selector.startsWith(".") ? activeRule.selector.slice(1) : undefined}
              >
                <strong>Design element</strong>
                <p>
                  {isMediaQuery
                    ? `Preview for ${activeRule.targetSelector}; responsive rules apply at matching sizes.`
                    : `Previewing ${selectorKind.toLowerCase()} ${activeRule.selector}.`}
                </p>
              </div>
            ) : (
              <p className="preview-placeholder">Enter a valid element, .class, or #id to preview it.</p>
            )}
          </div>

          <div className="output-heading">
            <label htmlFor="css-output">Complete stylesheet</label>
            <span>All saved styles</span>
          </div>
          <textarea readOnly value={css} id="css-output" className="css-output" spellCheck="false" />
          <div className="export-actions">
            <button type="button" className="copy-button" onClick={copyCss}>
              {copied ? "Copied stylesheet" : "Copy all CSS"}
            </button>
            <button type="button" className="download-button" onClick={downloadCss}>
              Download .css
            </button>
          </div>
          {copyError && <p className="error-text copy-error" role="alert">{copyError}</p>}
        </section>
      </div>
    </main>
  );
}
