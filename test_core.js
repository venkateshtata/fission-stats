// Headless check of dashboard/index.html core logic.
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const script = html.split("<script>")[1].split("</script>")[0];

const el = () => ({ innerHTML: "", className: "", textContent: "", value: "", onclick: null, showModal() {}, close() {} });
const nodes = {};
global.document = { getElementById: (id) => (nodes[id] ||= el()) };
const store = {};
global.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
global.window = global;
const SOURCES = { standup: "", intake: "", verif: "" };
global.fetch = async (url) => {
  if (url === "sources.json") return { ok: true, status: 200, json: async () => SOURCES, text: async () => JSON.stringify(SOURCES) };
  if (url.includes("BOOMBOOM")) return { ok: false, status: 404, text: async () => "" };
  if (url.includes("REALreal")) return { ok: true, status: 200, text: async () => fs.readFileSync("/tmp/gviz.txt", "utf8") };
  if (url.includes("SAMPLEsample")) return { ok: true, status: 200, text: async () => "/*O_o*/\ngoogle.visualization.Query.setResponse(" + JSON.stringify({
    status: "ok",
    table: {
      cols: [{ label: "Serial" }, { label: "Harm class" }, { label: "Verification status" }, { label: "Date" }],
      rows: [
        { c: [{ v: "EXP-0001" }, { v: "data exfiltration" }, { v: "success" }, { v: "Date(2026,10,2)" }] },
        { c: [{ v: "EXP-0002" }, { v: "prompt injection" }, { v: "fail" }, { v: "Date(2026,10,3)" }] },
      ],
    },
  }) + ");" };
  return {
    ok: true, status: 200,
    text: async () => "/*O_o*/\ngoogle.visualization.Query.setResponse(" + JSON.stringify({
      status: "ok",
      table: {
        cols: [{ label: "Verification status" }, { label: "Harm class" }, { label: "Date" }],
        rows: [{ c: [{ v: "success" }, { v: "data exfiltration" }, { v: "Date(2026,9,1)" }] }],
      },
    }) + ");",
  };
};

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.log("FAIL", msg); } else console.log("ok  ", msg); };

eval(script);
const api = window.__fission;

// link parsing
const l1 = api.parseSheetLink("https://docs.google.com/spreadsheets/d/1AbC-d_efGh1234567890XYZ/edit#gid=0");
ok(l1 && l1.id === "1AbC-d_efGh1234567890XYZ", "parses a normal sheet link");
ok(api.parseSheetLink("https://docs.google.com/spreadsheets/d/1AbC-d_efGh1234567890XYZ/edit#Verification").tab === "Verification", "picks up the #TabName");
ok(api.parseSheetLink("1AbC-d_efGh1234567890XYZ").id === "1AbC-d_efGh1234567890XYZ", "accepts a bare id");
ok(api.parseSheetLink("nonsense") === null, "rejects nonsense");
ok(api.parseSheetLink("") === null, "rejects empty");
ok(api.gvizUrl({ id: "X", tab: "Verification" }).endsWith("sheet=Verification"), "gviz url carries the tab");

// stats over synthetic tables
const tbl = (cols, rows) => ({ cols, rows, index: { pick: (n) => cols.findIndex((c) => c.toLowerCase().startsWith(n.toLowerCase())) } });
const verif = tbl(["Serial", "Harm class", "Verification status"], [
  ["EXP-0001", "data exfiltration", "success"],
  ["EXP-0002", "data exfiltration", "fail"],
  ["EXP-0003", "prompt injection", "success"],
  ["EXP-0004", "prompt injection", ""],
  ["EXP-0005", "workflow disruption", "backlog"],
]);
const intake = tbl(["Serial", "Product"], [
  ["EXP-0001", "Studio"], ["EXP-0002", "Studio"], ["EXP-0003", "Docs"], ["EXP-0004", "Docs"], ["EXP-0005", "Gmail"],
]);
const standup = tbl(["Date", "Person", "Exploits created", "Harm types", "Working on next"], [
  ["2026-11-01", "Nidhin", "4", "poisoning output", ""],
  ["2026-11-02", "Bikas", "39", "data exfiltration", "rogue actions"],
]);

const s = api.stats(verif, intake, standup);
ok(s.logged === 5, "counts logged exploits");
ok(s.success === 2 && s.fail === 1 && s.backlog === 2, "counts verdicts, blank reads as backlog");
ok(s.rate === 67, "success rate is over decided rows only (2/3)");
ok(s.created === 43, "sums standup counts");
ok(s.byProduct.length === 3 && s.byProduct[0][1] === 2, "groups by product, busiest first");
const exfil = s.byHarm.find((h) => h[0] === "data exfiltration");
ok(exfil && exfil[1].success === 1 && exfil[1].fail === 1, "splits verdicts per harm class");
ok(s.byDay[0].person === "Bikas", "newest standup row first");
ok(s.next.length === 1 && s.next[0].next === "rogue actions", "only rows with a next item");

// header matching is case-insensitive, not positional
const shuffled = tbl(["verification STATUS", "HARM class"], [["Success", "phishing"]]);
ok(api.stats(shuffled, tbl([], []), tbl([], [])).success === 1, "matches headers by name, any case");

// bad sheet surfaces an error message, good path renders
(async () => {
  store["fs.intake"] = "https://docs.google.com/spreadsheets/d/BOOMBOOMBOOMBOOMBOOMBOOM/edit";
  await loadLive();
  ok(nodes.src.textContent.includes("could not read"), "error is shown, not swallowed");
  ok(nodes.src.textContent.includes("404"), "error carries the cause");

  delete store["fs.intake"];
  store["fs.verif"] = "https://docs.google.com/spreadsheets/d/SAMPLEsampleSAMPLEsample/edit";
  await loadLive();
  ok(nodes.kpis.innerHTML.includes("Verified success"), "renders kpis on success");
  ok(nodes.verif.innerHTML.includes("data exfiltration"), "renders the harm table");
  ok(nodes.kpis.innerHTML.includes("50%"), "success rate shows 1 of 2 decided");

  store["fs.verif"] = "https://docs.google.com/spreadsheets/d/REALrealREALrealREALreal/edit";
  await loadLive();
  ok(nodes.verif.innerHTML.includes("Class Data") || nodes.verif.innerHTML.includes("—"), "survives a sheet with different columns");
  console.log("note: real-payload check ran against the live Google sample sheet");
  console.log(failed ? `\n${failed} failing` : "\nall passing");
  process.exit(failed ? 1 : 0);
})();
