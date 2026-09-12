import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

for (const [source, artifact] of [
  ["../../../LICENSE", "../dist/LICENSE.txt"],
  ["../../../THIRD_PARTY_NOTICES.md", "../dist/THIRD_PARTY_NOTICES.txt"],
]) {
  const [expected, actual] = await Promise.all(
    [source, artifact].map((path) =>
      readFile(new URL(path, import.meta.url), "utf8"),
    ),
  );
  assert.equal(
    actual,
    expected,
    `${artifact} must include the complete notice`,
  );
}

console.log("Verified complete license notices in the demo artifact.");
