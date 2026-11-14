// Run: PMB_MOCK=1 npx tsx scripts/smoke-discovery.ts
process.env.PMB_MOCK = "1";
import assert from "node:assert";
import { runDiscover } from "../src/lib/engine/discover";
import { runCreateRole } from "../src/lib/engine/createRole";
import { getRole, registerCustomRoles } from "../src/data/roles";

async function main() {
  const d = await runDiscover({ topic: "高校の授業料無償化", countryCodes: ["JP"], selectedRoleIds: ["mayor_city"], customRoles: [], modelTier: "standard" });
  assert(d.suggestions.length >= 10, "suggestions");
  assert(!d.suggestions.some((s) => s.roleId === "mayor_city"), "excluded selected");
  assert(d.suggestions.every((s) => (s.roleId && getRole(s.roleId)) || s.newRole), "valid refs");
  const news = d.suggestions.filter((s) => s.newRole);
  assert(news.length >= 3);
  console.log(`discover: ${d.suggestions.length} suggestions (${news.length} new)`);
  for (const s of d.suggestions) console.log(` [${s.group}] ${s.roleId ?? "NEW:" + s.newRole!.title} (${s.importance})`);

  const n = news[0].newRole!;
  const c = await runCreateRole({ ...n, topic: "高校の授業料無償化", countryCode: "JP", modelTier: "standard" });
  assert(c.role.id.startsWith("custom_"));
  registerCustomRoles([c.role]);
  assert(getRole(c.role.id));
  console.log("createRole:", c.role.id, c.role.title, c.role.outfit, c.role.ageRange);
  console.log("OK");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
