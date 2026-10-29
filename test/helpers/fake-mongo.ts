/**
 * Database Mongo palsu dalam memori untuk tes route.
 * Mengevaluasi filter/sort/skip/limit/$set/$push/distinct sungguhan — bukan sekadar mencatat panggilan —
 * sehingga tes memeriksa HASIL, bukan implementasi. Hanya operator yang dipakai route kontrak.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function matches(doc: Record<string, any>, filter: Record<string, any>): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$and") return (cond as any[]).every((c) => matches(doc, c));
    if (key === "$or") return (cond as any[]).some((c) => matches(doc, c));
    if (key === "$nor") return !(cond as any[]).some((c) => matches(doc, c));

    const val = doc[key];
    if (cond === null || typeof cond !== "object" || cond instanceof Date) return val === cond;

    return Object.entries(cond as Record<string, any>).every(([op, arg]) => {
      switch (op) {
        case "$options": return true;
        case "$regex": return typeof val === "string" && new RegExp(arg, (cond as any).$options ?? "").test(val);
        case "$lt": return typeof val === "string" ? val < arg : typeof val === "number" && val < arg;
        case "$lte": return typeof val === "string" ? val <= arg : typeof val === "number" && val <= arg;
        case "$gt": return typeof val === "string" ? val > arg : typeof val === "number" && val > arg;
        case "$gte": return typeof val === "string" ? val >= arg : typeof val === "number" && val >= arg;
        case "$in": return (arg as any[]).includes(val);
        case "$nin": return !(arg as any[]).includes(val);
        case "$ne": return val !== arg;
        case "$exists": return (val !== undefined) === arg;
        default: throw new Error(`operator Mongo belum didukung fake: ${op}`);
      }
    });
  });
}

function project(doc: any, projection?: Record<string, 0 | 1>) {
  const out = structuredClone(doc);
  if (!projection) return out;
  const keys = Object.keys(projection).filter((k) => k !== "_id");
  const inclusive = keys.some((k) => projection[k] === 1);
  if (inclusive) {
    const picked: any = projection._id === 1 ? { _id: out._id } : {};
    for (const k of keys) if (projection[k] === 1 && k in out) picked[k] = out[k];
    return picked;
  }
  for (const k of keys) delete out[k];
  if (projection._id === 0) delete out._id;
  return out;
}

const cmp = (a: any, b: any) => (a === b ? 0 : a === undefined ? 1 : b === undefined ? -1 : a < b ? -1 : 1);

function applyUpdate(doc: any, update: Record<string, any>) {
  if (update.$set) Object.assign(doc, structuredClone(update.$set));
  if (update.$unset) for (const k of Object.keys(update.$unset)) delete doc[k];
  if (update.$push) {
    for (const [field, spec] of Object.entries<any>(update.$push)) {
      doc[field] = doc[field] ?? [];
      const items = structuredClone(spec.$each ?? [spec]);
      const pos = typeof spec.$position === "number" ? spec.$position : doc[field].length;
      doc[field].splice(pos, 0, ...items);
    }
  }
}

export type FakeDb = ReturnType<typeof createFakeDb>;

export function createFakeDb(seed: Record<string, any[]> = {}) {
  const data: Record<string, any[]> = {};
  for (const [name, docs] of Object.entries(seed)) data[name] = structuredClone(docs);
  const calls: { collection: string; method: string; args: any[] }[] = [];

  const collection = (name: string) => {
    const docs = (data[name] ??= []);
    const log = (method: string, ...args: any[]) => calls.push({ collection: name, method, args });

    return {
      find(filter: any = {}, opts: any = {}) {
        log("find", filter, opts);
        let rows = docs.filter((d) => matches(d, filter));
        const cursor: any = {
          sort(spec: Record<string, 1 | -1>) {
            const keys = Object.entries(spec);
            rows = [...rows].sort((a, b) => {
              for (const [k, dir] of keys) {
                const c = cmp(a[k], b[k]);
                if (c !== 0) return c * dir;
              }
              return 0;
            });
            return cursor;
          },
          skip(n: number) { rows = rows.slice(n); return cursor; },
          limit(n: number) { rows = rows.slice(0, n); return cursor; },
          toArray: async () => rows.map((d) => project(d, opts.projection)),
          next: async () => (rows[0] ? project(rows[0], opts.projection) : null),
        };
        return cursor;
      },
      findOne: async (filter: any = {}, opts: any = {}) => {
        log("findOne", filter, opts);
        const hit = docs.find((d) => matches(d, filter));
        return hit ? project(hit, opts.projection) : null;
      },
      countDocuments: async (filter: any = {}) => {
        log("countDocuments", filter);
        return docs.filter((d) => matches(d, filter)).length;
      },
      distinct: async (field: string, filter: any = {}) => {
        log("distinct", field, filter);
        return Array.from(new Set(docs.filter((d) => matches(d, filter)).map((d) => d[field]).filter((v) => v !== undefined)));
      },
      insertOne: async (doc: any) => {
        log("insertOne", doc);
        if (name === "contracts" && docs.some((d) => d.nomorKontrak === doc.nomorKontrak)) {
          throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
        }
        docs.push(structuredClone(doc));
        return { insertedId: `id_${docs.length}` };
      },
      updateOne: async (filter: any, update: any) => {
        log("updateOne", filter, update);
        const hit = docs.find((d) => matches(d, filter));
        if (!hit) return { matchedCount: 0, modifiedCount: 0 };
        applyUpdate(hit, update);
        return { matchedCount: 1, modifiedCount: 1 };
      },
      bulkWrite: async (ops: any[], opts: any) => {
        log("bulkWrite", ops, opts);
        let modifiedCount = 0;
        for (const op of ops) {
          const { filter, update } = op.updateOne;
          const hit = docs.find((d) => matches(d, filter));
          if (hit) { applyUpdate(hit, update); modifiedCount++; }
        }
        return { modifiedCount };
      },
      deleteOne: async (filter: any) => {
        log("deleteOne", filter);
        const i = docs.findIndex((d) => matches(d, filter));
        if (i >= 0) docs.splice(i, 1);
        return { deletedCount: i >= 0 ? 1 : 0 };
      },
      createIndex: async () => undefined,
    };
  };

  return { collection, data, calls, db: () => ({ collection }) };
}
