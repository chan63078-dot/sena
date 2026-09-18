// worker.js — 세븐나이츠 리버스 메타봇 스킬 서버
// Phase 1 / Milestone 1b: 오픈빌더 스킬 요청 → Firestore `공개` 컬렉션 조회 → 동기 응답(5초 내)

export default {
  async fetch(request, env) {
    // 오픈빌더는 POST로 스킬 요청을 보낸다. 그 외 요청은 헬스체크로 처리.
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json(skillText("요청을 이해하지 못했어요."));
    }

    const utterance = (body?.userRequest?.utterance || "").trim();
    const comp = await findComp(utterance, env);

    if (!comp) {
      return json(skillText(
        `"${utterance}"에 맞는 공략을 아직 못 찾았어요.\n예: "공성전 루디"처럼 물어봐 주세요.`
      ));
    }

    return json(skillText(formatComp(comp)));
  },
};

// ── 오픈빌더 응답 헬퍼 ───────────────────────────────
function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "content-type": "application/json" },
  });
}

function skillText(text) {
  return {
    version: "2.0",
    template: { outputs: [{ simpleText: { text } }] },
  };
}

// ── Firestore 조회 (M1b: `공개` 컬렉션, public-read) ────
async function findComp(utterance, env) {
  const q = utterance.replace(/\s/g, "");
  const comps = await fetchPublicComps(env.FIRESTORE_PROJECT_ID);
  return comps.find((c) => (c.키워드 || []).some((k) => q.includes(k)));
}

async function fetchPublicComps(projectId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/공개`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || []).map((doc) => unwrapFields(doc.fields));
}

// Firestore REST 문서 형식({ stringValue, arrayValue, mapValue, ... })을 평범한 JS 값으로 변환
function unwrapFields(fields) {
  const obj = {};
  for (const [key, value] of Object.entries(fields || {})) {
    obj[key] = unwrapValue(value);
  }
  return obj;
}

function unwrapValue(value) {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue !== undefined) return (value.arrayValue.values || []).map(unwrapValue);
  if (value.mapValue !== undefined) return unwrapFields(value.mapValue.fields);
  return null;
}

function formatComp(c) {
  const heroes = c.영웅
    .map((h) => {
      const lines = [`▸ ${h.이름} (${h.진형})`];
      if (h.장비) lines.push(`  장비: ${h.장비}`);
      if (h.부옵) lines.push(`  부옵: ${h.부옵}`);
      if (h.추천펫) lines.push(`  펫: ${h.추천펫}`);
      if (h.코멘트) lines.push(`  · ${h.코멘트}`);
      return lines.join("\n");
    })
    .join("\n\n");

  return `[${c.콘텐츠타입}] ${c.조합명}\n\n${heroes}${c.메모 ? `\n\n메모: ${c.메모}` : ""}`;
}
