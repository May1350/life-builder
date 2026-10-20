const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const apiKey = fs.readFileSync("/Users/guntak/Life-builder/.env.local", "utf-8").match(/GOOGLE_AI_API_KEY=(.*)/)[1];

// ── 8 Personas ──
const personas = [
  {
    id: "A", name: "Korean Developer 28 (high quality)", locale: "ko",
    profile: {
      age: 28, occupation: "백엔드 개발자", lifeStage: "Early Career",
      interests: ["Technology", "Health & Fitness", "Finance"],
      values: ["Growth", "Impact"],
      currentFocus: "회사에서 시니어 개발자로 성장하기 위해 시스템 설계와 코드 리뷰 역량을 키우고 있습니다. 최근 팀 리드 역할을 맡게 되어 기술 리더십도 배우는 중입니다.",
      desiredChange: "매일 야근하는 패턴을 바꾸고 싶습니다. 운동을 꾸준히 하고, 퇴근 후 개인 프로젝트에 시간을 투자하고 싶습니다.",
      neededSkills: "시스템 아키텍처 설계, 팀 커뮤니케이션, 영어 프레젠테이션 능력이 필요합니다.",
      midTermVision: "3-5년 내에 스타트업에서 CTO 또는 기술 리드로서 제품을 이끌고 싶습니다. 동시에 건강한 생활 습관을 유지하면서.",
      lifetimeDream: "기술로 사람들의 일상을 개선하는 제품을 만들고, 후배 개발자들을 멘토링하는 시니어 엔지니어가 되고 싶습니다."
    },
    routine: { freeHoursWeekday: 3, freeHoursWeekend: 7 },
    allocations: { "this-week": 35, "this-month": 25, "this-year": 20, "3-years": 10, "10-years": 7, "lifetime": 3 }
  },
  {
    id: "B", name: "Japanese Designer 35 (freelancer)", locale: "ja",
    profile: {
      age: 35, occupation: "フリーランスUIデザイナー", lifeStage: "Freelancer",
      interests: ["Arts & Design", "Business", "Health & Fitness"],
      values: ["Creativity", "Freedom", "Stability"],
      currentFocus: "クライアントワークをこなしながら、自分のデザインプロダクトを作りたいと思っています。月収が不安定で、安定した収入源を確保することも重要です。",
      desiredChange: "クライアントワークに追われる日々から脱却したい。自分のプロダクトで収入を得られるようになりたい。健康管理も怠っている。",
      neededSkills: "プロダクトマネジメント、マーケティング、フロントエンド開発の基礎が必要。",
      midTermVision: "3年以内に自分のSaaSプロダクトをローンチして、クライアントワークの比率を50%以下にしたい。",
      lifetimeDream: "デザインの力で人々の生活をより良くするプロダクトを作り続けること。経済的自由を得て、好きな場所で働きたい。"
    },
    routine: { freeHoursWeekday: 4, freeHoursWeekend: 8 },
    allocations: { "this-week": 30, "this-month": 25, "this-year": 20, "3-years": 12, "10-years": 8, "lifetime": 5 }
  },
  {
    id: "C", name: "American Student 22 (medium quality)", locale: "en",
    profile: {
      age: 22, occupation: "College Student", lifeStage: "Student",
      interests: ["Business", "Technology", "Sports"],
      values: ["Growth", "Adventure"],
      currentFocus: "I'm in my senior year majoring in business. Trying to figure out what I want to do after graduation. I've been doing some freelance web stuff on the side.",
      desiredChange: "I want to stop procrastinating and actually build something real instead of just thinking about it. Also want to get back in shape.",
      neededSkills: "I think I need to learn more about product management and maybe get better at coding. Networking too I guess.",
      midTermVision: "Work at a cool startup or maybe start my own thing. Travel a bit before settling down.",
      lifetimeDream: "Build something people actually use and love. Have financial freedom to live wherever I want."
    },
    routine: { freeHoursWeekday: 5, freeHoursWeekend: 10 },
    allocations: { "this-week": 35, "this-month": 25, "this-year": 20, "3-years": 10, "10-years": 5, "lifetime": 5 }
  },
  {
    id: "D", name: "Korean Worker 45 (career change)", locale: "ko",
    profile: {
      age: 45, occupation: "대기업 과장", lifeStage: "Career Change",
      interests: ["Education", "Finance", "Relationships"],
      values: ["Family", "Stability", "Knowledge"],
      currentFocus: "20년 다닌 회사에서의 커리어가 정체되어 있습니다. 승진이 어려운 상황에서 제2의 커리어를 준비하고 싶습니다. 교육 분야에 관심이 있어서 관련 자격증을 알아보고 있습니다.",
      desiredChange: "현재 직장에 대한 불만족이 크지만 가족 부양 책임 때문에 쉽게 그만둘 수 없습니다. 안전하게 전환할 수 있는 경로를 찾고 싶습니다.",
      neededSkills: "교육학 기초, 온라인 강의 제작 능력, 개인 브랜딩, 재무 계획 수립 능력이 필요합니다.",
      midTermVision: "3-5년 내에 교육 컨설턴트 또는 강사로 전환하고, 현재 연봉의 70% 이상을 안정적으로 벌 수 있는 기반을 만들고 싶습니다.",
      lifetimeDream: "다음 세대에게 실질적인 도움이 되는 교육자가 되고 싶습니다. 가족과 함께 안정적이고 의미 있는 삶을 살고 싶습니다."
    },
    routine: { freeHoursWeekday: 2, freeHoursWeekend: 6 },
    allocations: { "this-week": 30, "this-month": 25, "this-year": 25, "3-years": 12, "10-years": 5, "lifetime": 3 }
  },
  {
    id: "E", name: "Japanese Student 21 (low quality)", locale: "ja",
    profile: {
      age: 21, occupation: "大学生", lifeStage: "Student",
      interests: ["Technology", "Languages"],
      values: ["Growth", "Freedom"],
      currentFocus: "大学の授業とバイト",
      desiredChange: "もっと勉強したい",
      neededSkills: "プログラミングとか英語",
      midTermVision: "いい会社に入りたい",
      lifetimeDream: "自由に生きたいです"
    },
    routine: { freeHoursWeekday: 5, freeHoursWeekend: 10 },
    allocations: { "this-week": 40, "this-month": 25, "this-year": 15, "3-years": 10, "10-years": 5, "lifetime": 5 }
  },
  {
    id: "F", name: "Korean Student 20 (minimal)", locale: "ko",
    profile: {
      age: 20, occupation: "대학생", lifeStage: "Student",
      interests: ["Education", "Sports"],
      values: ["Achievement", "Health"],
      currentFocus: "학교 수업 듣고 있어요",
      desiredChange: "성적 올리고 싶어요 그리고 운동도",
      neededSkills: "공부 방법이랑 시간 관리",
      midTermVision: "좋은 회사 취직하고 싶어요",
      lifetimeDream: "행복하게 살고 싶어요 가족이랑"
    },
    routine: { freeHoursWeekday: 4, freeHoursWeekend: 9 },
    allocations: { "this-week": 40, "this-month": 30, "this-year": 15, "3-years": 8, "10-years": 5, "lifetime": 2 }
  },
  {
    id: "G", name: "American Marketer 30 (verbose unfocused)", locale: "en",
    profile: {
      age: 30, occupation: "Marketing Manager", lifeStage: "Mid Career",
      interests: ["Business", "Arts & Design", "Relationships", "Finance"],
      values: ["Creativity", "Impact", "Achievement"],
      currentFocus: "I'm managing a team of 5 at a mid-size SaaS company but honestly I feel like I'm doing a lot of things at once without really excelling at any of them. I run campaigns, manage people, do some design work, handle analytics, and sometimes even jump into customer support. I keep thinking about maybe going into consulting or starting my own agency but then I also wonder if I should just try to get promoted to VP of Marketing here.",
      desiredChange: "Everything honestly. I want more focus, more money, better health, a better relationship with my partner, more creative outlets, learn to invest properly, maybe write a book someday, get a dog, move to a nicer apartment, travel more, learn Spanish, and probably meditate or something.",
      neededSkills: "Leadership and delegation for sure. Also data analytics, personal finance, public speaking, writing, and probably some kind of mindfulness practice.",
      midTermVision: "Either be a VP of Marketing at a great company with a team of 15+ or have my own marketing consultancy with steady clients bringing in 200k+ revenue. Also be in great shape, have a solid investment portfolio, and travel at least twice a year internationally.",
      lifetimeDream: "Be known as a thought leader in growth marketing, write a book, mentor the next generation of marketers, have financial independence by 50, and live in multiple cities around the world."
    },
    routine: { freeHoursWeekday: 3, freeHoursWeekend: 8 },
    allocations: { "this-week": 30, "this-month": 25, "this-year": 20, "3-years": 12, "10-years": 8, "lifetime": 5 }
  },
  {
    id: "H", name: "Korean Entrepreneur 40 (ambitious)", locale: "ko",
    profile: {
      age: 40, occupation: "스타트업 대표", lifeStage: "Entrepreneur",
      interests: ["Business", "Technology", "Health & Fitness", "Finance"],
      values: ["Impact", "Achievement", "Family"],
      currentFocus: "시리즈A 투자를 유치하고 팀을 20명까지 확장하는 것에 집중하고 있습니다. 동시에 기술 부채를 줄이면서 제품 안정화를 진행 중입니다.",
      desiredChange: "일과 가정의 균형이 완전히 무너져 있습니다. 아이들과 보내는 시간이 거의 없고, 건강 검진에서 경고 신호가 나왔습니다. 이걸 바꾸지 않으면 오래 못 갈 것 같습니다.",
      neededSkills: "위임과 조직 관리 능력, 재무 전략, 스트레스 관리 기술이 급합니다.",
      midTermVision: "3년 내에 회사를 안정 궤도에 올리고 COO를 고용해서 운영을 위임한 뒤, 주 4일 근무로 전환하고 싶습니다.",
      lifetimeDream: "내가 만든 서비스가 100만 명 이상의 삶에 긍정적 영향을 주고, 가족과 함께 건강하게 나이 들고 싶습니다."
    },
    routine: { freeHoursWeekday: 2, freeHoursWeekend: 5 },
    allocations: { "this-week": 30, "this-month": 25, "this-year": 20, "3-years": 15, "10-years": 7, "lifetime": 3 }
  }
];

// ── System prompt (matches current ai-prompt.ts) ──
function getSystemPrompt(locale) {
  const langMap = { ko: "Korean (한국어)", ja: "Japanese (日本語)", en: "English" };
  const langInst = locale !== "en"
    ? `\n\n## Language\nAll goal titles, descriptions, coherenceThread, and starter task titles MUST be written in ${langMap[locale]}. JSON keys remain in English.`
    : "";

  return `You are a life planning AI that generates personalized goals across time horizons.${langInst}

## Output Schema
Return JSON with this structure:
- goals: object with keys "this-month", "this-year", "3-years", "10-years", "lifetime"
  Each key maps to an array of goal objects: { title, description, priority, parentIndex?, starterTasks }
  starterTasks: array of { title, estimatedMinutes, horizonKey, dueDate? }
- wheelOfLifeBalance: { career, health, relationships, finance, growth, recreation } each 1-5
- coherenceThread: 2-3 sentence narrative connecting lifetime vision to monthly actions (max 200 chars)

## Goal Framework
- lifetime (2-3 goals): Vision-based. Identity and legacy. Direction, not measurement.
- 10-years (3-4 goals): Vision-based. Concrete achievements that embody the lifetime vision.
- 3-years (3-4 goals): Milestone-based. Backward decomposition from 10-year goals.
- this-year (4-5 goals): SMART goals. Specific projects with measurable outcomes.
- this-month (3-5 goals): SMART goals. Immediate actionable targets.

## Generation Rules
1. Generate coherenceThread FIRST, then derive goals top-down: lifetime → 10-years → 3-years → this-year → this-month.
2. Each horizon MUST add specificity: lifetime=identity, 10-years=achievement, 3-years=milestone, this-year=project, this-month=action.
3. Do NOT restate the user's stated aspirations. Generate non-obvious prerequisites, parallel skills, and risk mitigation goals.
4. Priority distribution: max 2 high per horizon, rest medium or low.
5. Wheel of Life: be aware of balance across career/health/relationships/finance/growth/recreation. Inform via the balance scores, but do NOT force-fill areas the user didn't mention.

## Starter Tasks
- 2-3 per goal.
- this-month tasks: horizonKey="this-month", include dueDate (end of current month).
- this-week tasks: horizonKey="this-week", include dueDate (end of current week, Sunday).
- Longer-horizon tasks: horizonKey matches parent goal's horizon, no dueDate.
- All tasks MUST have estimatedMinutes (minimum 15).

## Goal Linking
Each goal (except lifetime) MUST include a parentIndex field — the 0-based index of its parent goal in the immediately higher horizon array.
- 10-years goals: parentIndex refers to lifetime goals array index
- 3-years goals: parentIndex refers to 10-years goals array index
- this-year goals: parentIndex refers to 3-years goals array index
- this-month goals: parentIndex refers to this-year goals array index
This creates a top-down tree: lifetime → 10-years → 3-years → this-year → this-month.
If a goal doesn't logically descend from any single parent, use the index of the closest related parent.

## Time Context
Consider the user's available free time when setting goal ambition and task estimates. Do not generate goals requiring more total time than is realistically available.`;
}

function buildUserMessage(persona) {
  const p = persona.profile;
  return `## User Profile
- Age: ${p.age}
- Occupation: ${p.occupation}
- Life Stage: ${p.lifeStage}
- Interests: ${p.interests.join(", ")}
- Core Values: ${p.values.join(", ")}

## Current State
- Most focused on: ${p.currentFocus}
- Most wants to change: ${p.desiredChange}
- Needed skills: ${p.neededSkills}

## Vision
- 3-5 year vision: ${p.midTermVision}
- Lifetime dream: ${p.lifetimeDream}

## Time Budget
- ${persona.routine.freeHoursWeekday} free hours on weekdays, ${persona.routine.freeHoursWeekend} free hours on weekends
- Allocation: ${Object.entries(persona.allocations).map(([k,v]) => k+": "+v+"%").join(", ")}`;
}

function formatResult(persona, parsed, elapsed) {
  let md = `# Persona ${persona.id}: ${persona.name}\n\n`;
  md += `**Locale:** ${persona.locale} | **Time:** ${elapsed}s\n\n`;
  md += `## Input Summary\n`;
  md += `- ${persona.profile.age}세 ${persona.profile.occupation} (${persona.profile.lifeStage})\n`;
  md += `- Free time: weekday ${persona.routine.freeHoursWeekday}h, weekend ${persona.routine.freeHoursWeekend}h\n\n`;
  md += `## Coherence Thread\n> ${parsed.coherenceThread}\n\n`;

  // Tree visualization
  md += `## Goal Tree\n\n`;
  const horizons = ["lifetime", "10-years", "3-years", "this-year", "this-month"];
  const goalsByHorizon = {};

  for (const h of horizons) {
    const goals = parsed.goals[h] || [];
    goalsByHorizon[h] = goals;
    md += `### ${h.toUpperCase()} (${goals.length} goals)\n\n`;
    for (let i = 0; i < goals.length; i++) {
      const g = goals[i];
      const parentRef = g.parentIndex !== undefined ? ` ← parent[${g.parentIndex}]` : "";
      md += `**${i}. ${g.title}** [${g.priority}]${parentRef}\n`;
      md += `> ${g.description}\n\n`;
      if (g.starterTasks?.length > 0) {
        for (const t of g.starterTasks) {
          md += `- [ ] ${t.title} (${t.estimatedMinutes}min, ${t.horizonKey}${t.dueDate ? ", due:" + t.dueDate : ""})\n`;
        }
        md += "\n";
      }
    }
  }

  // Wheel of Life
  md += `## Wheel of Life\n`;
  for (const [k, v] of Object.entries(parsed.wheelOfLifeBalance || {})) {
    const bar = "█".repeat(v) + "░".repeat(5 - v);
    md += `- ${k}: ${bar} ${v}/5\n`;
  }

  // Auto-review
  md += `\n## Auto Review\n\n`;
  let issues = [];

  // Check: parentIndex validity
  for (let hi = 1; hi < horizons.length; hi++) {
    const h = horizons[hi];
    const parentH = horizons[hi - 1];
    const goals = goalsByHorizon[h] || [];
    const parentGoals = goalsByHorizon[parentH] || [];
    for (let i = 0; i < goals.length; i++) {
      const g = goals[i];
      if (g.parentIndex === undefined) {
        issues.push(`⚠️ ${h}[${i}] "${g.title}" — missing parentIndex`);
      } else if (g.parentIndex >= parentGoals.length) {
        issues.push(`❌ ${h}[${i}] "${g.title}" — parentIndex ${g.parentIndex} out of range (${parentH} has ${parentGoals.length} goals)`);
      }
    }
  }

  // Check: task specificity (flag vague tasks)
  const vagueWords = ["research", "explore", "look into", "investigate", "조사", "리서치", "알아보", "調査", "検討", "explore"];
  for (const h of horizons) {
    for (const g of goalsByHorizon[h] || []) {
      for (const t of g.starterTasks || []) {
        if (vagueWords.some(w => t.title.toLowerCase().includes(w))) {
          issues.push(`⚠️ Vague task: "${t.title}" — should be more actionable`);
        }
      }
    }
  }

  // Check: time budget
  let totalWeeklyMinutes = 0;
  for (const g of goalsByHorizon["this-month"] || []) {
    for (const t of g.starterTasks || []) {
      if (t.horizonKey === "this-week" || t.horizonKey === "this-month") {
        totalWeeklyMinutes += t.estimatedMinutes || 0;
      }
    }
  }
  const weeklyAvailable = (persona.routine.freeHoursWeekday * 5 + persona.routine.freeHoursWeekend * 2) * 60;
  if (totalWeeklyMinutes > weeklyAvailable * 0.5) {
    issues.push(`⚠️ Task load (${totalWeeklyMinutes}min) exceeds 50% of weekly free time (${weeklyAvailable}min)`);
  }

  // Check: goal count
  for (const h of horizons) {
    const count = (goalsByHorizon[h] || []).length;
    if (count === 0) issues.push(`❌ ${h} has 0 goals`);
  }

  // Check: tree balance
  for (const h of horizons.slice(0, -1)) {
    for (let i = 0; i < (goalsByHorizon[h] || []).length; i++) {
      const nextH = horizons[horizons.indexOf(h) + 1];
      const children = (goalsByHorizon[nextH] || []).filter(g => g.parentIndex === i);
      if (children.length === 0) {
        issues.push(`⚠️ ${h}[${i}] has no children in ${nextH}`);
      }
    }
  }

  if (issues.length === 0) {
    md += "✅ No issues found\n";
  } else {
    for (const issue of issues) {
      md += `${issue}\n`;
    }
  }

  md += `\n---\n*Generated with current prompt v1*\n`;
  return md;
}

// ── Runner ──
async function testPersona(persona, retries = 3) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { temperature: 0.55, responseMimeType: "application/json" },
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`  [${persona.id}] Attempt ${attempt}/${retries}...`);
    try {
      const start = Date.now();
      const result = await model.generateContent({
        systemInstruction: getSystemPrompt(persona.locale),
        contents: [{ role: "user", parts: [{ text: buildUserMessage(persona) }] }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
      });
      const text = result.response.text();
      const cleaned = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      const parsed = JSON.parse(cleaned);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      const md = formatResult(persona, parsed, elapsed);
      const outPath = `/Users/guntak/Life-builder/docs/prompt-testing/persona-${persona.id}-result.md`;
      fs.writeFileSync(outPath, md);
      console.log(`  ✅ [${persona.id}] Done in ${elapsed}s → ${outPath}`);
      return true;
    } catch (e) {
      const status = e.status || "unknown";
      console.log(`  ❌ [${persona.id}] Failed (${status}): ${e.message.slice(0, 100)}`);
      if (attempt < retries) {
        const delay = attempt * 10;
        console.log(`  Waiting ${delay}s before retry...`);
        await new Promise(r => setTimeout(r, delay * 1000));
      }
    }
  }
  console.log(`  ⛔ [${persona.id}] All retries exhausted`);
  return false;
}

async function main() {
  console.log(`\n🧪 Testing ${personas.length} personas with current prompt\n`);
  console.log("━".repeat(50));

  let success = 0;
  let failed = 0;

  for (const p of personas) {
    console.log(`\n📋 Persona ${p.id}: ${p.name}`);
    const ok = await testPersona(p);
    if (ok) success++;
    else failed++;
  }

  console.log("\n" + "━".repeat(50));
  console.log(`\n📊 Results: ${success} success, ${failed} failed out of ${personas.length}`);
  console.log(`📁 Results saved to: docs/prompt-testing/persona-*-result.md`);
  console.log(`\n🔍 Review each file and provide feedback for prompt improvement.\n`);
}

main();
