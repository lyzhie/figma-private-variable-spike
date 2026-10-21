"use strict";
(() => {
  // src/main.ts
  var tokens = [];
  var numeric = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing", "cornerRadius", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius", "opacity", "strokeWeight", "fontSize", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent"];
  figma.showUI(__html__, { width: 500, height: 620, themeColors: true });
  var errorText = (e) => e instanceof Error ? e.message : String(e);
  function tokenValue(v, n) {
    try {
      const value = v.resolveForConsumer(n).value;
      if (typeof value === "object" && "r" in value) {
        const rgb = [value.r, value.g, value.b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
        return `#${rgb}${"a" in value && value.a !== 1 ? ` \xB7 ${Math.round(value.a * 100)}%` : ""}`;
      }
      return String(value);
    } catch {
      return "Unavailable";
    }
  }
  function selected() {
    const s = figma.currentPage.selection;
    if (s.length !== 1) throw new Error("Select exactly one layer.");
    return s[0];
  }
  function category(field) {
    if (["cornerRadius", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"].includes(field)) return "cornerRadius";
    if (["paddingTop", "paddingBottom"].includes(field)) return "paddingVertical";
    if (["paddingLeft", "paddingRight"].includes(field)) return "paddingHorizontal";
    return field;
  }
  var groupedFields = {
    cornerRadius: ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"],
    paddingVertical: ["paddingTop", "paddingBottom"],
    paddingHorizontal: ["paddingLeft", "paddingRight"]
  };
  function destinations(n) {
    const reviewed = new Set(tokens.flatMap((t) => t.usages.map((u) => category(u.slice(u.lastIndexOf(" \xB7 ") + 3).split(".")[0]))));
    const result = [];
    for (const kind of ["fills", "strokes"]) {
      if (!reviewed.has(kind) || !(kind in n)) continue;
      const paints = n[kind];
      if (Array.isArray(paints)) paints.forEach((p, i) => {
        if (p.type === "SOLID") result.push({ id: `${kind}:${i}`, label: `${kind === "fills" ? "Fill" : "Stroke"} ${i + 1}`, type: "COLOR" });
      });
    }
    const labels = { cornerRadius: "Corner radius", paddingVertical: "Vertical padding", paddingHorizontal: "Horizontal padding", itemSpacing: "Item spacing" };
    for (const field of [...new Set(numeric.map(category))]) {
      if (!reviewed.has(field)) continue;
      const members = groupedFields[field] || [field];
      if (!members.every((f) => f in n)) continue;
      if ((field.startsWith("padding") || field === "itemSpacing") && (!("layoutMode" in n) || n.layoutMode === "NONE")) continue;
      result.push({ id: field, label: labels[field] || field, type: "FLOAT" });
    }
    return result;
  }
  function target() {
    try {
      const n = selected();
      figma.ui.postMessage({ type: "target", id: n.id, name: n.name, kind: n.type, places: destinations(n) });
    } catch {
      figma.ui.postMessage({ type: "target", places: [] });
    }
  }
  async function review() {
    const root = selected();
    if (root.type !== "INSTANCE") throw new Error("Select an imported instance to review.");
    const found = /* @__PURE__ */ new Map();
    const errors = [];
    async function visit(n) {
      const raw = "boundVariables" in n ? n.boundVariables : {};
      async function scan(value, path) {
        if (!value || typeof value !== "object") return;
        const alias = value;
        if (alias.type === "VARIABLE_ALIAS") {
          try {
            const v = await figma.variables.getVariableByIdAsync(alias.id);
            if (!v) throw new Error("Variable cannot be resolved");
            let t = found.get(v.key);
            if (!t) {
              t = { id: v.id, key: v.key, name: v.name, type: v.resolvedType, usages: [], value: tokenValue(v, n) };
              found.set(v.key, t);
            }
            const usage = `${n.name} \xB7 ${path}`;
            if (!t.usages.includes(usage)) t.usages.push(usage);
          } catch (e) {
            errors.push(`${n.name} \xB7 ${path}: ${errorText(e)}`);
          }
          return;
        }
        for (const [k, v] of Object.entries(value)) await scan(v, path ? `${path}.${k}` : k);
      }
      await scan(raw, "");
      if ("children" in n) for (const c of n.children) await visit(c);
    }
    await visit(root);
    const merged = new Map(tokens.map((t) => [t.key, t]));
    for (const t of found.values()) {
      const previous = merged.get(t.key);
      if (previous) t.usages = [.../* @__PURE__ */ new Set([...previous.usages, ...t.usages])];
      merged.set(t.key, t);
    }
    tokens = [...merged.values()];
    let saveWarning = "";
    try {
      figma.root.setPluginData("saved-tokens", JSON.stringify(tokens));
    } catch (e) {
      saveWarning = `
Could not save. Tokens remain available this session only: ${errorText(e)}`;
    }
    figma.ui.postMessage({ type: "tokens", tokens, message: `${saveWarning ? "Read" : "Saved"} ${found.size} token(s).${saveWarning}${errors.length ? "\n" + errors.join("\n") : ""}` });
    target();
  }
  figma.ui.onmessage = async (m) => {
    try {
      if (m.type === "clear") {
        figma.root.setPluginData("saved-tokens", "");
        tokens = [];
        figma.ui.postMessage({ type: "tokens", tokens, message: "Saved tokens cleared. Existing bindings are unchanged." });
        target();
      }
      if (m.type === "review") await review();
      if (m.type === "apply") {
        const n = selected();
        if (n.id !== m.targetId) throw new Error("Target changed. Select the property again.");
        const requested = m.bindings || (m.place && m.key ? [{ place: m.place, key: m.key }] : []);
        if (!requested.length) throw new Error("Choose at least one token.");
        const prepared = [];
        for (const entry of requested) {
          const place = destinations(n).find((p) => p.id === entry.place), t = tokens.find((t2) => t2.key === entry.key);
          if (!place || !t || t.type !== place.type) throw new Error("Choose a compatible property and token. Nothing applied.");
          const v = await figma.variables.getVariableByIdAsync(t.id);
          if (!v || v.key !== t.key) throw new Error("Saved variable is unavailable. Review the instance again. Nothing applied.");
          prepared.push({ place, t, v });
        }
        if (n.type === "TEXT") {
          if (n.fontName === figma.mixed) for (const f of n.getRangeAllFontNames(0, n.characters.length)) await figma.loadFontAsync(f);
          else await figma.loadFontAsync(n.fontName);
        }
        if (selected().id !== n.id) throw new Error("Target changed. Nothing applied.");
        let applied = 0;
        const failures = [];
        for (const { place, v } of prepared) {
          try {
            if (place.id.includes(":")) {
              const [kind, index] = place.id.split(":");
              const paints = [...n[kind]];
              paints[Number(index)] = figma.variables.setBoundVariableForPaint(paints[Number(index)], "color", v);
              n[kind] = paints;
            } else {
              for (const field of groupedFields[place.id] || [place.id]) n.setBoundVariable(field, v);
            }
            applied++;
          } catch (e) {
            failures.push(`${place.label}: ${errorText(e)}`);
          }
        }
        figma.ui.postMessage({ type: "status", message: `Applied ${applied}/${prepared.length} properties to ${n.name}.${failures.length ? "\n" + failures.join("\n") : ""}`, error: failures.length > 0 });
        target();
      }
    } catch (e) {
      figma.ui.postMessage({ type: "status", message: errorText(e), error: true });
    }
  };
  try {
    tokens = JSON.parse(figma.root.getPluginData("saved-tokens") || "[]");
  } catch {
    tokens = [];
  }
  async function restore() {
    const n = figma.currentPage.selection[0];
    if (n) for (const t of tokens) {
      try {
        const v = await figma.variables.getVariableByIdAsync(t.id);
        if (v && v.key === t.key) t.value = tokenValue(v, n);
      } catch {
      }
    }
    figma.ui.postMessage({ type: "tokens", tokens });
    target();
  }
  void restore();
  figma.on("selectionchange", target);
})();
