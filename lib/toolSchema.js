const TYPES = ["text", "number", "textarea"];
const bad = message => Object.assign(new Error(message), { status: 400 });

// Strict validation for admin input. Throws a 400 on bad data.
export function sanitizeFields(raw) {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 10) throw bad("Add up to 10 input fields.");
  const seen = new Set();
  return raw.map(f => {
    const key = String(f?.key || "").trim();
    const label = String(f?.label || "").trim().slice(0, 60);
    if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key) || !label || seen.has(key)) {
      throw bad("Each input field needs a unique key (letters, numbers, underscore; must start with a letter) and a label.");
    }
    seen.add(key);
    return {
      key,
      label,
      type: TYPES.includes(f.type) ? f.type : "text",
      required: f.required !== false,
      placeholder: String(f.placeholder || "").slice(0, 100)
    };
  });
}

// Tolerant read for stored data (older tools have no fields).
export function publicFields(raw) {
  try { return sanitizeFields(raw); } catch { return []; }
}

export function publicTool(id, data) {
  return {
    id,
    name: String(data.name || "").slice(0, 100),
    description: String(data.description || "").slice(0, 500),
    method: data.method === "POST" ? "POST" : "GET",
    cost: Math.max(1, Math.min(10000, Math.floor(Number(data.cost) || 1))),
    fields: publicFields(data.fields)
  };
}

// Validates user input against the tool's declared fields; unknown keys are dropped.
export function buildInput(fields, input) {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const out = {};
  for (const f of fields) {
    const value = src[f.key];
    const text = value === undefined || value === null ? "" : String(value).trim();
    if (!text) {
      if (f.required) throw bad(f.label + " is required.");
      continue;
    }
    if (text.length > (f.type === "textarea" ? 2000 : 500)) throw bad(f.label + " is too long.");
    if (f.type === "number") {
      const n = Number(text);
      if (!Number.isFinite(n)) throw bad(f.label + " must be a number.");
      out[f.key] = n;
    } else {
      out[f.key] = text;
    }
  }
  return out;
}
