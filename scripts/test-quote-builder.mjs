import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const directory = mkdtempSync(join(tmpdir(), "dept-quote-test-"));
const fs = require("node:fs");
const assert = require("node:assert/strict");
for (const [source, name] of [
  ["src/components/packages/packages-data.ts", "packages"],
  ["src/components/quote/quote-model.ts", "model"],
]) {
  let output = ts
    .transpileModule(fs.readFileSync(source, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace("../packages/packages-data", "./packages.mjs");
  fs.writeFileSync(join(directory, name + ".mjs"), output);
}
(async () => {
  const m = await import(pathToFileURL(join(directory, "model.mjs")).href);
  const p = await import(pathToFileURL(join(directory, "packages.mjs")).href);
  let count = 0;
  for (const c of p.packageCategories)
    for (const t of c.tiers) {
      assert.equal(m.findPackage(t.inquiryKey).category.id, c.id);
      const a = {
        service: c.id,
        package: t.inquiryKey,
        name: "Test",
        email: "test@example.com",
        dateStatus: "Still planning",
        location: "Still planning",
        budget: "Under $750",
        coverage: "Not Sure Yet",
        projectDescription: "A project",
        storyType: "Not Sure Yet",
        liveType: "Conference",
        livestreamNeeded: "No — recording only",
        contentType: "Brand",
        contentVolume: "A few strong pieces",
        streamingPlatformStatus: "stale",
        technicalSetup: "stale",
        eventDate: "stale",
        eventType: "stale",
      };
      const out = m.submission(a, true);
      assert.equal(out.packageId, t.inquiryKey);
      assert.equal(out.startingPoint, p.packagePrice(t));
      assert.ok(!("eventDate" in out));
      assert.ok(!("technicalSetup" in out));
      assert.ok(!("streamingPlatformStatus" in out));
      if (c.id !== "story") assert.ok(!("storyType" in out));
      if (c.id !== "live") assert.ok(!("liveType" in out));
      for (const q of m.questions(a, true)) assert.equal(m.validate(q, a), "", q.id);
      count++;
    }
  assert.equal(m.findPackage("invalid"), undefined);
  const live = { service: "live", livestreamNeeded: "Yes — livestream" };
  assert.ok(m.questions(live, false).some((q) => q.id === "technicalSetup"));
  const unsure = {
    service: "unsure",
    projectDescription: "Our community",
    dateStatus: "Still planning",
    location: "Not decided",
    coverage: "Not Sure Yet",
    budget: "Not Sure Yet",
    name: "Test",
    email: "test@example.com",
  };
  for (const q of m.questions(unsure, false)) assert.equal(m.validate(q, unsure), "");
  assert.ok(!("packageId" in m.submission(unsure, false)));
  const contact = m.questions(unsure, false).find((q) => q.id === "contact");
  assert.ok(m.validate(contact, { ...unsure, email: "bad" }));
  const fields = m.submission(unsure, false);
  const snapshot = JSON.stringify(fields);
  await assert.rejects(
    m.sendProject(fields, "", async () => {
      throw new Error("offline");
    }),
  );
  await assert.rejects(
    m.sendProject(
      fields,
      "",
      async () => new Response(JSON.stringify({ success: false }), { status: 200 }),
    ),
  );
  await assert.rejects(
    m.sendProject(fields, "", async () => new Response("not json", { status: 502 })),
  );
  assert.equal(JSON.stringify(fields), snapshot);
  await m.sendProject(fields, "", async (url, init) => {
    assert.match(url, /formsubmit.co\/ajax\/hello@thedeptcollective.com/);
    assert.equal(JSON.parse(init.body).projectDescription, "Our community");
    return new Response(JSON.stringify({ success: "true" }), { status: 200 });
  });
  console.log(
    "PASS: " +
      count +
      " canonical packages; all branches; conditional fields; validation; unsure path; failure retention; explicit success acknowledgement. No network requests sent.",
  );
})().finally(() => rmSync(directory, { recursive: true, force: true }));
