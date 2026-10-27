/**
 * Plain JS values ↔ Firestore REST "Value" objects, for the scripts that talk
 * to the REST API: the seed scripts (seed-emulators.js, seed-preview.js)
 * write with toFields; privacy-cleanup-checklist.js reads with fromFields.
 */
function toValue(v) {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  switch (typeof v) {
    case 'string': return { stringValue: v };
    case 'boolean': return { booleanValue: v };
    case 'number': return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    case 'object': return { mapValue: { fields: toFields(v) } };
    default: throw new Error(`Unsupported value: ${v}`);
  }
}

function toFields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
}

function fromValue(v) {
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields ?? {});
  // referenceValue, geoPointValue, bytesValue: kept as-is (no names in them).
  return Object.values(v)[0];
}

function fromFields(fields) {
  return Object.fromEntries(Object.entries(fields ?? {}).map(([k, v]) => [k, fromValue(v)]));
}

module.exports = { toValue, toFields, fromValue, fromFields };
