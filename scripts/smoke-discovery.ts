// Run: PMB_MOCK=1 npx tsx scripts/smoke-discovery.ts
process.env.PMB_MOCK = "1";
import assert from "node:assert";
import { runDiscover } from "../src/lib/engine/discover";
import { runCreateRole } from "../src/lib/engine/createRole";
import { makeRoleResolver } from "../src/lib/engine/util";

async function main() {
  const none = makeRoleResolver([]);
  const d = await runDiscover({ topic: "高校の授業料無償化", countryCodes: ["JP"], selectedRoleIds: ["mayor_city"], customRoles: [], modelTier: "standard" });
  assert(d.suggestions.length >= 10, "suggestions");
  assert(!d.suggestions.some((s) => s.roleId === "mayor_city"), "excluded selected");
  assert(d.suggestions.every((s) => (s.roleId && none(s.roleId)) || s.newRole), "valid refs");
  const news = d.suggestions.filter((s) => s.newRole);
  assert(news.length >= 3);
  console.log(`discover: ${d.suggestions.length} suggestions (${news.length} new)`);
  for (const s of d.suggestions) console.log(` [${s.group}] ${s.roleId ?? "NEW:" + s.newRole!.title} (${s.importance})`);

  const n = news[0].newRole!;
  const c = await runCreateRole({ ...n, topic: "高校の授業料無償化", countryCode: "JP", modelTier: "standard" });
  assert(c.role.id.startsWith("custom_"));
  assert(!none(c.role.id), "no global registry: a custom role is unknown without being passed explicitly");
  // Custom roles are threaded per request: passing it makes it resolvable, and it never leaks into other requests.
  assert(makeRoleResolver([c.role])(c.role.id));
  const d2 = await runDiscover({ topic: "別の議題", countryCodes: ["JP"], selectedRoleIds: [], customRoles: [c.role], modelTier: "standard" });
  assert(d2.suggestions.length > 0);
  console.log("createRole:", c.role.id, c.role.title, c.role.outfit, c.role.ageRange);
  console.log("OK");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
