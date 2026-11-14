import { decisionsSection, continuationSection } from "./minutesFormat";
import { planSummaryText, timeStatus } from "./clock";
import type {
  FacilitatorDecision,
  KeyExchange,
  MeetingOutcome,
  MeetingState,
  Minutes,
  Continuation,
  Participant,
  PhaseDef,
  Proposal,
  ProposalStatus,
  ResearchBrief,
  SatisfactionReport,
  SpeakerOutput,
  Stance,
  Utterance,
} from "@/lib/types";
import { getMeetingType } from "@/data/meetingTypes";
import type { ProposalTally } from "./tally";
import { hashString, nameOf, pick, resolverOf, roleTitleOf, stanceToConsent } from "./util";
import type { SpeakerUserOpts } from "./prompts";

const BASE_STANCES: Stance[] = ["support", "concern", "oppose", "neutral", "strong_support", "concern", "support"];

function roleOf(state: MeetingState, p: Participant) {
  return resolverOf(state)(p.roleId);
}

export function mockInitialStance(state: MeetingState, p: Participant): { stance: Stance; summary: string } {
  const stance = BASE_STANCES[hashString(p.id) % BASE_STANCES.length];
  const interest = roleOf(state, p)?.interests[0] ?? "自分の暮らし";
  const verb: Record<Stance, string> = {
    strong_support: "積極的に進めたい",
    support: "基本的に前向き",
    neutral: "様子を見たい",
    concern: "懸念を持っている",
    oppose: "慎重・反対寄り",
  };
  return { stance, summary: `${interest}を重視し、${verb[stance]}` };
}

export function mockStances(state: MeetingState): Record<string, { stance: Stance; summary: string }> {
  const out: Record<string, { stance: Stance; summary: string }> = {};
  for (const p of state.config.participants) out[p.id] = mockInitialStance(state, p);
  return out;
}

// ---------- Research ----------

const APPROACHES = [
  "役所の統計資料と白書を中心に、数字で現状を確認した。",
  "SNSや掲示板で、同じ立場の人たちの生の声を集めた。",
  "業界紙や専門誌の記事をたどり、他の地域・他国の事例を調べた。",
  "自分の職場や仲間に聞き取りをして、現場の実感を整理した。",
  "新聞の過去記事と国会・議会の議事録を読んで、これまでの経緯を押さえた。",
  "関連する論文や調査報告を探して、エビデンスを確認した。",
];

export function mockBrief(state: MeetingState, p: Participant): ResearchBrief {
  const role = roleOf(state, p);
  const topic = state.config.topic;
  const approach = pick(APPROACHES, p.id + "ap");
  const interest = role?.interests[0] ?? "自分の暮らし";
  const concern = role?.concerns[0] ?? "負担の増加";
  const q = [`${topic} 現状`, `${topic} ${roleTitleOf(p, resolverOf(state))} 影響`, `${topic} 事例 海外`].slice(0, 2 + (hashString(p.id) % 2));
  const sources = [
    { title: `${topic}に関する調査（ダミー）`, url: `https://example.com/mock/${hashString(p.id + "a") % 1000}` },
    { title: `${roleTitleOf(p, resolverOf(state))}の現場から（ダミー）`, url: `https://example.org/mock/${hashString(p.id + "b") % 1000}` },
  ];
  return {
    participantId: p.id,
    status: "done",
    queries: q,
    approach,
    summary: `${approach}「${topic}」は、${interest}に直結する話だと分かった。一方で${concern}という声も多く、数字だけでは見えない事情がある。会議では自分の立場の事情を具体的に伝えたい。`,
    keyFacts: [
      { fact: `${topic}をめぐっては、地域や立場によって受け止めが大きく割れている。`, source: sources[0] },
      { fact: `${roleTitleOf(p, resolverOf(state))}の立場では、${concern}が最大の関心事になっている。`, source: sources[1] },
    ],
    talkingPoints: [`${interest}を守れる形にしてほしい`, `${concern}への手当てを先に示すべき`],
    questionsToRaise: [`費用は誰がどう負担するのか`, `やってみてうまくいかなかったときの見直しの仕組みは`],
    sources,
  };
}

// ---------- Facilitator ----------

export function mockFacilitatorLite(
  state: MeetingState,
  phase: PhaseDef,
  nextId: string,
  first: boolean,
): { facilitatorRemark: string; prompt: string; innerThought: string } {
  const nm = nameOf(state, nextId);
  const remark = first
    ? `それでは「${phase.name}」に入ります。${phase.goal}`
    : pick([`では、${nm}さん、お願いします。`, `続いて${nm}さんのお考えを伺います。`, `${nm}さん、いかがでしょうか。`], `${nextId}${state.turn}`);
  return {
    facilitatorRemark: remark,
    prompt: `${phase.name}として、自分の立場から率直に、具体例を交えて話してください。`,
    innerThought: `まだ発言の少ない人に回して、バランスをとりたい。`,
  };
}

export function mockFacilitatorFree(
  state: MeetingState,
  phase: PhaseDef,
  nextId: string,
  first: boolean,
  phaseElapsedMin: number,
  plannedMin: number,
): FacilitatorDecision {
  const lite = mockFacilitatorLite(state, phase, nextId, first);
  const lastSpeech = [...state.utterances].reverse().find((u) => u.kind === "speech");
  const target = lastSpeech ? nameOf(state, lastSpeech.speakerId) : "";
  return {
    nextSpeakerId: nextId,
    facilitatorRemark: state.turn % 3 === 1 ? "" : lite.facilitatorRemark,
    prompt: target
      ? `${target}さんの直前の発言に応じて、賛成か懸念かを具体的に述べてください。`
      : lite.prompt,
    advancePhase: phaseElapsedMin >= plannedMin * 0.85,
    endMeeting: false,
    innerThought: lite.innerThought,
  };
}

// ---------- Speaker ----------

const TEXT: Record<Stance, string[]> = {
  strong_support: [
    "{topic}は、ぜひ進めるべきだと思います。{interest}を守るうえで、これ以上先送りはできません。",
    "私は全面的に賛成です。現場を見ていると、{interest}のためにも今動くしかないと感じます。",
  ],
  support: [
    "{topic}の方向性には賛成です。ただ、{concern}にどう配慮するかは詰めておきたいですね。",
    "基本的には前向きです。{interest}につながるなら、条件を整えて進めるのがよいと思います。",
  ],
  neutral: [
    "{topic}については、まだ判断材料が足りないと感じています。{other}さんの話をもう少し聞きたいです。",
    "良い面も悪い面もあると思います。{interest}と{concern}、どちらを優先するのかを整理しませんか。",
  ],
  concern: [
    "{topic}には懸念があります。特に{concern}が置き去りにならないか心配です。",
    "{other}さんの案は理解できますが、{concern}への手当てがないと、現場は納得しないと思います。",
  ],
  oppose: [
    "今のままの{topic}には反対です。{concern}という現実を無視して進めるべきではありません。",
    "{other}さん、お言葉ですが、それでは{interest}が守れません。受け入れがたいです。",
  ],
};

const THOUGHT: Record<Stance, string> = {
  strong_support: "ここは押し切りたい。反対が出る前に勢いをつけておく。",
  support: "賛成だが、自分の側の負担が増えない形にしておきたい。",
  neutral: "まだ得になるのか損になるのか読めない。もう少し様子を見る。",
  concern: "表向きは懸念と言うが、本当は自分の立場が危うくなるのが怖い。",
  oppose: "ここで譲ると組織に戻って説明がつかない。見返りがなければ折れられない。",
};

function mockChairText(state: MeetingState, p: Participant, phase: PhaseDef, base: string, opts: SpeakerUserOpts): string {
  const phases = getMeetingType(state.config.meetingTypeId).phases;
  const co = state.config.carryOver;
  const timeUp = !!state.clock?.timeUp;
  const note = opts.timeNote ?? "";
  if (state.phaseIndex === 0) {
    const plan = state.clock ? planSummaryText(state.config.durationMinutes, state.clock, phases) : "";
    const recap = co
      ? `第${co.sessionNumber}回です。前回は「${co.continuation.reachedPoint.slice(0, 60)}」まで進みました。今回は「${co.continuation.nextStartPoint.slice(0, 60)}」から始めます。`
      : "";
    return `${state.config.topic}について、${phase.name}を始めます。${recap}${plan}`;
  }
  if (state.phaseIndex === phases.length - 1) {
    return timeUp
      ? `${note}本日はここまでとします。まとまった点は確認できましたが、残った論点は持ち越しです。次回は、各立場の費用負担の考え方の整理から始めましょう。`
      : `${note}本日の議論はここまでとします。確認できた方向性と、残る課題を踏まえて、今後の進め方を詰めていきましょう。ありがとうございました。`;
  }
  return note + base;
}

export function mockSpeaker(state: MeetingState, p: Participant, phase: PhaseDef, opts: SpeakerUserOpts = {}): SpeakerOutput {
  const role = roleOf(state, p);
  const n = state.config.participants.length;
  const progress = state.phaseIndex / Math.max(1, getMeetingType(state.config.meetingTypeId).phases.length - 1);
  let stance = BASE_STANCES[(hashString(p.id) + Math.floor(state.turn / 5)) % BASE_STANCES.length];
  // later in the meeting people drift toward compromise
  if (progress > 0.6 && stance === "oppose") stance = "concern";
  if (progress > 0.75 && stance === "concern" && hashString(p.id + "c") % 2 === 0) stance = "neutral";
  const others = state.config.participants.filter((x) => x.id !== p.id);
  // Respond to the previous speaker when there is one (so exchanges are real), otherwise to someone else.
  const prevSpeech = [...state.utterances].reverse().find((u) => u.kind === "speech" && u.speakerId !== p.id);
  const prevSpeaker = prevSpeech ? others.find((x) => x.id === prevSpeech.speakerId) : undefined;
  const other = prevSpeaker ?? (others.length ? others[(hashString(p.id) + state.turn) % others.length] : p);
  const fill = (t: string) =>
    t
      .replaceAll("{topic}", state.config.topic)
      .replaceAll("{interest}", role?.interests[hashString(p.id + state.turn) % (role?.interests.length || 1)] ?? "暮らし")
      .replaceAll("{concern}", role?.concerns[hashString(p.id + "k" + state.turn) % (role?.concerns.length || 1)] ?? "負担")
      .replaceAll("{other}", other.name);
  let text = fill(pick(TEXT[stance], `${p.id}${state.turn}`));
  if (opts.ledByChair) text = mockChairText(state, p, phase, text, opts);
  else if (state.clock) {
    const st = timeStatus(state.clock, state.config.durationMinutes, state.phaseIndex);
    if (st === "押している" || st === "超過") text = text.split("。")[0] + "。";
  }
  const ref = state.research?.[p.id];
  if (ref?.status === "done" && state.turn % 4 === 0 && ref.keyFacts[0]) text += `調べたところ、${ref.keyFacts[0].fact}`;
  const innerThought = role?.privateConcerns[0] ? `${THOUGHT[stance]}（${role.privateConcerns[0]}）` : THOUGHT[stance];

  const proposals = state.minutes.proposals;
  const ideaPhase = !["opening", "closing"].includes(phase.id);
  let newProposal: SpeakerOutput["newProposal"] = null as unknown as undefined;
  newProposal = undefined;
  const chairDraft = !!opts.ledByChair && /案|提言|合意|とりまとめ/.test(phase.name) && !/閉会|開会/.test(phase.name);
  if ((ideaPhase && proposals.length < Math.max(2, Math.min(4, n)) && state.turn % 4 === 1) || chairDraft) {
    const i = proposals.length + 1;
    const shapes = [
      { title: `段階的に導入し、${role?.concerns[0] ?? "負担"}に配慮する`, kind: "policy" as const },
      { title: `${role?.interests[0] ?? "当事者の声"}を守るための支援策を設ける`, kind: "recommendation" as const },
      { title: `1年後に効果を検証し、見直す仕組みを置く`, kind: "condition" as const },
      { title: `費用負担のルールを先に決める`, kind: "decision" as const },
    ];
    const s = shapes[(i - 1) % shapes.length];
    newProposal = {
      title: s.title,
      body: `${p.name}（${roleTitleOf(p, resolverOf(state))}）の提案。${state.config.topic}について、${s.title}。具体的な進め方は、関係者で協議して決める。`,
      kind: s.kind,
    };
  }
  const proposalStances = proposals.map((pr) => {
    const arr: Stance[] = ["support", "support", "concern", "neutral", "strong_support", "oppose"];
    const bias = progress > 0.5 ? 0 : 2;
    return { id: pr.id, stance: arr[(hashString(p.id + pr.id) + bias) % arr.length] };
  });
  return {
    text,
    innerThought,
    stance,
    addressedTo: (stance === "support" || stance === "strong_support") && state.turn % 3 !== 0 ? [] : other.id !== p.id ? [other.id] : [],
    newProposal,
    proposalStances: Object.fromEntries(proposalStances.map((x) => [x.id, x.stance])),
  };
}

// ---------- Scribe ----------

export function mockScribe(state: MeetingState, prev: Minutes, newTurn: number): Minutes {
  const parts = state.config.participants;
  const recent = state.utterances.slice(-6);
  const summary = recent
    .filter((u) => u.kind === "speech")
    .map((u) => `${nameOf(state, u.speakerId)}は${u.text.slice(0, 40)}との意見を述べた。`)
    .join("")
    .slice(0, 480);
  const phases = getMeetingType(state.config.meetingTypeId).phases.slice(0, state.phaseIndex + 1);
  const agendaItems = phases.map((ph) => ({
    phaseId: ph.id,
    title: ph.name,
    points: state.utterances
      .filter((u) => u.phaseId === ph.id && u.kind === "speech")
      .slice(-3)
      .map((u) => `${nameOf(state, u.speakerId)}：${u.text.slice(0, 50)}`),
  }));
  const proposals: Proposal[] = prev.proposals.map((pr) => {
    const vals = Object.values(pr.support);
    const ok = vals.filter((s) => s === "support" || s === "strong_support").length;
    const bad = vals.filter((s) => s === "oppose").length;
    const status: ProposalStatus =
      vals.length < 2 ? "draft" : ok >= parts.length * 0.7 && bad === 0 ? "agreed" : ok >= parts.length * 0.5 ? "conditionally_agreed" : "discussing";
    return { ...pr, status };
  });
  const issues = proposals.map((pr) => ({
    id: `issue_${pr.id}`,
    title: `「${pr.title}」をどう進めるか`,
    positions: parts.map((p) => {
      const role = roleOf(state, p);
      return {
        participantId: p.id,
        position: `${pr.support[p.id] ? "意見表明済み" : "未表明"}：${role?.concerns[0] ?? "条件の確認"}を踏まえて判断`,
        interest: role?.interests[0] ?? "暮らしの安定",
        stance: pr.support[p.id] ?? "neutral",
      };
    }),
    landingZone: pr.status === "agreed" || pr.status === "conditionally_agreed" ? `${pr.title}を、条件つきで段階的に進める` : "",
    resolved: pr.status === "agreed",
  }));
  const keyExchanges: KeyExchange[] = [...prev.keyExchanges];
  const spoken = state.utterances.filter((u) => u.kind === "speech");
  const bad = (s?: Stance) => s === "oppose" || s === "concern";
  const mk = (a: Utterance, b: Utterance, kind: KeyExchange["kind"]): KeyExchange => ({
    id: `kx_${b.id}`,
    title: `${nameOf(state, a.speakerId)}と${nameOf(state, b.speakerId)}のやりとり`,
    kind,
    utteranceIds: [a.id, b.id],
    participantIds: [a.speakerId, b.speakerId],
    summary:
      kind === "conflict"
        ? `${nameOf(state, b.speakerId)}が${nameOf(state, a.speakerId)}の発言に対し、立場の違いを明らかにした。`
        : kind === "concession"
          ? `${nameOf(state, a.speakerId)}の懸念に対し、${nameOf(state, b.speakerId)}が歩み寄る姿勢を見せた。`
          : `${nameOf(state, a.speakerId)}と${nameOf(state, b.speakerId)}の間で、何を優先し何を手放すかの取引が浮かんだ。`,
    significance: "論点の対立軸が見え、その後の調整の出発点になった。",
  });
  // Pairs where the second speaker answers the first.
  const pairs: [Utterance, Utterance][] = [];
  for (let i = 1; i < spoken.length; i++) {
    const a = spoken[i - 1];
    const b = spoken[i];
    if (a.speakerId !== b.speakerId && (b.addressedTo?.includes(a.speakerId) || bad(a.stance) !== bad(b.stance))) pairs.push([a, b]);
  }
  const want: KeyExchange["kind"][] = ["conflict", "concession", "tradeoff"];
  const have = (id: string) => keyExchanges.some((k) => k.id === id);
  for (const kind of want) {
    if (keyExchanges.length >= 3) break;
    if (keyExchanges.some((k) => k.kind === kind)) continue;
    const hit =
      kind === "conflict"
        ? pairs.find(([a, b]) => !bad(a.stance) && bad(b.stance) && !have(`kx_${b.id}`))
        : kind === "concession"
          ? pairs.find(([a, b]) => bad(a.stance) && !bad(b.stance) && !have(`kx_${b.id}`))
          : pairs.find(([, b]) => !have(`kx_${b.id}`));
    if (hit) keyExchanges.push(mk(hit[0], hit[1], kind));
  }
  // Still short of 3: fill with the first unused pairs.
  for (const [a, b] of pairs) {
    if (keyExchanges.length >= 3) break;
    if (!have(`kx_${b.id}`)) keyExchanges.push(mk(a, b, want[keyExchanges.length % want.length]));
  }
  return { summary: summary || prev.summary, agendaItems, issues, proposals, keyExchanges, coveredThroughTurn: newTurn };
}

// ---------- Closing ----------

export function mockSatisfaction(state: MeetingState, p: Participant, tallies: ProposalTally[]): SatisfactionReport {
  const init = state.initialStances?.[p.id]?.stance ?? "neutral";
  const mine = state.minutes.proposals.map((pr) => pr.support[p.id]).filter(Boolean) as Stance[];
  const avg = mine.length ? mine.reduce((a, s) => a + stanceToConsent(s), 0) / mine.length : 3;
  const jitter = (hashString(p.id + "sat") % 21) - 10;
  const score = Math.max(8, Math.min(96, Math.round(avg * 18 + 6 + jitter)));
  const consent = (score >= 80 ? 5 : score >= 62 ? 4 : score >= 45 ? 3 : score >= 28 ? 2 : 1) as 1 | 2 | 3 | 4 | 5;
  const to: Stance = consent >= 5 ? "strong_support" : consent === 4 ? "support" : consent === 3 ? "neutral" : consent === 2 ? "concern" : "oppose";
  const role = roleOf(state, p);
  const agreed = tallies.filter((t) => t.status === "agreed" || t.status === "conditionally_agreed").length;
  const votes: Record<string, Stance> = {};
  for (const pr of state.minutes.proposals) votes[pr.id] = pr.support[p.id] ?? init;
  return {
    participantId: p.id,
    votes,
    score,
    consent,
    agreedPoints: [agreed ? `合意に至った${agreed}件の方向性は受け入れられる` : "議論の場が持てたこと", `${role?.interests[0] ?? "自分の関心"}が議題に載ったこと`],
    disagreedPoints: consent <= 3 ? [`${role?.concerns[0] ?? "負担"}への手当てが十分でない`] : [],
    remainingConcerns: [`${role?.concerns[1] ?? role?.concerns[0] ?? "実施後の運用"}はまだ不安`],
    hopes: [`実施後に${role?.interests[0] ?? "状況"}を確認する場を設けてほしい`],
    comment:
      consent >= 4
        ? "思ったより前に進んだと思う。細部はこれからだけど、納得しています。"
        : consent === 3
          ? "完全には納得していないけれど、受け入れられる範囲です。"
          : "正直、自分の事情は十分に汲まれていない。このままでは持ち帰って説明しづらい。",
    stanceShift: { from: init, to, reason: to === init ? "議論を聞いても基本的な考えは変わらなかった" : "他の参加者の事情を聞いて、考えが動いた" },
  };
}

export function mockContinuation(state: MeetingState, reports: SatisfactionReport[], decisions: Proposal[], unresolved: string[]): Continuation {
  const timeUp = !!state.clock?.timeUp;
  const ok = decisions.filter((d) => d.status === "agreed" || d.status === "conditionally_agreed");
  const open = decisions.filter((d) => !(d.status === "agreed" || d.status === "conditionally_agreed"));
  const convergence: Continuation["convergence"] = timeUp
    ? "not_converged"
    : open.length === 0 && decisions.length > 0
      ? "converged"
      : ok.length > 0
        ? "partially"
        : "not_converged";
  const dissent = reports.filter((r) => r.consent <= 2).slice(0, 3);
  return {
    convergence,
    reachedPoint: ok.length
      ? `${decisions.length}件の案のうち${ok.length}件で方向性が一致した。${open.length ? `残り${open.length}件は意見が分かれたまま。` : ""}`
      : `各立場の主張と利害は出そろったが、案としての合意には届かなかった。`,
    agreedSoFar: ok.map((d) => d.title),
    openIssues: [...open.map((d) => d.title), ...unresolved].slice(0, 6),
    nextStartPoint: open[0] ? `「${open[0].title}」をめぐる対立点の整理から始める。` : "合意した内容の実施条件の確認から始める。",
    nextAgenda: [...open.slice(0, 3).map((d) => `「${d.title}」の条件と代替案`), "費用負担と検証方法の案"].slice(0, 4),
    homework: dissent.map((r) => ({
      participantId: r.participantId,
      task: r.remainingConcerns[0] ? `「${r.remainingConcerns[0]}」を解消する具体案を用意する` : "譲れる線と譲れない線を整理してくる",
    })),
    timeUp,
  };
}

export function mockOutcome(state: MeetingState, reports: SatisfactionReport[], tallies: ProposalTally[]): MeetingOutcome {
  const type = getMeetingType(state.config.meetingTypeId);
  const parts = state.config.participants;
  let proposals = state.minutes.proposals;
  if (!proposals.length) {
    proposals = [
      {
        id: "final_1",
        title: `${state.config.topic}について、関係者の協議を継続する`,
        body: "具体案は出なかったが、論点を整理したうえで継続して協議する。",
        proposedBy: state.config.facilitatorId,
        kind: "decision",
        status: "deferred",
        support: {},
        history: [],
      },
    ];
  }
  const byId = new Map(tallies.map((t) => [t.proposalId, t]));
  const decisions = proposals.map((pr) => ({
    ...pr,
    status: byId.get(pr.id)?.status ?? "deferred",
    support: byId.get(pr.id)?.stances ?? pr.support,
    conditions: pr.status === "conditionally_agreed" || byId.get(pr.id)?.status === "conditionally_agreed" ? ["実施後1年を目安に見直す", "負担が集中する立場への支援を併せて検討する"] : pr.conditions,
  }));
  const unresolved = [`${state.config.topic}の費用負担の配分`, "実施後の効果を誰がどう検証するか"];
  const continuation = mockContinuation(state, reports, decisions, unresolved);
  const date = new Date(state.config.createdAt).toLocaleDateString("ja-JP");
  return {
    title: type.outputTitle,
    executiveSummary: `「${state.config.topic}」について${parts.length}人で${state.turn}ターン協議した。${decisions.length}件の案を検討し、${decisions.filter((d) => d.status === "agreed" || d.status === "conditionally_agreed").length}件で一定の合意が得られた。残る論点は継続して協議する。`,
    decisions,
    landingZone: `各立場が最優先の利害を守りつつ、段階的な導入と定期的な見直しを条件に折り合う。負担が集中しやすい立場には支援を手当てし、推進側は導入のペースを緩めることで歩み寄った。`,
    stakeholderClaims: parts.map((p) => ({
      participantId: p.id,
      claim: `${roleOf(state, p)?.interests[0] ?? "自分の暮らし"}を守りたい。`,
      coreInterest: roleOf(state, p)?.concerns[0] ? `${roleOf(state, p)?.concerns[0]}を避けること` : "安心して暮らせること",
    })),
    keyExchanges: state.minutes.keyExchanges,
    satisfaction: reports,
    unresolvedIssues: unresolved,
    continuation,
    nextSteps: ["論点を整理した資料を各自が持ち帰って確認する", "費用負担と検証方法について、次回までに案を用意する"],
    minutesMarkdown: [
      `# ${state.config.topic} ${type.name} 議事録`,
      `- 日時：${date}`,
      `- 出席者：${parts.map((p) => `${p.name}（${roleTitleOf(p, resolverOf(state))}）`).join("、")}`,
      `- 議題：${state.config.topic}`,
      `## 議事概要`,
      state.minutes.summary || "（概要なし）",
      decisionsSection(decisions),
      continuationSection(continuation, (id) => nameOf(state, id)),
      `## 今後の予定`,
      `- 継続協議`,
    ].join("\n"),
  };
}
