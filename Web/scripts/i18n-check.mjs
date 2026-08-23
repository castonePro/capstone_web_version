#!/usr/bin/env node
/**
 * 번역 키 점검 스크립트 —  npm run i18n:check
 *
 * 1) 소스에서 실제로 쓰는 t("...") 키를 모두 뽑아 ko.json에 있는지 확인
 * 2) 나머지 언어 파일이 ko.json과 같은 키 집합인지 확인 (누락/잉여)
 *
 * 동적 키(`t(`examples.${k}`)`)는 접두사까지만 검사한다.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const LOCALES = ["ko", "en", "ja", "zh-CN", "vi", "id"];
const SRC = "src";
const MESSAGES = "messages";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if ([".ts", ".tsx"].includes(extname(p))) out.push(p);
  }
  return out;
}

function flatten(obj, prefix = "") {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const nested of flatten(v, key)) out.add(nested);
    } else {
      out.add(key);
    }
  }
  return out;
}

const messages = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(join(MESSAGES, `${l}.json`), "utf8"))]),
);
const flat = Object.fromEntries(LOCALES.map((l) => [l, flatten(messages[l])]));

// ── 1) 소스에서 쓰는 키 수집 ──
const used = new Set();
const dynamicPrefixes = new Set();

for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  // const x = useTranslations("ns")  →  변수별 네임스페이스
  const aliases = new Map();
  for (const m of text.matchAll(/const\s+(\w+)\s*=\s*useTranslations\("([^"]+)"\)/g)) {
    // 같은 파일에서 변수명이 재사용될 수 있으므로 배열로 모은다
    if (!aliases.has(m[1])) aliases.set(m[1], new Set());
    aliases.get(m[1]).add(m[2]);
  }
  for (const m of text.matchAll(/\b(\w+)\(\s*(?:"([^"]+)"|`([^`]+)`)/g)) {
    const [, varName, lit, tmpl] = m;
    if (!aliases.has(varName)) continue;
    for (const ns of aliases.get(varName)) {
      if (lit != null) {
        used.add(`${ns}.${lit}`);
      } else {
        // 템플릿 리터럴: `interests.${k}` → 접두사 interests. 만 확인
        const prefix = tmpl.split("${")[0];
        if (prefix) dynamicPrefixes.add(`${ns}.${prefix}`);
      }
    }
  }
}

let failed = false;

// ── 2) ko.json에 없는 키 ──
const missingInKo = [...used].filter((k) => !flat.ko.has(k));
// 동적 접두사: ko.json에 그 접두사로 시작하는 키가 하나라도 있어야 한다
const badPrefixes = [...dynamicPrefixes].filter(
  (p) => ![...flat.ko].some((k) => k.startsWith(p)),
);

if (missingInKo.length) {
  failed = true;
  console.error(`\n✗ ko.json에 없는 키 ${missingInKo.length}개:`);
  missingInKo.sort().forEach((k) => console.error("   " + k));
}
if (badPrefixes.length) {
  failed = true;
  console.error(`\n✗ ko.json에 없는 동적 키 접두사 ${badPrefixes.length}개:`);
  badPrefixes.sort().forEach((k) => console.error("   " + k + "*"));
}

// ── 3) 언어 파일 간 키 일치 ──
for (const locale of LOCALES.filter((l) => l !== "ko")) {
  const missing = [...flat.ko].filter((k) => !flat[locale].has(k));
  const extra = [...flat[locale]].filter((k) => !flat.ko.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`\n✗ ${locale}.json`);
    if (missing.length) {
      console.error(`   누락 ${missing.length}개: ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? " …" : ""}`);
    }
    if (extra.length) {
      console.error(`   잉여 ${extra.length}개: ${extra.slice(0, 12).join(", ")}${extra.length > 12 ? " …" : ""}`);
    }
  }
}

if (!failed) {
  console.log(`✓ 번역 키 이상 없음 — ${flat.ko.size}개 키 × ${LOCALES.length}개 언어`);
  console.log(`  (소스에서 사용 중인 키 ${used.size}개, 동적 접두사 ${dynamicPrefixes.size}개)`);
} else {
  process.exit(1);
}
