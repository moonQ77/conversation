/* =========================================================
   규칙 기반 판정기 (API 키 없이 브라우저에서 바로 동작)
   - 학생 발언을 문장 단위로 나눠 낱말·표현 패턴으로 설득 전략과 걱정 해결을 판정
   - 결과 형식은 예전 AI 응답과 같음: {front, reply, mood, strategies, concerns, boothSpecified, feedback, acceptReply}
   - 판정 기준을 고치려면 아래 PAT, CONCERN_KEYS 의 정규식을 고치면 됨
   ========================================================= */
const PAT = {
  tantrum: /그냥\s*(사|해|허락)|제발|사\s*줘[!~]*$|안\s*(사|해)\s*주면|울\s*거|가출|짜증|미워|치사|왜\s*안\s*(돼|되)|다른\s*애들은\s*다|나만\s*없/,
  rude: /바보|멍청|닥쳐|꺼져|시끄러/,
  stat: /\d+(\.\d+)?\s*(%|퍼센트|프로)|통계|설문|조사\s*(결과|에\s*따르면)|\d+\s*명\s*중|평균|비율/,
  expert: /전문가|박사|교수|의사|수의사|연구(에|결과|팀|소)|에\s*따르면|기관|협회|교육부|보건|뉴스|기사|보고서|논문/,
  source: /(\d{4}\s*년|연구소|협회|교육부|보건복지부|통계청|청|대학|신문|뉴스|기사|보고서|논문|책|사이트|홈페이지|기관)/,
  readIt: /(찾아\s*(보|봤|읽)|읽어\s*(보|봤)|직접\s*(찾|읽|조사|확인)|검토|조사해\s*(보|봤))/,
  analogy: /처럼|듯이|마찬가지|와\s*같이|과\s*같이|비슷하게|비유하면|같은\s*원리/,
  conclude: /그러(니까|므로|니)|따라서|그래서|결국|그렇기\s*때문에/,
  general: /(모든|누구나|대부분|모두|다들|일반적으로|원래|라면\s|이면\s|면\s*다)/,
  fact: /\d+\s*(년|개월|달|시간|분|번|살|만\s*원|천\s*원|원|기가|GB|인치|배)|고장|꺼지|꺼져|깨졌|깨져|안\s*(켜|돼|되|열려)|실행(이)?\s*안|느려|배터리/,
  subjective: /너무\s*(낡|오래|불편|구려|별로)|친구들은\s*다|다\s*있(어|는)/,
  emo: /행복|뿌듯|기쁘|기뻐|기쁠|좋아하실|좋으실|외로|슬프|슬퍼|아쉽|아쉬|추억|사랑|고마|감사|자랑스|속상|힘들|설레|웃으|웃는|걱정\s*끼|마음이|소중|그리워|그립|미안/,
  ethDeed: /(지난|작년|재작년|그동안|지금까지|매일|꾸준히|한\s*번도|여태|\d+\s*(년|달|개월|주)\s*(동안|째|내내)).{0,40}(지켰|해\s*왔|했|모았|모아\s*왔|늦지|어긴\s*적|빠진\s*적|안\s*했|않았)/,
  ethExp: /(해\s*본\s*적|경험|해\s*봤|키워\s*봤|가\s*봤|다녀왔|맡아\s*봤|운영해\s*봤|해\s*본\s*결과)/,
  ethClaim: /성실|진심|믿어\s*(줘|주세요)|약속할게|약속해|책임질게|최선을/,
  promise: /(게요|할게|겠어요|겠습니다|하겠|약속할|약속해)/,
  method: /매일|매주|하루|주말|씩|부터|마다|시간|방법|정해서|당번|규칙|앱|잠금|맡길|모아서|아껴서/,
  target: /\d+\s*(점|%|만\s*원|천\s*원|원|등|시간|분|번|개월|달|주)|까지/,
  boothWhat: /체험|판매|전시|게임|실험|만들기|공연|퀴즈|카페|사진|포토|타로|방탈출/,
  boothHow: /교실|운동장|강당|복도|\d+\s*명|역할|순서|교대|운영|예약|번호표|입장|선착순/
};
const CONCERN_KEYS = {
  item:{1:/돈|가격|용돈|모아|모은|저축|중고|할인|반값|보태|비싸|만\s*원|부담/, 2:/공부|사용\s*시간|성적|잠금|맡기|맡길|제한|시험|게임|중독/, 3:/필요|낡|오래|고장|안\s*(돼|되|켜)|수업|과제|수행|기능|배터리|느려|꺼지/},
  trip:{1:/안전|위험|보험|사고|조심|밤|늦게|구급|비상/, 2:/계획|일정|연락|숙소|예약|기차|버스|위치|공유|전화|시간표/, 3:/돈|비용|경비|용돈|모아|모은|만\s*원|부담/},
  pet:{1:/돌보|돌볼|산책|밥|배변|챙기|책임|당번|키울|씻기/, 2:/돈|사료|병원|용돈|비용|예방|접종|만\s*원|부담/, 3:/털|청소|위생|혼자|목욕|빗질|펫캠|외로|집에\s*있/},
  booth:{1:/안전|질서|사고|담당|규칙|감독|소화기|줄\s*서|정리/, 2:/수업|공부|점심|방과\s*후|쉬는\s*시간|준비\s*기간|역할\s*분담|지장/, 3:/배우|경험|의미|참여|협동|진로|추억|필요|축제/}
};

/* 청자별 말투 */
const TALK = {
  mom:{ 이성:'그렇게 근거를 대니까 일리가 있네.', 감성:'아이고, 그렇게 말하니 엄마 마음이 좀 약해지네.', 인성:'그래, 네가 그렇게까지 하는 걸 보니 믿음이 간다.',
        부족:'음, 그것만으로는 잘 모르겠어. 다른 이유를 더 말해 봐.', 떼쓰기:'그렇게 조른다고 되는 게 아니야. 엄마가 납득할 이유를 말해 봐.',
        막연:'말로만 약속하면 엄마가 어떻게 믿어? 어떻게, 얼마나 할 건데?', 해결:'그렇게 하면 그 걱정은 좀 덜겠네.', 거의:'엄마 마음이 거의 넘어갔어. 하나만 더 말해 봐.' },
  dad:{ 이성:'음, 근거가 있으니 아빠도 고개가 끄덕여지는구나.', 감성:'허허, 그렇게 말하니 아빠도 마음이 좀 움직이네.', 인성:'네가 그렇게 해 왔다면 아빠도 믿어 볼 만하다.',
        부족:'그것만으로는 아직 잘 모르겠다. 다른 이유도 들어 보자.', 떼쓰기:'떼쓴다고 되는 일이 아니다. 아빠가 납득할 이유를 말해 봐라.',
        막연:'약속은 좋은데, 구체적으로 어떻게, 얼마나 할 건지 말해 봐라.', 해결:'그렇게 하면 그 걱정은 좀 덜겠구나.', 거의:'아빠 마음이 거의 기울었다. 하나만 더 말해 봐라.' },
  teacher:{ 이성:'근거를 들어 말하니 설득력이 있구나.', 감성:'그 마음은 선생님도 충분히 이해가 되는구나.', 인성:'그렇게 해 왔다니 선생님도 믿음이 가는구나.',
        부족:'음, 그것만으로는 아직 부족한 것 같구나. 이유를 더 들려줄래?', 떼쓰기:'그렇게 말하면 선생님이 들어주기 어렵단다. 이유를 차분히 말해 보렴.',
        막연:'다짐은 좋지만, 구체적으로 어떻게 할 건지 말해 줄 수 있니?', 해결:'그렇게 하면 그 걱정은 덜 수 있겠구나.', 거의:'선생님 생각이 거의 바뀌었어. 하나만 더 말해 보렴.' }
};
const ASK = {
  item:{1:'그래도 너무 비싸잖아. 그 돈은 어떻게 할 건데?', 2:'근데 그게 생기면 공부는 언제 해? 그게 제일 걱정이야.', 3:'지금 쓰는 것도 멀쩡한데, 왜 꼭 새로 사야 해?'},
  trip:{1:'그래도 어른 없이 가면 위험하지 않겠니?', 2:'숙소랑 일정, 연락은 어떻게 할 건지 아직 모르겠다.', 3:'경비는 어떻게 마련할 거니?'},
  pet:{1:'그래도 매일 밥 주고 산책시키는 건 누가 하냐?', 2:'사료값에 병원비까지, 돈은 어떻게 하려고?', 3:'털 날리는 거랑, 다들 나가면 혼자 남는 건 어떻게 할래?'},
  booth:{1:'안전 관리는 어떻게 할 생각이니?', 2:'준비하느라 수업에 지장이 생기지는 않을까?', 3:'그런데 부스가 꼭 필요한 이유는 뭐니?', plan:'어떤 부스를 어디서 몇 명이 어떻게 운영할 건지 말해 보렴.'}
};
const ACCEPT = {
  item:'그래, 네 말을 들으니 엄마가 설득됐어. 사 줄게. 대신 약속은 꼭 지켜!',
  trip:'좋아, 그렇게 준비했다면 아빠가 허락하마. 대신 도착하면 꼭 연락해라.',
  pet:'좋다, 그렇게 책임지겠다면 한번 키워 보자. 약속은 꼭 지켜야 한다.',
  booth:'좋아, 그 계획이라면 선생님이 회의에서 건의해 볼게. 안전 규칙은 꼭 지키자.'
};

function sentencesOf(t){ return (t.match(/[^.?!…\n]+[.?!…]*/g)||[t]).map(s=>s.trim()).filter(Boolean); }
function quoteOf(sents, re){ const s = sents.find(x=>re.test(x)) || sents[0] || ''; return s.length>40 ? s.slice(0,38)+'…' : s; }
function count(re, t){ const g = new RegExp(re.source, 'g'); return (t.match(g)||[]).length; }

function localJudge(utter){
  const t = utter.replace(/\s+/g,' ').trim(), S = sentencesOf(t);
  const hard = state.level==='hard', easy = state.level==='easy';
  const out = []; // strategies
  const add = (type, valid, re, reason)=>out.push({type, valid, quote:quoteOf(S, re), reason});

  const tantrum = PAT.tantrum.test(t) || PAT.rude.test(t);

  // ---- 이성적 전략 ----
  // 귀납: 사례 여러 개(…도 …도) + 일반화
  // "민수도, 사촌 언니도"처럼 사례를 나열한 수 ("그래도", "해도" 같은 말은 빼고 셈)
  const caseCnt = (t.match(/[가-힣]+도(?=[\s,])/g)||[]).filter(w=>!/(해|그래|라|어|아|되|돼|봐|와|줘|여|져|워|러|에|지|그|또)도$/.test(w)).length;
  if (caseCnt>=2 && (PAT.conclude.test(t) || PAT.general.test(t))) add('귀납', true, /도\s/, '여러 사례를 모아 일반적인 결론을 이끌어 냈어요.');
  else if (caseCnt===1 && (PAT.conclude.test(t)||PAT.general.test(t))){
    if (hard) add('귀납', false, /도\s/, '사례가 1개뿐이에요. 귀납은 사례가 2개 이상이거나 통계가 있어야 해요.');
    else add('귀납', true, /도\s/, '사례를 들어 일반화하려는 의도가 보여요.');
  }
  // 연역: 일반 원리 → 이번 경우 → 그러니까 결론
  if (PAT.conclude.test(t) && PAT.general.test(t) || (S.length>=3 && /(그러므로|따라서)/.test(t))){
    if (!hard || S.length>=3) add('연역', true, PAT.conclude, '일반적인 사실에서 결론을 이끌어 냈어요.');
    else add('연역', false, PAT.conclude, '대전제·소전제·결론 세 부분이 다 드러나야 해요.');
  }
  // 유추
  if (PAT.analogy.test(t)){
    if (!hard || (PAT.conclude.test(t) || S.length>=2)) add('유추', true, PAT.analogy, '비슷한 대상에 빗대어 말했어요.');
    else add('유추', false, PAT.analogy, '두 대상이 어떤 점에서 비슷한지 밝히고 결론까지 말해야 해요.');
  }
  if (PAT.stat.test(t)) add('통계·자료', true, PAT.stat, '수치나 조사 결과를 근거로 들었어요.');
  if (PAT.expert.test(t)) add('전문가 의견', true, PAT.expert, '권위 있는 사람이나 기관의 말을 근거로 들었어요.');
  // 사실·사례: 약속·다짐 문장, 지난 행동(인성) 문장, 통계 문장은 빼고 판단
  const factSents = S.filter(x=>!PAT.promise.test(x) && !PAT.ethDeed.test(x) && !PAT.stat.test(x)).join(' ');
  if (PAT.fact.test(factSents)) add('사실·사례', true, PAT.fact, '누구나 확인할 수 있는 구체적인 사실을 들었어요.');
  else if (PAT.subjective.test(t)) add('사실·사례', false, PAT.subjective, '느낌만 말했어요. 산 지 몇 년인지, 어떤 기능이 안 되는지처럼 확인할 수 있는 사실을 덧붙여 보세요.');

  // ---- 감성 ----
  if (PAT.emo.test(t)){
    if (tantrum) add('감성', false, PAT.tantrum, '떼쓰기나 협박은 감성적 전략으로 인정되지 않아요.');
    else add('감성', true, PAT.emo, '상대의 마음에 호소했어요.');
  } else if (tantrum) add('감성', false, PAT.tantrum.test(t)?PAT.tantrum:PAT.rude, '떼쓰기나 협박은 감성적 전략으로 인정되지 않아요.');

  // ---- 인성 ----
  const expertise = PAT.source.test(t) && PAT.readIt.test(t);
  if (PAT.ethDeed.test(t)) add('인성', true, PAT.ethDeed, '구체적인 행동으로 믿을 만한 사람임을 보여 줬어요.');
  else if (expertise) add('인성', true, PAT.readIt, '자료를 직접 찾아보고 출처를 밝혀 전문성을 보여 줬어요.');
  else if (PAT.ethExp.test(t) && !hard) add('인성', true, PAT.ethExp, '주제와 관련된 나의 경험을 말했어요.');
  else if (PAT.readIt.test(t)) add('인성', false, PAT.readIt, '찾아봤다면 어디의 어떤 자료인지 출처를 밝혀야 해요.');
  else if (PAT.ethClaim.test(t)) add('인성', false, PAT.ethClaim, '말로만 다짐했어요. 지켜 온 약속이나 꾸준히 해 온 일 같은 구체적인 행동을 들어 보세요.');

  // 한 유형은 한 번만 (인정된 것 우선)
  const seen = {}; const strategies = [];
  out.sort((a,b)=>b.valid-a.valid).forEach(s=>{ if (!seen[s.type]){ seen[s.type]=1; strategies.push(s); } });

  // ---- 걱정 해결 ----
  const concerns = []; let vague = false;
  const keys = CONCERN_KEYS[state.scenario] || {};
  const isPromise = PAT.promise.test(t), hasMethod = PAT.method.test(t), hasTarget = PAT.target.test(t);
  state.concernList.forEach(c=>{
    if (state.concerns[c.id] || !keys[c.id] || !keys[c.id].test(t) || tantrum) return;
    const relevant = S.filter(s=>keys[c.id].test(s)).join(' ');
    let ok, reason;
    if (isPromise){
      ok = hard ? (hasMethod && hasTarget) : (hasMethod || hasTarget || /\d/.test(relevant));
      reason = ok ? '구체적인 방법과 목표를 밝혔어요.' : (hard ? '방법(언제, 얼마나 자주)과 목표(수치, 기한)가 둘 다 있어야 해요.' : '어떻게 할지나 얼마나 할지를 구체적으로 말해야 해요.');
    } else {
      // 약속이 아닐 때: 그 걱정을 다룬 문장 안에 구체적인 근거(수치·사실·자료·방법)가 있어야 인정
      ok = relevant.length >= (hard ? 18 : 10) && (/\d/.test(relevant) || PAT.fact.test(relevant) || PAT.stat.test(relevant) || PAT.expert.test(relevant) || PAT.method.test(relevant) || PAT.analogy.test(relevant) || PAT.conclude.test(relevant));
      reason = ok ? '걱정에 대한 근거나 해결 방법을 제시했어요.' : '걱정을 언급했지만 해결 방법이나 근거가 부족해요.';
    }
    if (!ok && isPromise) vague = true;
    if (!ok && !isPromise) return;   // 걱정을 언급만 한 경우는 기록하지 않음
    concerns.push({id:c.id, resolved:ok, reason});
  });

  // ---- 부스 계획 ----
  let boothSpecified = false;
  if (state.scenario==='booth'){
    const w = PAT.boothWhat.test(t), h = PAT.boothHow.test(t);
    boothSpecified = hard ? (w && h && count(PAT.boothHow, t)>=2) : (w && h);
  }

  // ---- 청자 첫 반응 ----
  const solved = concerns.find(c=>c.resolved);
  const okS = strategies.find(s=>s.valid);
  let front;
  if (tantrum && !okS) front = '떼쓰기';
  else if (solved) front = '해결'+solved.id;
  else if (okS) front = okS.type==='감성' ? '감성' : okS.type==='인성' ? '인성' : '이성';
  else front = '부족';
  const mood = front==='떼쓰기' ? 'annoyed' : front==='부족' ? 'doubtful' : front==='감성' ? 'warm' : solved ? 'happy' : 'neutral';

  // ---- 피드백 ----
  const feedback = makeFeedback(strategies, concerns, boothSpecified, tantrum);

  // ---- 대답 (영상이 없는 청자용) ----
  const T = TALK[state.listener] || TALK.mom;
  let first = front.startsWith('해결') ? T.해결 : T[front];
  if (front==='부족' && vague) first = T.막연;
  const reply = first + ' ' + nextAsk(concerns, boothSpecified);

  return { front, reply, mood, strategies, concerns, boothSpecified, feedback, acceptReply: ACCEPT[state.scenario] };
}

// 아직 남은 걱정 하나를 되묻기
function nextAsk(newConcerns, booth){
  const done = id=>state.concerns[id] || newConcerns.some(c=>c.id===id && c.resolved);
  const T = TALK[state.listener] || TALK.mom;
  if (state.scenario==='booth' && !state.booth && !booth) return ASK.booth.plan;
  const left = [1,2,3].filter(id=>!done(id));
  if (!left.length) return T.거의;
  const pick = left.find(id=>id!==state.lastAskL) || left[0]; state.lastAskL = pick;
  return ASK[state.scenario][pick];
}

function makeFeedback(strategies, concerns, booth, tantrum){
  const ok = strategies.filter(s=>s.valid), bad = strategies.filter(s=>!s.valid);
  const solved = concerns.filter(c=>c.resolved).map(c=>state.concernList.find(x=>x.id===c.id).short);
  let good;
  if (ok.length) good = `"${ok[0].quote}"에서 ${ok.map(s=>s.type).join(', ')} 전략을 잘 썼어요.` + (solved.length ? ` '${solved.join(', ')}' 걱정도 해결했어요.` : '');
  else if (solved.length) good = `'${solved.join(', ')}' 걱정에 대한 해결 방법을 구체적으로 말했어요.`;
  else if (booth) good = '부스 계획을 구체적으로 말했어요.';
  else good = tantrum ? '하고 싶은 마음은 잘 전해졌어요.' : '자기 생각을 말로 표현해 본 시도가 좋아요.';

  let improve;
  const vague = concerns.find(c=>!c.resolved);
  if (bad.length) improve = bad[0].reason;
  else if (vague) improve = vague.reason + ' 예) "매일 저녁 1시간씩 ~해서 다음 달까지 ~할게요."';
  else {
    // 아직 못 채운 조건을 넌지시 알려 줌 (이번 발언 반영)
    const got = Object.assign({}, state.got); ok.forEach(s=>got[s.type]=1);
    const hasRat = RATIONAL.some(t=>got[t]), hasArg = ARG.some(t=>got[t]);
    const leftC = state.concernList.filter(c=>!state.concerns[c.id] && !concerns.some(x=>x.id===c.id && x.resolved));
    if (state.level==='hard' && !hasArg) improve = '논증(귀납·연역·유추)을 하나 써 보세요. 예를 들어 사례를 두 개 이상 모아 결론을 내 보세요.';
    else if (!hasRat) improve = '숫자, 조사 결과, 구체적인 사실처럼 이성에 호소하는 근거를 들어 보세요.';
    else if (!got['감성']) improve = '상대의 마음(뿌듯함, 기쁨, 공감)을 움직이는 말을 더해 보세요.';
    else if (!got['인성']) improve = '지켜 온 약속이나 꾸준히 해 온 일을 들어 내가 믿을 만한 사람임을 보여 주세요.';
    else if (leftC.length) improve = `'${leftC[0].short}' 걱정을 덜어 줄 구체적인 방법을 말해 보세요.`;
    else improve = '조건을 거의 다 채웠어요. 지금처럼 차분하게 마무리해 보세요.';
  }
  return {good, improve};
}
