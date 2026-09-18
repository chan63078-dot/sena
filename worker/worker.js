// worker.js — 세븐나이츠 리버스 메타봇 스킬 서버
// Phase 1 / Milestone 1a: 오픈빌더 스킬 요청 → 동기 응답 (콜백 없음, 5초 내)
// 데이터는 임시 스텁. 다음 단계(M1b)에서 findComp()만 Firestore 조회로 교체한다.

export default {
  async fetch(request) {
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

    // ↓ M1b에서 이 한 줄을 Firestore 조회로 바꾸면 된다.
    const comp = findComp(utterance);

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

// ── 데이터 (임시 스텁 — M1b에서 Firestore로 교체) ──────
const SAMPLE = [
  {
    콘텐츠타입: "공성전",
    조합명: "루디 (나타/리나)",
    키워드: ["공성전루디", "루디나타", "루디리나", "나타리나"],
    영웅: [
      { 이름: "리나", 진형: "앞줄", 장비: "성기사 생명력%", 부옵: "생명력 최대한", 추천펫: "윈디" },
      { 이름: "미호", 진형: "앞줄", 장비: "복수자 치확/모공%", 부옵: "치확100·약공46·모공 최대한", 코멘트: "속공 1순위" },
      { 이름: "나타", 진형: "뒷줄", 장비: "복수자 치확/모공%", 부옵: "치피·약공46·모공 최대한", 코멘트: "속공 2순위" },
    ],
    메모: "48턴에 도트 걸려있어야 쿨돔",
  },
];

function findComp(utterance) {
  const q = utterance.replace(/\s/g, "");
  return SAMPLE.find((c) => c.키워드.some((k) => q.includes(k)));
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
