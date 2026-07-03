/* Mantle Seeker — shared client app (vanilla JS, no deps)
 * Rendering + interaction layer. The research reasoning lives in assets/agent.js
 * (window.MantleSeeker). This file drives the UI: chrome, background, the live
 * investigation, and rendering the Distribution Intelligence Dossier. */
(function(){
  'use strict';
  const STORE='mantleSeeker.research';
  const $=(s,r)=>(r||document).querySelector(s);
  const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AGENT=window.MantleSeeker||null;

  /* ---------- shared chrome: logo, nav, footer ---------- */
  const LOGO='<svg class="logo" viewBox="0 0 32 32" fill="none" aria-hidden="true">'+
    '<circle cx="16" cy="16" r="14" stroke="#57F287" stroke-width="1.5" opacity=".5"/>'+
    '<circle cx="16" cy="16" r="6" stroke="#70F7D0" stroke-width="1.5"/>'+
    '<circle cx="16" cy="16" r="2.4" fill="#57F287"/>'+
    '<path d="M16 2v6M16 24v6M2 16h6M24 16h6" stroke="#57F287" stroke-width="1.5"/>'+
    '<circle cx="16" cy="2" r="1.6" fill="#5FE9FF"/><circle cx="30" cy="16" r="1.6" fill="#5FE9FF"/>'+
    '</svg>';
  const NAV=[['index.html','Home'],['research.html','Research'],['documentation.html','Documentation'],['about.html','About']];
  const GITHUB='https://github.com/mantle-seeker/mantle-seeker';

  function chrome(){
    const page=document.body.dataset.page||'';
    const nav=document.createElement('header');
    nav.className='nav';
    nav.innerHTML='<div class="nav-inner"><a class="brand" href="index.html">'+LOGO+
      '<span><b>Mantle</b> <span class="dot">Seeker</span></span></a>'+
      '<button class="nav-toggle" aria-label="Menu">&#9776;</button>'+
      '<nav class="nav-links">'+NAV.map(([h,l])=>'<a href="'+h+'"'+(h.startsWith(page)&&page?' class="active"':'')+'>'+l+'</a>').join('')+
      '<a href="'+GITHUB+'" target="_blank" rel="noopener">GitHub</a><a class="nav-cta" href="research.html">Start Research \u2192</a></nav></div>';
    document.body.prepend(nav);
    var _grid=document.createElement("div");_grid.className="bg-grid";document.body.prepend(_grid);
    var _noise=document.createElement("div");_noise.className="bg-noise";document.body.prepend(_noise);
    var _navScroll=function(){nav.classList.toggle("scrolled",(window.scrollY||0)>12);};_navScroll();addEventListener("scroll",_navScroll,{passive:true});
    const toggle=$('.nav-toggle',nav), links=$('.nav-links',nav);
    toggle.addEventListener('click',()=>links.classList.toggle('open'));

    const f=document.createElement('footer');
    f.className='footer';
    f.innerHTML='<div class="wrap footer-inner">'+
      '<div style="max-width:320px"><a class="brand" href="index.html">'+LOGO+'<span><b>Mantle</b> <span class="dot">Seeker</span></span></a>'+
      '<p>The AI research agent for tokenized asset distribution on Mantle. Research before distribution.</p></div>'+
      '<div class="cols">'+
      '<div><h6>Product</h6><a class="fl" href="research.html">Start Research</a><a class="fl" href="index.html#how">How it works</a><a class="fl" href="index.html#skills">Mantle Skills</a></div>'+
      '<div><h6>Resources</h6><a class="fl" href="documentation.html">Documentation</a><a class="fl" href="'+GITHUB+'" target="_blank" rel="noopener">GitHub</a></div>'+
      '<div><h6>Project</h6><a class="fl" href="about.html">About</a><a class="fl" href="about.html#tech">Technology</a><a class="fl" href="about.html#challenge">Challenge</a></div>'+
      '</div></div>'+
      '<div class="footer-base"><span>\u00A9 2026 Mantle Seeker \u00B7 Built for the Mantle Research Challenge</span>'+
      '<span class="mono">Research Before Distribution.</span></div>';
    document.body.appendChild(f);
  }

  /* ---------- animated background: circuit + particles ---------- */
  function background(){
    if(reduce) return;
    const c=document.createElement('canvas'); c.id='bg-canvas';
    document.body.prepend(c);
    const veil=document.createElement('div'); veil.className='bg-veil'; document.body.prepend(veil);
    const ctx=c.getContext('2d'); let w,h,nodes,pulses;
    function size(){w=c.width=innerWidth;h=c.height=innerHeight;init();}
    function init(){
      const cols=Math.max(6,Math.floor(w/150)), rows=Math.max(4,Math.floor(h/150));
      nodes=[]; for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++){
        nodes.push({x:i/cols*w+(Math.random()*40-20),y:j/rows*h+(Math.random()*40-20)});}
      pulses=[]; const links=[];
      nodes.forEach((n,i)=>{nodes.forEach((m,k)=>{if(k>i){const d=Math.hypot(n.x-m.x,n.y-m.y);
        if(d<180)links.push([n,m,d]);}});});
      for(let p=0;p<Math.min(22,links.length);p++){const l=links[Math.floor(Math.random()*links.length)];
        pulses.push({a:l[0],b:l[1],t:Math.random(),sp:.002+Math.random()*.004});}
      c._links=links;
    }
    function frame(){
      ctx.clearRect(0,0,w,h);
      const links=c._links||[];
      ctx.lineWidth=1;
      for(const [a,b,d] of links){ctx.strokeStyle='rgba(35,69,69,'+(1-d/180)*0.5+')';
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
      for(const n of nodes){ctx.fillStyle='rgba(87,242,135,.25)';ctx.beginPath();ctx.arc(n.x,n.y,1.3,0,7);ctx.fill();}
      for(const p of pulses){p.t+=p.sp;if(p.t>1)p.t=0;
        const x=p.a.x+(p.b.x-p.a.x)*p.t, y=p.a.y+(p.b.y-p.a.y)*p.t;
        const g=ctx.createRadialGradient(x,y,0,x,y,6);
        g.addColorStop(0,'rgba(112,247,208,.9)');g.addColorStop(1,'rgba(112,247,208,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,6,0,7);ctx.fill();}
      requestAnimationFrame(frame);
    }
    addEventListener('resize',size); size(); frame();
  }

  /* ---------- scroll reveal ---------- */
  function reveal(){
    const els=$$('[data-reveal]');
    const showAll=()=>els.forEach(e=>{e.style.opacity=1;e.style.transform='none';});
    if(!('IntersectionObserver'in window)||reduce){showAll();return;}
    els.forEach(e=>{e.style.opacity=0;e.style.transform='translateY(16px)';e.style.transition='.6s cubic-bezier(.2,.7,.2,1)';});
    const io=new IntersectionObserver((ent)=>{ent.forEach(x=>{if(x.isIntersecting){
      x.target.style.opacity=1;x.target.style.transform='none';io.unobserve(x.target);}});},{threshold:.08,rootMargin:'0px 0px -6% 0px'});
    els.forEach(e=>io.observe(e));
    setTimeout(showAll,1000);
  }

  /* ---------- research form (STEP 1: capture the brief) ---------- */
  function normalizeBrief(data){
    const d=Object.assign({},data);
    d.assetType=d.assetType||d.assetCategory||'';
    d.assetCategory=d.assetCategory||d.assetType||'';
    d.launchStage=d.launchStage||d.stage||'';
    d.stage=d.stage||d.launchStage||'';
    d.targetRegion=d.targetRegion||d.targetRegions||'';
    d.targetRegions=d.targetRegions||d.targetRegion||'';
    d.distributionGoal=d.distributionGoal||d.goals||'';
    d.goals=d.goals||d.distributionGoal||'';
    return d;
  }
  function storeBrief(data){
    const d=normalizeBrief(data);
    localStorage.setItem(STORE,JSON.stringify(Object.assign({},d,{ts:Date.now()})));
    location.href='live.html';
  }
  function researchForm(){
    const form=$('#research-form'); if(!form) return;
    form.addEventListener('submit',function(e){
      e.preventDefault();
      const data=Object.fromEntries(new FormData(form).entries());
      const name=(data.assetName||'').trim(), type=(data.assetType||data.assetCategory||'').trim();
      if(!name||!type){ toast('Asset name and asset type are required'); return; }
      storeBrief(data);
    });
  }

  /* ---------- STEP 3: live investigation ---------- */
  const FALLBACK_STEPS=[
    ['Understanding request','mantle-network-primer','Parsing asset profile & research objective','Asset profile parsed'],
    ['Loading Mantle Skills','mantle-network-primer','Registering skill handlers','Skill registry loaded'],
    ['Finding comparable assets','mantle-data-indexer','Shortlisting comparable tokenized assets','Comparables shortlisted'],
    ['Analyzing Mantle ecosystem','mantle-data-indexer','Mapping protocols & activity','Ecosystem map assembled'],
    ['Evaluating liquidity','mantle-defi-operator','Assessing depth & routing','Liquidity venues ranked'],
    ['Checking distribution opportunities','mantle-defi-operator','Comparing venues & reach','Channels prioritized'],
    ['Running risk evaluation','mantle-risk-evaluator','Screening distribution risk','Risk screen complete'],
    ['Calculating confidence','mantle-risk-evaluator','Scoring evidence sufficiency','Confidence quantified'],
    ['Building recommendations','AI reasoning','Synthesizing a phased strategy','Strategy synthesized'],
    ['Preparing dossier','AI reasoning','Compiling the dossier','Dossier compiled']
  ];
  const STEPS=(AGENT&&AGENT.STEPS)||FALLBACK_STEPS;
  function pad(n){return n<10?'0'+n:''+n;}
  function now(){const d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());}

  function livePage(){
    const stepsEl=$('#steps'); if(!stepsEl) return;
    const data=JSON.parse(localStorage.getItem(STORE)||'null');
    if(!data){location.href='research.html';return;}
    $('#live-asset').textContent=data.assetName||'Asset';
    const term=$('#term-body');
    const totalSteps=STEPS.length;
    let evCount=0, conf=8;
    function setAS(sel,val){const e=$(sel); if(e)e.textContent=val;}
    function setProg(n){const pct=Math.min(100,Math.round(n/totalSteps*100));const e=$('#live-progress-bar'); if(e)e.style.width=pct+'%'; const t=$('#live-progress-pct'); if(t)t.textContent=pct+'%';}
    function setConf(v){conf=v; setAS('#as-confidence', v+'%'); const e=$('#as-conf-bar'); if(e)e.style.width=v+'%';}
    setAS('#as-objective','Identify the smartest distribution strategy for '+(data.assetName||'the asset')+'.');
    setAS('#as-focus','Initializing research session...');
    setAS('#as-evidence','0 sources');
    setConf(8); setProg(0);
    stepsEl.innerHTML=STEPS.map(function(s,i){return '<div class="step" data-i="'+i+'"><div class="sic">'+(i+1)+'</div>'+
      '<div class="sc"><h4>'+s[0]+'</h4><div class="bar"><i></i></div></div>'+
      '<div class="badge-sk">'+s[1]+'</div></div>';}).join('');
    const stepEls=$$('.step',stepsEl);
    function log(cls,html){const l=document.createElement('div');l.className='log-line '+(cls||'');
      l.innerHTML='<span class="t">'+now()+'</span><span class="m">'+html+'</span>';
      term.appendChild(l);term.scrollTop=term.scrollHeight;}
    log('ok','<span class="sk">&#9656; boot</span> Initializing Mantle Seeker research engine...');
    let i=0;
    const speed=reduce?60:1;
    function run(){
      if(i>=STEPS.length){finish();return;}
      const el=stepEls[i], s=STEPS[i]; el.classList.add('active');
      el.scrollIntoView({block:'nearest',behavior:reduce?'auto':'smooth'});
      setAS('#as-focus', s[2]+'...');
      log('', '<span class="sk">&#9656; '+s[1]+'</span> '+s[2]+'...');
      const bar=$('.bar i',el); let p=0;
      const iv=setInterval(function(){p+=Math.random()*22+10;if(p>=100){p=100;clearInterval(iv);
        bar.style.width='100%';el.classList.remove('active');el.classList.add('done');
        $('.sic',el).innerHTML='&#10003;';
        log('ok','<span class="ev">&#10003; evidence</span> '+(s[3]||'recorded'));
        evCount++; setAS('#as-evidence', evCount+' source'+(evCount!==1?'s':''));
        setConf(Math.min(90, conf+Math.round(Math.random()*6+6)));
        i++; setProg(i); setTimeout(run, 260*speed);
      } else {bar.style.width=p+'%';}}, 150*speed);
    }
    async function finish(){
      setAS('#as-focus','Compiling the Distribution Intelligence Dossier...');
      let dossier=null, meta=null;
      try{
        const res=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        if(res.ok){const j=await res.json(); if(j&&j.ok&&j.dossier){dossier=j.dossier; meta=j;}}
      }catch(e){/* offline / static host - fall back to local engine */}
      if(!dossier&&AGENT) dossier=AGENT.investigate(data);
      const src=meta?('backend orchestrator &middot; '+(meta.researchId||'')):'local engine';
      log('ok','<span class="sk">&#9656; done</span> Investigation complete via '+src+' &mdash; confidence scored on evidence sufficiency.');
      const finalConf=dossier&&dossier.confidence?dossier.confidence.value:conf;
      setConf(finalConf); setProg(totalSteps);
      setAS('#as-focus','Dossier ready.');
      if(dossier){ setAS('#as-evidence', ((dossier.evidence&&dossier.evidence.length)||evCount)+' sources'); }
      localStorage.setItem(STORE,JSON.stringify(Object.assign({},data,{dossier:dossier})));
      const cta=$('#live-cta'); if(cta) cta.style.display='flex';
      $('#done-score').textContent=dossier?dossier.scores.readiness:'\u2014';
      if(!reduce) setTimeout(function(){location.href='report.html';},1600);
    }
    setTimeout(run, 500*speed);
  }

  /* ---------- STEP 8: render the Distribution Intelligence Dossier ---------- */
  function reportPage(){
    var host=$('#dossier'); if(!host) return;
    var raw; try{ raw=JSON.parse(localStorage.getItem(STORE)||'null'); }catch(e){ raw=null; }
    if(!raw){ location.href='research.html'; return; }
    var d=normalizeBrief(raw);
    var inv=raw.dossier || (AGENT&&AGENT.investigate?AGENT.investigate(d):null);
    if(!inv){ toast('Could not load research data'); return; }
    window.__inv=inv;
    var m=buildReportModel(inv,d);
    var s=inv.scores||{};

    /* ----- header session strip ----- */
    var sess=inv.session||{};
    var dur=(sess.durationMs!=null)?(Math.round(sess.durationMs/100)/10)+'s':(inv.durationText||'\u2014');
    var dateStr=(function(){ try{ return new Date(sess.endTime||Date.now()).toLocaleString(undefined,{day:'numeric',month:'long',year:'numeric'});}catch(e){ return '\u2014'; } })();
    var meta=[['Research Session',inv.researchId||sess.researchId||'MS-2026-001'],['Status',(inv.status||sess.status||'Completed')],['Date',dateStr],['Research Duration',dur],['Mode',(sess.mode||'deterministic')]];
    fill('#r-session', meta.map(function(x){return '<span class="smeta"><span class="k">'+esc(x[0])+'</span><span class="v mono">'+esc(String(x[1]))+'</span></span>';}).join(''));
    fill('#r-title', esc(m.asset.name));
    fill('#pc-asset', esc(m.asset.name));
    fill('#pc-meta', esc((inv.researchId||'MS-2026-001')+'  \u00b7  '+dateStr+'  \u00b7  '+dur));

    /* ----- hero gauge ----- */
    setGauge('#ring-fg', s.readiness||0);
    countUp('#ring-val', s.readiness||0, '%');
    fill('#ring-label', esc(m.readinessTag));
    fill('#hero-note', esc(m.heroNote));
    fill('#chip-verdict', '<i class="dotc lvl-'+m.verdict.level+'"></i> '+esc(m.verdict.label));
    fill('#chip-conf', 'Confidence '+ (inv.confidence?inv.confidence.value:0) +'% \u00b7 '+esc(inv.confidence?inv.confidence.label:''));
    fill('#chip-gate', 'Risk gate '+esc(m.gate));

    /* ----- executive summary ----- */
    fill('#exec-summary', '<p>'+esc(m.execSummary)+'</p>');

    /* ----- asset profile ----- */
    fill('#asset-profile', m.profile.map(function(p){return '<div class="pf-item"><span class="pf-ic" aria-hidden="true">'+p.icon+'</span><div><span class="pf-k">'+esc(p.k)+'</span><span class="pf-v">'+esc(p.v)+'</span></div></div>';}).join(''));

    /* ----- objective ----- */
    fill('#obj-question', esc(m.question));
    fill('#obj-scope', m.scope.map(function(x){return '<li>'+esc(x)+'</li>';}).join(''));
    fill('#obj-constraints', m.constraints.map(function(x){return '<li>'+esc(x)+'</li>';}).join(''));

    /* ----- evidence dashboard ----- */
    fill('#evidence-dash', (inv.evidence||[]).map(function(e){
      var cc=String(e.confidence||'').toLowerCase();
      var t=(function(){ try{ return new Date(e.timestamp).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});}catch(x){return '\u2014';} })();
      return '<article class="ev-card" data-reveal><header class="ev-top"><span class="ev-id mono">'+esc(e.id||'E')+'</span><span class="badge-src ev">'+esc(e.source)+'</span></header>'+
        '<p class="ev-find">'+esc(e.finding)+'</p>'+
        '<div class="ev-meta"><span class="ev-imp imp-'+String(e.importance||'').toLowerCase()+'">'+esc(e.importance||'')+'</span>'+
        '<span class="cchip '+cc+'">'+esc(e.confidence||'')+(e.confidencePct?' '+e.confidencePct+'%':'')+'</span>'+
        '<span class="ev-time mono">'+t+'</span></div></article>';
    }).join(''));

    /* ----- activity log (timeline + skill runs) ----- */
    activityRender('#activity-log', inv.activityLog||sess.activityLog, inv.skillRuns);

    /* ----- readiness analysis ----- */
    fill('#readiness-note', '<div class="rn-flex"><div class="rn-big"><b>'+(s.readiness||0)+'</b><span>/100 \u00b7 '+esc(m.readinessTag)+'</span></div><p class="text-muted">'+esc(m.readinessNote)+'</p></div>');
    barsRender('#readiness-bars', m.bars);

    /* ----- liquidity ----- */
    var liq=inv.liquidity||{strengths:[],weaknesses:[]};
    fill('#liq-strengths', (liq.strengths||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('') || '<li class="text-muted">\u2014</li>');
    fill('#liq-weak', (liq.weaknesses||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('') || '<li class="text-muted">\u2014</li>');
    fill('#liq-improve', m.liqImprove.map(function(x){return '<li>'+esc(x)+'</li>';}).join(''));
    fill('#liq-priority', m.liqPriority.map(function(x){return '<li>'+esc(x)+'</li>';}).join(''));

    /* ----- opportunities ----- */
    fill('#opps', m.opps.map(function(o){return '<article class="opp-card" data-reveal><div class="opp-rank">#'+o.priority+'</div>'+
      '<h4>'+esc(o.opportunity)+'</h4><p class="text-muted">'+esc(o.reason)+'</p>'+
      '<div class="opp-meta"><span class="tag imp-'+o.impact.toLowerCase()+'">Impact: '+esc(o.impact)+'</span><span class="tag">Confidence '+o.confPct+'%</span><span class="tag">Priority '+o.priority+'</span></div></article>';}).join(''));

    /* ----- bottlenecks ----- */
    fill('#bottlenecks', m.bottlenecks.map(function(b){return '<article class="bn-card sev-'+b.severity+'" data-reveal><header class="bn-top"><span class="bn-ic" aria-hidden="true">\u26a0</span><h4>'+esc(b.problem)+'</h4><span class="sev sev-'+b.severity+'">'+b.severity.toUpperCase()+'</span></header>'+
      '<p class="bn-imp"><b>Impact:</b> '+esc(b.impact)+'</p><p class="bn-fix"><b>Suggested fix:</b> '+esc(b.fix)+'</p></article>';}).join(''));

    /* ----- risk analysis ----- */
    fill('#risks', (m.risks||[]).map(function(r){return '<article class="risk-card sev-'+r.severity+'" data-reveal><header class="risk-top"><h4>'+esc(r.type)+'</h4><span class="sev sev-'+r.severity+'">'+r.severity.toUpperCase()+'</span></header>'+
      '<p class="text-muted">'+esc(r.explanation)+'</p><p class="risk-mit"><b>Mitigation:</b> '+esc(r.mitigation)+'</p>'+
      '<footer class="risk-foot"><span class="mono">Assessment confidence</span><span class="cchip '+r.confClass+'">'+r.confLabel+' '+r.confPct+'%</span></footer></article>';}).join(''));

    /* ----- cross-chain ----- */
    var cc=inv.crosschain||{recommended:false,rationale:''};
    fill('#cc-note', '<div class="panel cc-note '+(cc.recommended?'cc-yes':'cc-no')+'"><span class="cc-badge">'+(cc.recommended?'Recommended \u2014 later phase':'Not yet')+'</span><p class="text-muted">'+esc(cc.rationale)+'</p></div>');
    fill('#roadmap', m.roadmap.map(function(p,i){return '<div class="rm-step" data-reveal><div class="rm-badge">'+esc(p.phase)+'</div><div class="rm-card"><h4>'+esc(p.title)+'</h4><p class="text-muted">'+esc(p.detail)+'</p></div>'+(i<m.roadmap.length-1?'<div class="rm-arrow">\u2193</div>':'')+'</div>';}).join(''));

    /* ----- reasoning ----- */
    fill('#reasoning', '<div class="reason-chain">'+(inv.reasoning||[]).map(function(x){return '<div class="reason-step"><div class="rk"><i></i></div><p>'+esc(x)+'</p></div>';}).join('')+'</div>');

    /* ----- gaps ----- */
    fill('#gaps', m.gaps.map(function(g){return '<article class="gap-card" data-reveal><header class="gap-top"><span class="gap-ic" aria-hidden="true">?</span><h4>'+esc(g.missing)+'</h4></header>'+
      '<p><b>Why it matters:</b> '+esc(g.why)+'</p><p class="gap-next"><b>Recommended research:</b> '+esc(g.recommended)+'</p></article>';}).join(''));

    /* ----- action plan ----- */
    fill('#action-plan', m.actions.map(function(a){return '<article class="plan-card" data-reveal><div class="plan-n">'+a.n+'</div><div class="plan-body"><h4>'+esc(a.title)+'</h4><p class="text-muted">'+esc(a.detail)+'</p>'+
      '<div class="plan-meta"><span class="tag">Priority: <b>'+esc(a.priority)+'</b></span><span class="tag">Estimated impact: <b>'+esc(a.impact)+'</b></span></div></div></article>';}).join(''));

    /* ----- confidence ----- */
    var conf=inv.confidence||{value:0,label:''};
    setGauge('#conf-ring', conf.value||0);
    countUp('#conf-val', conf.value||0, '%');
    fill('#conf-label', esc(conf.label||''));
    barsRender('#conf-factors', m.factors);
    fill('#confidence-note', esc(conf.explanation||conf.reason||''));

    /* ----- skills console ----- */
    skillConsoleRender('#skills-console', inv.skillConsole);

    /* ----- verdict banner ----- */
    var v=inv.verdict||{level:'needs-more',label:'Needs More Research',explanation:''};
    var vb=$('#verdict-banner'); if(vb) vb.setAttribute('data-level', v.level);
    fill('#verdict-label', esc(v.label));
    fill('#verdict-text', esc(v.explanation||''));
    fill('#verdict-summary', esc(m.verdictSummary));
    fill('#verdict-reasoning', esc(m.verdictReasoning));
    fill('#verdict-nextstep', esc(m.verdictNext));
    fill('#verdict-gate', 'Risk gate: <b>'+esc(m.gate)+'</b>');
    fill('#verdict-conf', 'Confidence: <b>'+(conf.value||0)+'% ('+esc(conf.label||'')+')</b>');

    /* ----- what seeker would do ----- */
    fill('#seeker-says', esc(m.seeker));

    /* ----- export handlers ----- */
    wireExports(inv,m);
    var eb=$('#ex-replay'); if(eb&&AGENT) eb.addEventListener('click',function(){replayMode(inv);});
    var endp=$('#end-pdf'); if(endp) endp.addEventListener('click',function(){window.print();});

    /* ----- animations ----- */
    reportReveal(host);
  }

  /* ---------- render helpers ---------- */
  function kpi(sel,arr){const e=$(sel);if(e)e.innerHTML=arr.map(([l,v])=>'<div class="kpi"><b>'+v+'</b><span>'+l+'</span></div>').join('');}
  function fill(sel,html){const e=$(sel);if(e)e.innerHTML=html;}
  function skillConsoleRender(sel, cards){
    var host=$(sel); if(!host) return; cards=cards||[];
    function statusClass(st){ return String(st||'').toLowerCase().replace(/[^a-z]+/g,'-'); }
    host.innerHTML='<div class="sk-console">'+cards.map(function(c){
      var rt=c.runtime||{};
      var sig=(c.matchedSignals&&c.matchedSignals.length)?c.matchedSignals.map(function(x){return '<code>'+esc(x)+'</code>';}).join(' '):'';
      var ev=(c.evidence&&c.evidence.length)?'<div class="sk-ev">'+c.evidence.map(function(e){return '<div class="sk-ev-item"><span class="ev-id mono">'+esc(e.id||'E')+'</span>'+esc(e.finding)+'</div>';}).join('')+'</div>':'';
      var outs=(c.expectedOutputs&&c.expectedOutputs.length)?'<div class="sk-outs"><h6>Expected outputs</h6>'+c.expectedOutputs.map(function(o){return '<code>'+esc(o)+'</code>';}).join(' ')+'</div>':'';
      var guards=(c.guardrails&&c.guardrails.length)?'<div class="sk-row sk-guard"><h6>Guardrails honoured</h6><ul class="clean">'+c.guardrails.map(function(g){return '<li>'+esc(g)+'</li>';}).join('')+'</ul></div>':'';
      var gatePill=c.gate?'<span class="pill '+(c.gate==='PASS'?'pass':(c.gate==='WARN'?'warn':'block'))+'">'+esc(c.gate)+'</span>':'';
      var confTxt=(c.confidencePct!=null)?' \u00b7 '+c.confidencePct+'%':'';
      return '<div class="sk-card st-'+statusClass(c.status)+'">'+
        '<button class="sk-head" aria-expanded="false"><span class="sk-dot"></span>'+
          '<span class="sk-name mono">'+esc(c.skill)+'</span>'+
          '<span class="sk-cat">'+esc(c.category||'')+'</span>'+
          '<span class="sk-status">'+esc(c.status)+confTxt+' '+gatePill+'</span>'+
          '<span class="sk-caret">\u25be</span>'+
        '</button>'+
        '<div class="sk-body">'+
          '<div class="sk-row"><h6>'+(c.status==='Not Needed'?'Why not selected':'Why selected')+'</h6><p>'+esc(c.whySelected)+'</p>'+(sig?'<div class="sk-sig">Matched signals: '+sig+'</div>':'')+'</div>'+
          '<div class="sk-row"><h6>What it found</h6><p>'+esc(c.whatFound)+'</p>'+ev+'</div>'+
          '<div class="sk-row"><h6>Influence on the recommendation</h6><p>'+esc(c.influence)+'</p></div>'+
          guards+
          outs+
          '<div class="sk-foot"><span class="sk-src">Reads <code>skills/'+esc(c.skill)+'/SKILL.md</code> + <code>agents/openai.yaml</code></span>'+
            (rt.model?'<span class="sk-rt">'+esc(rt.model)+' \u00b7 temp '+esc(String(rt.temperature))+' \u00b7 '+esc(String(rt.maxOutputTokens))+' tok</span>':'')+'</div>'+
        '</div>'+
      '</div>';
    }).join('')+'</div>';
    $$('.sk-head',host).forEach(function(btn){ btn.addEventListener('click',function(){
      var card=btn.parentNode; var open=card.classList.toggle('open'); btn.setAttribute('aria-expanded',open?'true':'false'); }); });
  }
  function esc(v){return (''+v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function defs(sel,pairs){const e=$(sel);if(e)e.innerHTML='<dl class="defs">'+pairs.map(p=>'<div><dt>'+p[0]+'</dt><dd>'+esc(p[1])+'</dd></div>').join('')+'</dl>';}
  function evidenceCards(sel,list){const e=$(sel);if(!e)return;e.innerHTML='<div class="panel">'+list.map(v=>
    '<div class="ev-card"><div class="ev-top">'+(v.id?'<span class="ev-id mono">'+v.id+'</span>':'')+'<span class="badge-src ev">'+v.source+'</span>'+
    '<span class="cchip '+String(v.confidence).toLowerCase()+'">confidence \u00b7 '+v.confidence+(v.confidencePct?' ('+v.confidencePct+'%)':'')+'</span></div>'+
    '<p class="ev-finding">'+v.finding+'</p>'+
    '<div class="ev-meta"><span class="imp imp-'+String(v.importance).toLowerCase()+'">Importance: '+v.importance+'</span>'+(v.importanceNote?'<span class="imp-note">'+v.importanceNote+'</span>':'')+'</div></div>').join('')+'</div>';}
  function reasoningChain(sel,list){const e=$(sel);if(!e)return;e.innerHTML='<div class="reason-chain">'+list.map(x=>
    '<div class="reason-step"><div class="rk"><i></i></div><p>'+x+'</p></div>').join('')+'</div>';}
  function oppCard(title,items,ordered){return '<div class="mini-card"><h5>'+title+'</h5>'+
    (ordered?'<ol class="clean num">':'<ul class="clean">')+items.map(x=>'<li>'+x+'</li>').join('')+(ordered?'</ol>':'</ul>')+'</div>';}
  function risksRender(sel,list){const e=$(sel);if(!e)return;e.innerHTML=list.map(r=>
    '<div class="risk-card sev-'+r.severity+'"><div class="rc-top"><h4>'+r.type+'</h4>'+
    '<span class="sev sev-'+r.severity+'">'+r.severity.toUpperCase()+'</span></div>'+
    '<p>'+r.explanation+'</p><p class="mit"><b>Mitigation:</b> '+r.mitigation+'</p></div>').join('');}
  function strategyRender(sel,phases){const e=$(sel);if(!e)return;e.innerHTML='<div class="phases">'+phases.map(p=>
    '<div class="phase"><div class="pn">'+p.phase+'</div><h4>'+p.title+'</h4><p>'+p.detail+'</p></div>').join('')+'</div>';}
  function gapsRender(sel,list){const e=$(sel);if(!e)return;e.innerHTML=list.map(g=>'<div class="gap-item">'+g+'</div>').join('');}
  function toast(msg){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';
    t.style.cssText='position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:var(--surface-2);'+
    'border:1px solid var(--green);color:#fff;padding:12px 20px;border-radius:10px;z-index:99;box-shadow:var(--glow);font-size:14px';
    document.body.appendChild(t);}
    t.textContent=msg;t.style.opacity=1;setTimeout(()=>t.style.opacity=0,1800);}

  /* ---------- session meta + agent activity log ---------- */
  function sessionMeta(inv){var e=$('#r-session'); if(!e||!inv.session)return; var s=inv.session;
    var chips=[['Research ID',s.researchId],['Status',inv.status||s.status],['Skills used',(s.skillsUsed||[]).length],['Evidence',s.evidenceCount],['Duration',(s.durationMs!=null?(s.durationMs/1000).toFixed(1)+'s':'\u2014')]];
    e.innerHTML=chips.map(function(c){return '<span class="smeta"><span class="k">'+c[0]+'</span><span class="v mono">'+c[1]+'</span></span>';}).join('');}
  function activityRender(sel,log,runs){var e=$(sel); if(!e)return; log=log||[]; runs=runs||[];
    var tl='<div class="timeline">'+log.map(function(x){return '<div class="tl-item'+(x.progress>=100?' tl-done':'')+'"><span class="tl-at mono">'+x.at+'</span><span class="tl-dot"></span><span class="tl-label">'+x.label+' <span class="tl-prog mono">'+x.progress+'%</span></span></div>';}).join('')+'</div>';
    var sk='<div class="skill-runs">'+runs.map(function(r){return '<div class="srun srun-'+(r.status==="Completed"?'ok':'warn')+'"><div class="sr-top"><span class="badge-src ev">'+r.skill+'</span><span class="sr-status">'+r.status+(r.confidencePct?' \u00b7 '+r.confidencePct+'%':'')+'</span></div><p class="text-muted">'+r.findings+'</p></div>';}).join('')+'</div>';
    e.innerHTML=tl+sk;}
  /* ---------- Research Replay Mode ---------- */
  function replayMode(inv){
    var old=$('#replay-overlay'); if(old) old.remove();
    var ov=document.createElement('div'); ov.id='replay-overlay'; ov.className='replay-overlay';
    var stages=[
      {k:'Research objective identified', body:'<p class="text-muted">'+inv.objective+'</p>'},
      {k:'Skills selected', body:'<div class="skill-plan">'+inv.plan.skills.map(function(s){return '<div class="sp-row"><span class="badge-src ev">'+s.skill+'</span><span class="text-muted">'+s.why+'</span></div>';}).join('')+'</div>'},
      {k:'Evidence gathered', body:'<div class="rp-ev">'+inv.evidence.map(function(v){return '<div class="rp-ev-i">'+(v.id?'<span class="ev-id mono">'+v.id+'</span> ':'')+'<span class="badge-src ev">'+v.source+'</span> <span class="cchip '+String(v.confidence).toLowerCase()+'">'+v.confidence+(v.confidencePct?' '+v.confidencePct+'%':'')+'</span><p>'+v.finding+'</p></div>';}).join('')+'</div>'},
      {k:'Reasoning applied', body:'<div class="reason-chain">'+inv.reasoning.map(function(x){return '<div class="reason-step"><div class="rk"><i></i></div><p>'+x+'</p></div>';}).join('')+'</div>'},
      {k:'Risks assessed', body:inv.risks.map(function(r){return '<div class="rp-risk sev-'+r.severity+'"><b>'+r.type+'</b> <span class="sev sev-'+r.severity+'">'+r.severity.toUpperCase()+'</span><p>'+r.explanation+'</p></div>';}).join('')},
      {k:'Confidence calculated', body:'<div class="rp-conf"><div class="rp-conf-val">'+inv.confidence.value+'% \u00b7 '+inv.confidence.label+'</div><p class="text-muted">'+(inv.confidence.reason||inv.confidence.explanation||'')+'</p></div>'},
      {k:'Final recommendations produced', body:'<div class="phases">'+inv.strategy.map(function(pp){return '<div class="phase"><div class="pn">'+pp.phase+'</div><h4>'+pp.title+'</h4><p>'+pp.detail+'</p></div>';}).join('')+'</div><div class="actions-list" style="margin-top:14px">'+inv.nextActions.map(function(x){return '<div class="action"><span class="num"></span><span>'+x+'</span></div>';}).join('')+'</div>'}
    ];
    ov.innerHTML='<div class="replay-card"><div class="replay-head"><span class="eyebrow">Research Replay \u00b7 '+(inv.researchId||'')+'</span><button class="btn btn-ghost" id="replay-close">Close \u2715</button></div>'+
      '<div class="replay-steps" id="replay-steps">'+stages.map(function(s,i){return '<button class="rp-step" data-i="'+i+'"><span class="rp-n">'+(i+1)+'</span>'+s.k+'</button>';}).join('')+'</div>'+
      '<div class="replay-body" id="replay-body"></div>'+
      '<div class="replay-foot"><div class="rp-progress"><i id="rp-bar"></i></div><button class="btn btn-ghost" id="rp-prev">\u2039 Prev</button><button class="btn btn-primary" id="rp-next">Next \u203a</button></div></div>';
    document.body.appendChild(ov);
    var idx=-1, timer=null;
    function render(i){ idx=i; var st=stages[i];
      $$('.rp-step',ov).forEach(function(b,bi){b.classList.toggle('active',bi===i);b.classList.toggle('done',bi<i);});
      var body=$('#replay-body',ov); body.innerHTML='<h3 class="rp-title">'+st.k+'</h3>'+st.body; body.scrollTop=0;
      $('#rp-bar',ov).style.width=Math.round((i+1)/stages.length*100)+'%'; }
    function stop(){ if(timer){clearInterval(timer);timer=null;} }
    function close(){ stop(); ov.remove(); }
    $('#replay-close',ov).addEventListener('click',close);
    $('#rp-next',ov).addEventListener('click',function(){stop(); if(idx<stages.length-1) render(idx+1); else close();});
    $('#rp-prev',ov).addEventListener('click',function(){stop(); if(idx>0) render(idx-1);});
    $$('.rp-step',ov).forEach(function(b){b.addEventListener('click',function(){stop(); render(+b.dataset.i);});});
    ov.addEventListener('click',function(e){if(e.target===ov)close();});
    document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',esc);}});
    render(0);
    if(!reduce){ timer=setInterval(function(){ if(idx>=stages.length-1){stop();return;} render(idx+1); }, 1700); }
  }

  /* ---------- home: hero typing + demo ---------- */
  function heroTyping(){
    const el=$('#hero-title'); if(!el) return;
    const full=el.getAttribute('data-text')||el.textContent.trim();
    if(reduce){el.textContent=full; el.classList.add('typed'); return;}
    el.textContent=''; el.classList.add('typing');
    let i=0;
    (function type(){ if(i<=full.length){ el.textContent=full.slice(0,i); i++; setTimeout(type, 95); }
      else { el.classList.remove('typing'); el.classList.add('typed'); } })();
  }
  function demoButtons(){
    $$('.js-demo').forEach(function(b){ b.addEventListener('click',function(e){ e.preventDefault();
      storeBrief({assetName:'Helios Solar Yield Note', assetType:'Treasury', assetValue:'$25,000,000', targetInvestors:'Institution', targetRegion:'Europe', launchStage:'Pre-Issuance', distributionGoal:'Broaden the holder base and deepen secondary liquidity across compliant Mantle venues.', notes:'Reg-compliant wrapper; existing custody partner.'});
    }); });
  }
  /* ---------- research: AI interview mode ---------- */
  const IV_QUESTIONS=[
    {key:'assetName', q:'Let us begin. What asset are you planning to distribute?', type:'text', placeholder:'e.g. Helios Solar Yield Note', required:true},
    {key:'assetType', q:'What type of asset is it?', type:'select', options:['Real Estate','Treasury','Bond','Private Credit','Commodities','Equity','Fund','Stablecoin'], required:true},
    {key:'assetValue', q:'What is the asset value or intended raise size?', type:'text', placeholder:'e.g. $25,000,000'},
    {key:'targetInvestors', q:'Who are your target investors?', type:'select', options:['Retail','Institution','Mixed']},
    {key:'targetRegion', q:'Which region are you targeting first?', type:'select', options:['Global','North America','Europe','Asia','Africa','Latin America']},
    {key:'launchStage', q:'What launch stage are you at right now?', type:'select', options:['Planning','Pre-Issuance','Issued','Live']},
    {key:'distributionGoal', q:'Finally, what does successful distribution look like for you?', type:'textarea', placeholder:'e.g. broaden holder base and deepen secondary liquidity'}
  ];
  function interviewMode(){
    const root=$('#interview'); if(!root) return;
    const answers={};
    const logEl=$('.iv-log',root), inputWrap=$('.iv-input',root), progEl=$('.iv-progress i',root), counter=$('.iv-count',root);
    let idx=0;
    function pushAI(text){ const b=document.createElement('div'); b.className='iv-msg ai'; b.innerHTML='<span class="iv-av">&#9673;</span><div class="iv-bubble"></div>'; logEl.appendChild(b); const bub=$('.iv-bubble',b); logEl.scrollTop=logEl.scrollHeight;
      if(reduce){bub.textContent=text; return Promise.resolve();}
      return new Promise(function(res){let i=0;(function t(){ if(i<=text.length){bub.textContent=text.slice(0,i);i++;logEl.scrollTop=logEl.scrollHeight;setTimeout(t,16);} else res(); })();}); }
    function pushUser(text){ const b=document.createElement('div'); b.className='iv-msg user'; b.innerHTML='<div class="iv-bubble"></div>'; $('.iv-bubble',b).textContent=text; logEl.appendChild(b); logEl.scrollTop=logEl.scrollHeight; }
    function setProgress(){ const pct=Math.round(idx/IV_QUESTIONS.length*100); if(progEl)progEl.style.width=pct+'%'; if(counter)counter.textContent=idx+' / '+IV_QUESTIONS.length; }
    async function ask(){ setProgress();
      if(idx>=IV_QUESTIONS.length){ finishIV(); return; }
      const qq=IV_QUESTIONS[idx]; await pushAI(qq.q); renderInput(qq); }
    function renderInput(qq){
      inputWrap.innerHTML=''; let control;
      if(qq.type==='select'){ control=document.createElement('select'); control.className='iv-field';
        control.innerHTML='<option value="" disabled selected>Select...</option>'+qq.options.map(function(o){return '<option>'+o+'</option>';}).join(''); }
      else if(qq.type==='textarea'){ control=document.createElement('textarea'); control.className='iv-field'; control.rows=2; control.placeholder=qq.placeholder||''; }
      else { control=document.createElement('input'); control.className='iv-field'; control.placeholder=qq.placeholder||''; }
      const btn=document.createElement('button'); btn.className='btn btn-primary'; btn.type='button'; btn.innerHTML=(idx===IV_QUESTIONS.length-1?'Finish':'Next')+' &rarr;';
      const row=document.createElement('div'); row.className='iv-btns'; row.appendChild(btn);
      let skip=null;
      if(!qq.required){ skip=document.createElement('button'); skip.className='btn btn-ghost'; skip.type='button'; skip.textContent='Skip'; row.appendChild(skip); }
      inputWrap.appendChild(control); inputWrap.appendChild(row); control.focus();
      function submit(val){ if(qq.required && !val){ control.classList.add('err'); control.focus(); return; } if(val){ answers[qq.key]=val; pushUser(val);} idx++; ask(); }
      btn.addEventListener('click',function(){submit((control.value||'').trim());});
      if(skip) skip.addEventListener('click',function(){submit('');});
      control.addEventListener('keydown',function(e){ if(e.key==='Enter' && qq.type!=='textarea'){ e.preventDefault(); submit((control.value||'').trim()); } });
    }
    function finishIV(){ inputWrap.innerHTML=''; pushAI('Thank you. I have enough to begin the investigation. Launching the research agent now...');
      const go=document.createElement('button'); go.className='btn btn-primary'; go.type='button'; go.innerHTML='Start AI Research &rarr;';
      go.addEventListener('click',function(){storeBrief(answers);});
      const row=document.createElement('div'); row.className='iv-btns'; row.appendChild(go); inputWrap.appendChild(row); }
    const toggle=$('#iv-toggle');
    if(toggle){ toggle.addEventListener('click',function(){ const f=$('#classic-wrap'); const on=f.classList.toggle('show'); root.classList.toggle('hide',on); toggle.textContent=on?'Use the guided interview':'Prefer a classic form?'; }); }
    ask();
  }
  /* ================= Prompt 6 dossier helpers ================= */
  function clampPct(n){ n=Math.round(+n||0); return n<0?0:(n>100?100:n); }
  function statusWord(v){ return v>=78?'Strong':v>=60?'Healthy':v>=45?'Developing':'Early'; }
  function confToPct(x){ x=String(x||'').toLowerCase(); return x.indexOf('high')>-1?90:(x.indexOf('mod')>-1||x.indexOf('med')>-1?74:58); }
  function isMissing(v){ return !v || /not (provided|specified)/i.test(String(v)); }

  function setGauge(sel, val){
    var el=$(sel); if(!el) return; var R=52, C=2*Math.PI*R;
    el.style.strokeDasharray=C; el.style.strokeDashoffset=C;
    var target=C*(1-clampPct(val)/100);
    if(reduce){ el.style.strokeDashoffset=target; return; }
    requestAnimationFrame(function(){ el.style.transition='stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)'; el.style.strokeDashoffset=target; });
  }
  function countUp(sel, to, suffix){
    var el=$(sel); if(!el) return; suffix=suffix||''; to=clampPct(to);
    if(reduce){ el.textContent=to+suffix; return; }
    var start=null, dur=1300;
    function step(ts){ if(!start)start=ts; var p=Math.min(1,(ts-start)/dur); var e=1-Math.pow(1-p,3);
      el.textContent=Math.round(e*to)+suffix; if(p<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function barsRender(sel, items){
    var el=$(sel); if(!el) return;
    el.innerHTML=items.map(function(b){ var v=clampPct(b.value);
      return '<div class="bar-row" data-reveal><div class="bar-head"><span class="bar-k">'+esc(b.label)+'</span>'+
        '<span class="bar-status st-'+statusWord(v).toLowerCase()+'">'+statusWord(v)+'</span>'+
        '<span class="bar-pct mono" data-count="'+v+'">0%</span></div>'+
        '<div class="bar-track"><i class="bar-fill" data-w="'+v+'" style="width:0%"></i></div>'+
        (b.note?'<p class="bar-note text-muted">'+esc(b.note)+'</p>':'')+'</div>';
    }).join('');
  }
  function animateBars(root){
    $$('.bar-fill',root).forEach(function(f){ var w=+f.getAttribute('data-w')||0;
      if(reduce){ f.style.width=w+'%'; return; }
      requestAnimationFrame(function(){ f.style.transition='width 1.3s cubic-bezier(.2,.7,.2,1)'; f.style.width=w+'%'; }); });
    $$('.bar-pct[data-count]',root).forEach(function(p){ countUpEl(p, +p.getAttribute('data-count')||0, '%'); });
  }
  function countUpEl(el, to, suffix){ suffix=suffix||''; to=clampPct(to);
    if(reduce){ el.textContent=to+suffix; return; }
    var start=null; function step(ts){ if(!start)start=ts; var p=Math.min(1,(ts-start)/1200); var e=1-Math.pow(1-p,3);
      el.textContent=Math.round(e*to)+suffix; if(p<1) requestAnimationFrame(step); } requestAnimationFrame(step);
  }
  function reportReveal(root){
    var els=$$('[data-reveal]',root);
    if(!('IntersectionObserver'in window)||reduce){ els.forEach(function(e){e.style.opacity=1;e.style.transform='none';}); animateBars(root); return; }
    els.forEach(function(e){ e.style.opacity=0; e.style.transform='translateY(14px)'; e.style.transition='.55s cubic-bezier(.2,.7,.2,1)'; });
    var io=new IntersectionObserver(function(ent){ ent.forEach(function(x){ if(x.isIntersecting){ x.target.style.opacity=1; x.target.style.transform='none'; if(x.target.querySelector&&x.target.querySelector('.bar-fill')) animateBars(x.target); io.unobserve(x.target); } }); },{threshold:.12,rootMargin:'0px 0px -5% 0px'});
    els.forEach(function(e){ io.observe(e); });
    setTimeout(function(){ animateBars(root); },900);
  }

  function wireExports(inv,m){
    function copy(txt,msg){ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){toast(msg);},function(){toast('Copy failed');}); } else { toast('Copy not supported'); } }
    var pdf=$('#ex-pdf'); if(pdf) pdf.addEventListener('click',function(){ window.print(); });
    var pr=$('#ex-print'); if(pr) pr.addEventListener('click',function(){ window.print(); });
    var js=$('#ex-json'); if(js) js.addEventListener('click',function(){
      try{ var blob=new Blob([JSON.stringify(inv,null,2)],{type:'application/json'});
        var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url;
        a.download=(inv.researchId||'mantle-seeker')+'-dossier.json'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function(){URL.revokeObjectURL(url);},1200); toast('Dossier JSON downloaded'); }catch(e){ toast('Download failed'); }
    });
    var sh=$('#ex-share'); if(sh) sh.addEventListener('click',function(){ copy(location.href,'Report link copied'); });
    var cp=$('#ex-copy'); if(cp) cp.addEventListener('click',function(){
      var s=inv.scores||{}; var conf=inv.confidence||{}; 
      var txt=m.asset.name+' \u2014 Distribution Intelligence Dossier ('+(inv.researchId||'')+')\n'+
        'Readiness: '+(s.readiness||0)+'/100 \u00b7 Confidence: '+(conf.value||0)+'% ('+(conf.label||'')+') \u00b7 Verdict: '+(inv.verdict?inv.verdict.label:'')+'\n\n'+
        m.execSummary+'\n\nWhat Seeker would do:\n'+m.seeker;
      copy(txt,'Summary copied to clipboard');
    });
  }

  function buildReportModel(inv,d){
    var s=inv.scores||{}; var conf=inv.confidence||{value:0,label:'Low'};
    var a=inv.asset||{};
    var asset={
      name:a.name||d.assetName||'Tokenized Asset',
      type:a.type||d.assetType||d.assetCategory||'Not specified',
      value:a.value||d.assetValue||'Not provided',
      stage:a.stage||d.launchStage||d.stage||'Not specified',
      investors:a.investors||d.targetInvestors||'Not specified',
      regions:a.regions||d.targetRegion||d.targetRegions||'Not specified',
      goal:a.goal||d.distributionGoal||d.goals||'Not specified'
    };
    var gate=(inv.riskGate)||(inv.verdict&&inv.verdict.gate)||'WARN';
    var readiness=clampPct(s.readiness);
    var readinessTag=readiness>=75?'HIGH':readiness>=55?'MODERATE':readiness>=40?'DEVELOPING':'EARLY';
    var heroNote=readiness>=75?'Research indicates a strong foundation for successful distribution with manageable, well-understood risks.'
      :readiness>=55?'Research indicates a workable distribution path with several conditions to satisfy before launch.'
      :readiness>=40?'Research indicates meaningful groundwork is still required before this asset is ready to distribute.'
      :'Research indicates the asset is at an early stage; core distribution foundations must be built first.';

    /* executive summary <=150 words */
    var execSummary=inv.summaryText||inv.summary||('Mantle Seeker investigated the distribution readiness of '+asset.name+', a '+asset.type+' asset targeting '+asset.investors+' investors. Across '+(inv.evidence||[]).length+' evidence items from the Mantle Skills, readiness scores '+readiness+'/100 with '+(conf.value||0)+'% confidence. The clearest opportunity is deep, concentrated liquidity on a primary Mantle venue paired with compliant investor onboarding; the main challenge is unverified live demand and liquidity depth. The risk gate returned '+gate+'. Distribution is best sequenced liquidity-first, then reach, with cross-chain routing reserved for a later phase once secondary-market activity is proven.');

    /* asset profile with icons */
    var profile=[
      {icon:'\uD83D\uDCE6',k:'Asset Name',v:asset.name},
      {icon:'\uD83C\uDFF7\uFE0F',k:'Asset Type',v:asset.type},
      {icon:'\uD83D\uDCB0',k:'Estimated Value',v:asset.value},
      {icon:'\uD83D\uDE80',k:'Launch Stage',v:asset.stage},
      {icon:'\uD83D\uDC65',k:'Target Investors',v:asset.investors},
      {icon:'\uD83C\uDF0D',k:'Target Region',v:asset.regions},
      {icon:'\uD83C\uDFAF',k:'Distribution Goal',v:asset.goal}
    ];

    var question='How can '+asset.name+' achieve efficient, sustainable distribution using the Mantle ecosystem?';
    var scope=[
      'Distribution strategy for '+asset.name+' on Mantle (EVM L2, chainId 5000).',
      'Liquidity depth, investor accessibility, DeFi venues, market reach and cross-chain routing.',
      'Risk screening across liquidity, market, adoption, infrastructure and operational dimensions.'
    ];
    var constraints=[
      'Findings are qualitative estimates derived from your brief \u2014 not live market measurements.',
      'Live on-chain metrics (TVL, volumes, wallet activity) require connected Mantle Skills to quantify.',
      'No live wallet execution or transaction signing is performed in this research run.'
    ];

    /* readiness breakdown bars */
    var access=clampPct(((s.reach||0)+(s.eco||0))/2);
    var infra=clampPct(Math.min(95,82+((s.eco||0)>=70?6:0)));
    var bars=[
      {label:'Liquidity',value:clampPct(s.liquidity),note:'Depth available for investors to enter and exit positions on Mantle.'},
      {label:'Accessibility',value:access,note:'How easily investors can discover and access the asset across venues.'},
      {label:'Investor Reach',value:clampPct(s.reach),note:'Breadth of investor coverage across the intended target regions.'},
      {label:'Infrastructure',value:infra,note:'Mantle is a mature EVM L2 (chainId 5000); execution risk is low.'},
      {label:'Risk',value:clampPct(s.riskScore),note:'Higher is safer \u2014 blended distribution, market and operational risk posture.'},
      {label:'Research Completeness',value:clampPct(s.completeness),note:'Share of the research brief that was provided as input.'}
    ];
    var readinessNote='Readiness blends liquidity, investor reach, ecosystem fit and risk posture into a single, transparent score. '+(s.liquidity<=s.reach?'Liquidity is currently the binding constraint \u2014 seed depth first.':'Investor reach is currently the binding constraint \u2014 widen discovery first.');

    /* liquidity improvements + priority */
    var liqImprove=[
      'Seed a concentrated-liquidity pool against a major stablecoin on a primary Mantle AMM.',
      'Commit a market-making budget to hold spreads tight through the early distribution window.',
      'Add an optimized routing path so investors receive best-execution quotes.',
      'Stage liquidity in tranches tied to verified demand milestones.'
    ];
    var liqPriority=[
      'Seed initial liquidity on Mantle.',
      'Secure a market-making commitment.',
      'Enable compliant investor onboarding.',
      'Expand venues once depth is proven.'
    ];

    /* opportunities */
    var opps=[
      {opportunity:'Institutional distribution desks',reason:'Target investors ('+asset.investors+') require compliant, reliable market access that dedicated desks provide.',impact:'High',confPct:((s.eco||0)>=70?90:78),priority:1},
      {opportunity:'Concentrated liquidity on a primary Mantle AMM',reason:'A single deep asset / stablecoin pair reduces slippage and anchors price discovery.',impact:'High',confPct:((s.liquidity||0)>=70?88:74),priority:2},
      {opportunity:'Structured / compliant DeFi access venues',reason:'Mantle-native venues broaden discovery while preserving compliance controls.',impact:'Medium',confPct:72,priority:3},
      {opportunity:'Lending-market collateral integration',reason:'Enabling the asset as collateral unlocks utility and drives secondary demand.',impact:'Medium',confPct:70,priority:4},
      {opportunity:'Cross-chain routing (later phase)',reason:'Routes capital originating on other chains into the asset on Mantle once depth is proven.',impact:(inv.crosschain&&inv.crosschain.recommended)?'High':'Medium',confPct:68,priority:5}
    ];

    /* bottlenecks */
    var bottlenecks=[];
    if((s.liquidity||0)<72) bottlenecks.push({problem:'Shallow initial liquidity',severity:(s.liquidity||0)<55?'high':'medium',impact:'Large orders face slippage and price impact, deterring serious investors and stalling distribution.',fix:'Seed concentrated liquidity on a primary Mantle AMM and commit a market-making budget before broad outreach.'});
    bottlenecks.push({problem:'Unverified investor demand',severity:'medium',impact:'Without a committed order book, the distribution timeline and pace are speculative.',fix:'Gather soft commitments and run a phased rollout to validate real appetite before scaling.'});
    if(isMissing(asset.value)) bottlenecks.push({problem:'Raise size not defined',severity:'medium',impact:'Initial liquidity and allocations cannot be sized precisely.',fix:'Confirm the target raise / asset value to size the liquidity plan.'});
    if(isMissing(asset.regions)) bottlenecks.push({problem:'Target regions unspecified',severity:'medium',impact:'The regulatory and compliance surface is unknown, blocking channel selection.',fix:'Define priority jurisdictions and confirm compliance requirements per region.'});
    bottlenecks.push({problem:'No live on-chain data connected',severity:'low',impact:'Findings remain qualitative estimates until Mantle Skills stream live metrics.',fix:'Connect the Mantle data indexer to replace estimates with measured, timestamped evidence.'});
    bottlenecks=bottlenecks.slice(0,5);

    /* risks with assessment confidence */
    var risks=(inv.risks||[]).map(function(r){ var sv=String(r.severity||'medium').toLowerCase();
      var pct=sv==='low'?84:sv==='high'?70:77; var lab=pct>=80?'High':pct>=65?'Moderate':'Low';
      return {type:r.type,severity:sv,explanation:r.explanation,mitigation:r.mitigation,confPct:pct,confLabel:lab,confClass:lab.toLowerCase()}; });

    /* cross-chain roadmap */
    var roadmap=[
      {phase:'Phase 1',title:'Launch on Mantle',detail:'Issue / list '+asset.name+' on Mantle and establish network assumptions with a single primary trading pair.'},
      {phase:'Phase 2',title:'Establish liquidity',detail:'Seed concentrated liquidity and a market-making commitment so investors can transact with low slippage.'},
      {phase:'Phase 3',title:'Expand accessibility',detail:'Add compliant onboarding and structured DeFi venues to widen investor reach across regions.'},
      {phase:'Phase 4',title:'Cross-chain distribution',detail:(inv.crosschain&&inv.crosschain.recommended)?'Route capital from origin chains into the asset on Mantle via the cheapest, fastest bridge + swap path.':'Revisit cross-chain routing once Mantle depth and demand are proven \u2014 not before.'}
    ];

    /* research gaps -> structured */
    var gapWhy={
      'liquidity budget':'Initial liquidity cannot be sized precisely, so slippage and launch depth stay uncertain.',
      'investor demand':'Channel selection and pacing depend on real appetite that has not been measured.',
      'partnership':'Distribution reach depends on venues and partners that have not been confirmed.',
      'on-chain':'Estimates cannot become measured facts until live metrics are connected.',
      'region':'The regulatory surface, and therefore compliant channels, cannot be finalized.',
      'investor profile':'Channel and messaging choices remain provisional without a defined audience.'
    };
    function gapMeta(text){ var t=String(text).toLowerCase(); var why='This unknown reduces confidence in the distribution recommendation.'; var next='Gather the missing input, or connect the relevant Mantle Skill, then re-run the investigation.';
      Object.keys(gapWhy).forEach(function(k){ if(t.indexOf(k)>-1) why=gapWhy[k]; });
      if(t.indexOf('on-chain')>-1||t.indexOf('metric')>-1) next='Connect mantle-data-indexer and mantle-defi-operator to stream live TVL, volume and wallet activity.';
      else if(t.indexOf('demand')>-1) next='Collect soft commitments or a preliminary order book before finalizing channels.';
      else if(t.indexOf('region')>-1) next='Confirm target jurisdictions and per-region compliance requirements.';
      return {why:why,next:next}; }
    var gaps=(inv.gaps||[]).map(function(g){ var mm=gapMeta(g); var missing=String(g).split(/ \u2014 | - /)[0]; return {missing:missing,why:mm.why,recommended:mm.next}; });

    /* action plan from strategy */
    var pri=['High','High','Medium',(inv.crosschain&&inv.crosschain.recommended)?'Medium':'Low'];
    var imp=['High','High','Medium','Medium'];
    var actions=(inv.strategy||[]).map(function(p,i){ return {n:i+1,title:p.title,detail:p.detail,priority:pri[i]||'Medium',impact:imp[i]||'Medium'}; });
    (inv.nextActions||[]).slice(0,3).forEach(function(x,i){ actions.push({n:actions.length+1,title:x,detail:'Immediate next step derived from the evidence and reasoning above.',priority:i===0?'High':'Medium',impact:i===0?'High':'Medium'}); });

    /* confidence factors */
    var evs=inv.evidence||[]; var evTot=evs.length||1;
    var evAvg=clampPct(evs.reduce(function(x,e){return x+(e.confidencePct||confToPct(e.confidence));},0)/evTot);
    var evHigh=evs.filter(function(e){return String(e.confidence).toLowerCase().indexOf('high')>-1;}).length;
    var conflicts=(inv.conflicts&&inv.conflicts.length)||0;
    var gapCount=(inv.gaps||[]).length;
    var factors=[
      {label:'Evidence Quality',value:evAvg,note:evHigh+' of '+evTot+' evidence items rated High confidence.'},
      {label:'Research Completeness',value:clampPct(s.completeness),note:'Share of the brief provided as input to the agent.'},
      {label:'Consistency',value:clampPct(conflicts?68:88),note:conflicts?conflicts+' conflicting signal(s) required reconciliation.':'No conflicting evidence was detected across the skills.'},
      {label:'Missing Data',value:clampPct(100-Math.min(85,gapCount*14)),note:gapCount+' open research gap(s) reduce overall certainty.'}
    ];

    /* verdict extras */
    var v=inv.verdict||{level:'needs-more',label:'Needs More Research',explanation:''};
    var verdictSummary=asset.name+' scores '+readiness+'/100 readiness at '+(conf.value||0)+'% confidence, with a '+gate+' risk gate across '+evTot+' evidence items.';
    var verdictReasoning=v.explanation||('The evidence supports a coherent distribution direction, but '+gapCount+' research gap(s) and the '+gate+' risk gate cap how far the recommendation can go before live validation.');
    var verdictNext=v.level==='ready'?'Proceed to execution: seed liquidity, open compliant onboarding, then monitor secondary-market depth.':v.level==='not-ready'?'Resolve the blocking risk and close the critical gaps, then re-run the investigation before distributing.':'Connect live Mantle Skills, validate liquidity depth and investor demand, then re-run to confirm readiness.';

    /* what seeker would do (first person) */
    var liqFirst=(s.liquidity||0)<=(s.reach||0);
    var seeker='If I were leading the distribution of '+asset.name+', I would '+(liqFirst
      ?'first focus on building real liquidity depth on a primary Mantle pair, then validate investor demand with soft commitments, and only expand distribution \u2014 including cross-chain routing \u2014 once secondary-market activity looks healthy.'
      :'first widen investor discovery through compliant, high-visibility Mantle venues, then reinforce liquidity depth to support the incoming demand, and finally expand cross-chain once the market proves stable.')+
      ' I would not rush broad outreach before the '+(liqFirst?'liquidity':'reach')+' foundation is in place, and I would route every actionable step through the risk evaluator before committing capital. My honest read: this asset is '+(v.level==='ready'?'ready to move \u2014 execute deliberately.':v.level==='not-ready'?'not ready yet \u2014 fix the fundamentals first.':'close, but it needs live validation before I would commit.');

    return {asset:asset,gate:gate,readinessTag:readinessTag,heroNote:heroNote,execSummary:execSummary,profile:profile,
      question:question,scope:scope,constraints:constraints,bars:bars,readinessNote:readinessNote,
      liqImprove:liqImprove,liqPriority:liqPriority,opps:opps,bottlenecks:bottlenecks,risks:risks,roadmap:roadmap,
      gaps:gaps,actions:actions,factors:factors,verdict:v,verdictSummary:verdictSummary,verdictReasoning:verdictReasoning,verdictNext:verdictNext,seeker:seeker};
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded',function(){
    chrome(); background(); reveal(); heroTyping(); demoButtons(); researchForm(); interviewMode(); livePage(); reportPage();
  });
})();
