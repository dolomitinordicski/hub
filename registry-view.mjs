export const escapeHtml = (value) =>
  String(value ?? "—").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function registryQuality(tool, live, now = Date.now()) {
  if (tool.observations?.quality === "service") return "service";
  const time = Date.parse(
    tool.lastObservedAt ??
      tool.observations?.observedAt ??
      tool.health?.checkedAt ??
      "",
  );
  if (!Number.isFinite(time)) return "unavailable";
  if (
    !live ||
    now - time > 2 * 60 * 60 * 1000 ||
    tool.observations?.quality === "stale"
  )
    return "stale";
  return tool.observations ? "verified" : "legacy";
}
export function observationMarkup(
  tool,
  lang = "de",
  live = true,
  now = Date.now(),
  compact = false,
) {
  const it = lang === "it",
    o = tool.observations,
    p = o?.production,
    m = o?.main,
    d = o?.deployment?.latest;
  const quality = registryQuality(tool, live, now),
    labels = it
      ? {
          verified: "Prove verificate",
          stale: "Dati non aggiornati",
          unavailable: "Informazioni non disponibili",
          legacy: "Dati legacy non verificati",
          service: "Servizio: versioni app non applicabili",
        }
      : {
          verified: "Nachweise geprüft",
          stale: "Veraltete Daten",
          unavailable: "Informationen fehlen",
          legacy: "Ungeprüfte Altdaten",
          service: "Dienst: App-Versionen nicht anwendbar",
        };
  const pairs = [
    [it ? "Qualità dati" : "Datenqualität", labels[quality]],
    [
      it ? "App pubblicata / main" : "App veröffentlicht / main",
      `${p?.app ?? "—"} / ${m?.app ?? "—"}`,
    ],
    [
      "Foundation · production / main",
      `${p?.foundation ?? "—"} / ${m?.foundation ?? "—"}`,
    ],
    [
      it ? "Foundation disponibile" : "Foundation verfügbar",
      tool.versions?.canonical?.foundation?.version ?? "—",
    ],
    [it ? "Prova dipendenza" : "Abhängigkeitsnachweis", p?.evidence ?? "—"],
    [
      it ? "Installazione / uso runtime" : "Installation / Runtime-Nutzung",
      p?.installationVerified
        ? it
          ? "Verificata"
          : "Geprüft"
        : it
          ? "Non attestati; versione da lockfile/sorgente"
          : "Nicht attestiert; Version aus Lockfile/Quellcode",
    ],
    ["Deploy", d?.state ?? "unknown"],
    [it ? "Commit pubblicato" : "Veröffentlichter Commit", p?.sha ?? "—"],
    [it ? "Commit main" : "Main-Commit", m?.sha ?? "—"],
    [
      it ? "Ultima release" : "Letztes Release",
      o?.release
        ? `${o.release.tag} · ${o.release.publishedAt ?? "—"} · ${o.release.sha ?? "—"}`
        : "—",
    ],
    [it ? "Ultimo deploy" : "Letztes Deployment", d?.updatedAt ?? "—"],
    [
      it ? "Ultima sincronizzazione" : "Letzte Synchronisation",
      tool.lastObservedAt ?? o?.observedAt ?? tool.health?.checkedAt ?? "—",
    ],
    [
      it ? "Disallineamento main/produzione" : "Abweichung Main/Produktion",
      o?.sourceDiffersFromProduction === true
        ? it
          ? "Sì"
          : "Ja"
        : o?.sourceDiffersFromProduction === false
          ? it
            ? "No"
            : "Nein"
          : "—",
    ],
    [it ? "Errori" : "Fehler", o?.errors?.join(" · ") || "—"],
  ];
  const status = `<div class="observation-status" data-quality="${quality}" role="status">${escapeHtml(labels[quality])}</div>`;
  if (compact)
    return (
      status +
      `<div class="observation-status">F ${escapeHtml(p?.foundation)} → ${escapeHtml(tool.versions?.canonical?.foundation?.version)} · Deploy ${escapeHtml(d?.state ?? "unknown")}</div>`
    );
  return (
    status +
    `<details><summary>${it ? "Versioni e pubblicazione" : "Versionen und Veröffentlichung"}</summary><dl class="observation-details">${pairs.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl></details>`
  );
}
