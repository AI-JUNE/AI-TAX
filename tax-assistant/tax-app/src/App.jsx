import { useState, useRef, useCallback, useEffect } from "react";

/*
  ✅ 보안 강화: API 키를 브라우저에 노출하지 않고 
  Vercel Serverless Function(/api/chat)을 통해 호출합니다.
*/
async function callClaude(messages, system) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `에러 발생 (상태코드: ${response.status})`);
  }

  return data.text;
}

const MODS = [
  {
    id:"DATA_AUDIT", icon:"📊", label:"지출 분석", tag:"Data Audit",
    color:"#1D4ED8", light:"#EFF6FF", mid:"#BFDBFE",
    desc:"카드내역 VAT공제·계정과목 자동분류 및 리스크 탐지",
    hint:"카드 내역을 텍스트로 붙여넣거나 CSV 파일을 첨부하세요",
    ph:"예) 2026-01-15 | 스타벅스 강남점 | 8,500원 | 법인카드\n2026-01-16 | 교보문고 | 45,000원 | 법인카드",
    quick:[
      "이번 달 법인카드 내역을 분석해주세요.\n2026-01-10 스타벅스 12,000원 / 2026-01-12 주유소GS 85,000원 / 2026-01-15 롯데호텔레스토랑 320,000원 / 2026-01-20 이마트 67,000원",
      "식대·교통비·접대비가 섞인 지출 내역입니다. 리스크 항목을 먼저 걸러주세요.\n2026-01-14(일) 한우마을 430,000원 / 2026-01-18 KTX 52,000원 / 2026-01-22(토) 유흥주점 280,000원",
      "주말·심야 결제가 포함된 카드 내역 중 소명이 필요한 항목을 알려주세요.\n2026-01-11(토) 23:42 강남바 180,000원 / 2026-01-13 사무용품 34,000원 / 2026-01-19(일) 골프장 250,000원",
    ],
    sys:`[Data Audit 모드] 마크다운 표 포함 답변:
1. **계정과목 분류표** (날짜|내용|금액|계정과목|VAT공제|위험도)
2. **🔴 고위험** — 증빙 미비, 한도초과, 가사용 의심
3. **🟡 주의** — 소명 필요
4. **🟢 정상** 항목 요약
5. **후속 조치 가이드**
※ 3만원 초과 증빙미비·주말·심야(22시 이후) 자동 🔴`,
  },
  {
    id:"TAX_LOGIC", icon:"⚖️", label:"세무 조정", tag:"Tax Logic",
    color:"#6D28D9", light:"#F5F3FF", mid:"#DDD6FE",
    desc:"2026 최신 세법 기준 리스크 진단·절세 방안",
    hint:"세무 관련 질문을 자유롭게 입력하세요",
    ph:"예) 업무용 승용차 비용 처리 한도와 방법을 알려주세요",
    quick:[
      "소규모 법인의 업무용 승용차(전용번호판 없음) 비용 처리 방법과 한도를 2026년 세법 기준으로 설명해주세요.",
      "접대비 한도 계산 방법과 한도 초과 시 세무 처리 방법을 법인과 개인사업자로 구분해서 설명해주세요.",
      "개인사업자가 법인으로 전환할 때 세무상 유의사항과 절세 포인트를 정리해주세요.",
    ],
    sys:`[Tax Logic 모드] 2026년 최신 세법 기준. 법령명·조항번호 필수. 위험도 🔴🟡🟢 표시. 절세 방안 포함.`,
  },
  {
    id:"CRM_WRITE", icon:"✉️", label:"고객 문서", tag:"CRM Write",
    color:"#047857", light:"#ECFDF5", mid:"#A7F3D0",
    desc:"카톡·이메일 안내문 자동 생성",
    hint:"어떤 문서가 필요한지 상황을 설명해주세요",
    ph:"예) 부가세 신고 안내 카톡 메시지를 작성해주세요",
    quick:[
      "이번 달 부가세 확정신고 안내 카톡 메시지를 작성해주세요. 제출 서류와 납부 기한 중심으로, 식당을 운영하는 사장님께 보낼 내용입니다.",
      "세무조사 사전통지를 받은 제조업 대표님께 보낼 이메일을 써주세요. 준비 서류와 대응 방법 위주로.",
      "5월 종합소득세 신고 시즌 안내 문자를 프리랜서·유튜버 고객에게 보낼 내용으로 쉽고 친근하게 작성해주세요.",
    ],
    sys:`[CRM Write 모드] 즉시 사용 가능한 문서 초안. 카톡: 이모지, 간결, 체크리스트. 이메일: 제목 포함, 전문적 어투.`,
  },
  {
    id:"CALCULATOR", icon:"🧮", label:"세금 계산", tag:"Tax Calc",
    color:"#B91C1C", light:"#FFF1F2", mid:"#FECDD3",
    desc:"소득세·법인세·부가세·4대보험 즉시 계산",
    hint:"계산할 세목과 금액을 입력하세요",
    ph:"예) 연봉 8,500만원 직장인 소득세와 실수령액 계산",
    quick:[
      "연봉 7,200만원 직장인(부양가족 3명, 20세 이하 자녀 1명)의 2026년 근로소득세와 실수령액을 계산해주세요.",
      "제조업 중소법인 당기순이익 2억 5천만원 기준으로 2026년 법인세를 단계별로 계산해주세요.",
      "음식점 연 매출 4억원(과세) 개인사업자의 부가세와 종합소득세 예상액을 계산해주세요.",
    ],
    sys:`[Tax Calculator 모드] 2026년 세율 단계별 계산. 모든 산식 표시. 마크다운 표로 결과 요약. 세율: 소득세(6~45%), 법인세(9~24%), 부가세(10%).`,
  },
  {
    id:"DEADLINE", icon:"📅", label:"신고 일정", tag:"Schedule",
    color:"#B45309", light:"#FFFBEB", mid:"#FDE68A",
    desc:"세무 신고·납부 기한 및 월별 일정 관리",
    hint:"업종·규모를 알려주시면 맞춤 일정을 안내해드립니다",
    ph:"예) 음식점 개인사업자 2026년 세무 일정 알려줘",
    quick:[
      "2026년 상반기 세무 신고·납부 일정을 법인사업자와 개인사업자로 구분하여 월별로 정리해주세요.",
      "부가세 예정신고(4월)·확정신고(7월) 대상과 신고 기한, 준비 서류를 정리해주세요.",
      "5월 종합소득세 신고 대상자와 제외 대상, 신고 방법을 비교 정리해주세요.",
    ],
    sys:`[Schedule 모드] 2026년 기한 기준 표 형식 월별 정리. 법인/개인사업자 구분. 🔴기한임박 🟡준비시작. 가산세 위험 고지.`,
  },
  {
    id:"ARCHIVE", icon:"🔍", label:"판례 검색", tag:"Archive",
    color:"#0E7490", light:"#ECFEFF", mid:"#A5F3FC",
    desc:"예규·판례·유권해석 Fact-check",
    hint:"찾고 싶은 판례나 예규 주제를 입력하세요",
    ph:"예) 접대비와 복리후생비 구분 기준 판례",
    quick:[
      "접대비와 복리후생비의 구분 기준에 관한 주요 판례와 국세청 예규를 정리해주세요.",
      "업무용 승용차 비용 처리 관련 최신 예규와 판례를 알려주세요.",
      "가지급금 인정이자 계산과 관련한 유권해석 사례를 설명해주세요.",
    ],
    sys:`[Archive 모드] 세법 판례·예규·유권해석. 사건번호 명시. 판시사항 요약. 최신 개정 동향 반영.`,
  },
  {
    id:"CHAT", icon:"💬", label:"세무 Q&A", tag:"Free Chat",
    color:"#334155", light:"#F8FAFC", mid:"#E2E8F0",
    desc:"세무·회계·절세 자유 질의응답",
    hint:"세무·회계 관련 무엇이든 자유롭게 질문하세요",
    ph:"세무·회계 관련 궁금한 점을 자유롭게 질문하세요",
    quick:[
      "부가세 과세사업과 면세사업을 겸영할 때 공통매입세액 안분 계산 방법을 알려주세요.",
      "2026년 달라진 세법 중 사업자가 꼭 알아야 할 핵심 변경 사항 5가지를 정리해주세요.",
      "법인 대표이사가 개인 돈을 회사에 빌려줄 때(가수금) 세무적으로 주의할 사항은?",
    ],
    sys:`[Free Chat 모드] 세무·회계·절세 전문 답변. 법령 근거와 실무 사례 포함. 한국어로 답변.`,
  },
];

const BASE_SYS = `당신은 20년 경력 세무사 AI 어시스턴트입니다. 위험도: 🔴(위험) 🟡(주의) 🟢(정상). 법령 인용 시 조항 필수. 계산 시 단계별 과정 표시. 모든 응답 한국어.`;

const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const inl = s => esc(s)
  .replace(/\*\*\*(.+?)\*\*\*/g,"<strong><em>$1</em></strong>")
  .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
  .replace(/\*(.+?)\*/g,"<em>$1</em>")
  .replace(/`([^`]+)`/g,'<code class="mc">$1</code>');

function mdRender(text) {
  if (!text) return "";
  const lines = text.split("\n");
  let html="", tbl=[], inT=false;
  const flushT = () => {
    if (!tbl.length) return;
    const [hdr,,...body] = tbl;
    const cols=(hdr||"").split("|").map(c=>c.trim()).filter(Boolean);
    const ths=cols.map(c=>`<th>${inl(c)}</th>`).join("");
    const trs=body.filter(r=>r.trim()).map(r=>{
      const cells=r.split("|").map(c=>c.trim()).filter(Boolean);
      return "<tr>"+cells.map(c=>`<td>${inl(c)}</td>`).join("")+"</tr>";
    }).join("");
    html+=`<div class="tw"><table class="tt"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
    tbl=[]; inT=false;
  };
  for (const raw of lines) {
    const ln=raw.trimEnd();
    if (ln.startsWith("|")&&ln.endsWith("|")){if(!ln.replace(/[-|: ]/g,"").trim())continue;inT=true;tbl.push(ln);continue;}
    if(inT)flushT();
    if(/^### /.test(ln)){html+=`<h3 class="mh3">${inl(ln.slice(4))}</h3>`;continue;}
    if(/^## /.test(ln)){html+=`<h2 class="mh2">${inl(ln.slice(3))}</h2>`;continue;}
    if(/^# /.test(ln)){html+=`<h1 class="mh1">${inl(ln.slice(2))}</h1>`;continue;}
    if(/^---+$/.test(ln)){html+=`<hr class="mhr"/>`;continue;}
    if(/^> /.test(ln)){html+=`<div class="mbq">${inl(ln.slice(2))}</div>`;continue;}
    if(/^\d+\. /.test(ln)){const m=ln.match(/^(\d+)\. (.*)/);html+=`<div class="mol"><span class="mon">${m[1]}.</span><span>${inl(m[2])}</span></div>`;continue;}
    if(/^[*\-] /.test(ln)){html+=`<div class="mul"><span class="mud">•</span><span>${inl(ln.slice(2))}</span></div>`;continue;}
    if(!ln){html+=`<div class="gap"></div>`;continue;}
    html+=`<p class="mp">${inl(ln)}</p>`;
  }
  if(inT)flushT();
  return html;
}

const fmt=d=>d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
const uid=()=>`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const readFile=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=()=>rej(new Error("파일 읽기 실패"));r.readAsText(f,"UTF-8");});

export default function App() {
  const [modId,setModId]=useState("DATA_AUDIT");
  const [chats,setChats]=useState({});
  const [text,setText]=useState("");
  const [file,setFile]=useState(null);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const [drawer,setDrawer]=useState(false);
  const [copied,setCopied]=useState(null);
  const bottomRef=useRef(null),taRef=useRef(null),fileRef=useRef(null);
  const mod=MODS.find(m=>m.id===modId)||MODS[0];
  const msgs=chats[modId]||[];

  useEffect(()=>{setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),80);},[msgs.length,busy]);
  const toast=useCallback(msg=>{setErr(msg);setTimeout(()=>setErr(""),8000);},[]);
  const resizeTA=()=>{const el=taRef.current;if(!el)return;el.style.height="auto";el.style.height=Math.min(el.scrollHeight,150)+"px";};
  const copyText=(id,t)=>{navigator.clipboard?.writeText(t).then(()=>{setCopied(id);setTimeout(()=>setCopied(null),2000);}).catch(()=>{});};

  const send=useCallback(async(override)=>{
    const txt=(override!==undefined?override:text).trim();
    if(!txt&&!file){toast("메시지를 입력하거나 파일을 첨부해주세요.");return;}
    if(txt.length>10000){toast("10,000자 이하로 입력해주세요.");return;}
    if(busy)return;
    let content=txt||"첨부 파일을 분석해주세요.",display=txt;
    if(file){try{const fc=await readFile(file);content=(txt?txt+"\n\n":"아래 파일을 분석해주세요.\n\n")+`[파일명: ${file.name}]\n${fc.slice(0,6000)}${fc.length>6000?"\n...(이하 생략)":""}`;display=txt?`${txt}\n\n📎 ${file.name}`:`📎 ${file.name}`;}catch(e){toast(e.message);return;}}
    const userMsg={id:uid(),role:"user",content,display,time:new Date()};
    const prev=chats[modId]||[];
    const next=[...prev,userMsg];
    setChats(c=>({...c,[modId]:next}));
    setText("");setFile(null);setBusy(true);
    if(taRef.current)taRef.current.style.height="auto";
    try{
      // ✅ 서버리스 함수를 통해 안전하게 응답을 받아옵니다.
      const reply = await callClaude(next.map(m => ({role: m.role, content: m.content})), BASE_SYS + "\n\n" + mod.sys);
      const aiMsg={id:uid(),role:"assistant",content:reply,display:reply,time:new Date()};
      setChats(c=>({...c,[modId]:[...next,aiMsg]}));
    }catch(e){toast(e.message||"오류가 발생했습니다.");setChats(c=>({...c,[modId]:prev}));}
    finally{setBusy(false);}
  },[text,file,busy,modId,chats,mod,toast]);

  const onKey=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}};
  const onFile=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024){toast("파일 크기는 5MB 이하만 가능합니다.");return;}if(!/\.(csv|txt|tsv|json)$/i.test(f.name)){toast("CSV, TXT, TSV, JSON 형식만 지원합니다.");return;}setFile(f);e.target.value="";};
  const switchMod=id=>{setModId(id);setText("");setFile(null);setDrawer(false);};
  const clear=()=>setChats(c=>({...c,[modId]:[]}));

  return(<>
    <style>{CSS}</style>
    {drawer&&<div className="overlay" onClick={()=>setDrawer(false)}/>}
    <div className="shell">
      <aside className={`sb ${drawer?"sb-open":""}`}>
        <div className="sb-head"><div className="logo"><div className="logo-gem">⚡</div><div><div className="logo-name">세무 어시스턴트</div><div className="logo-ver">AI · 2026 세법 기준</div></div></div></div>
        <nav className="sb-nav">
          <div className="nav-sec">업무 모듈</div>
          {MODS.map(m=>{const on=modId===m.id;return(<button key={m.id} className={`nav-btn ${on?"nav-on":""}`} style={on?{background:m.light,borderColor:m.mid}:{}} onClick={()=>switchMod(m.id)}><span className="nav-ico">{m.icon}</span><div className="nav-txt"><span className="nav-lbl" style={on?{color:m.color}:{}}>{m.label}</span><span className="nav-tag">{m.tag}</span></div>{on&&<span className="nav-pip" style={{background:m.color}}/>}</button>);})}
        </nav>
        <div className="sb-foot"><span className="gdot"/><span className="sb-stat">Gemini 1.5 Flash</span></div>
      </aside>
      <div className="main">
        <header className="hdr">
          <button className="hbg" onClick={()=>setDrawer(v=>!v)}><span/><span/><span/></button>
          <div className="hdr-pill" style={{background:mod.light,borderColor:mod.mid,color:mod.color}}>{mod.icon}<span className="hdr-pill-lbl">{mod.label}</span></div>
          <div className="hdr-info"><span className="hdr-desc">{mod.desc}</span></div>
          {msgs.length>0&&<button className="clr-btn" onClick={clear}>초기화</button>}
        </header>
        <div className="tabbar">{MODS.map(m=>{const on=modId===m.id;return(<button key={m.id} className={`tabpill ${on?"tabpill-on":""}`} style={on?{background:m.light,color:m.color,borderColor:m.mid}:{}} onClick={()=>switchMod(m.id)}>{m.icon} {m.label}</button>);})}</div>
        <div className="chat">
          {msgs.length===0?(
            <div className="welcome">
              <div className="w-hero"><div className="w-ico" style={{background:mod.light,border:`2px solid ${mod.mid}`,color:mod.color}}>{mod.icon}</div><div className="w-title">{mod.label}</div><div className="w-desc">{mod.desc}</div><div className="w-chip">{mod.hint}</div></div>
              <div className="w-qs"><div className="qs-lbl">빠른 시작</div>{mod.quick.map((q,i)=>(<button key={i} className="qcard" style={{"--qc":mod.color,"--qb":mod.light,"--qbr":mod.mid}} onClick={()=>send(q)} disabled={busy}><span className="qcard-n" style={{color:mod.color}}>{i+1}</span><span className="qcard-t">{q.split("\n")[0]}</span><span className="qcard-a" style={{color:mod.color}}>›</span></button>))}</div>
            </div>
          ):(
            <div className="msglist">
              {msgs.map(msg=>(<div key={msg.id} className={`mrow ${msg.role==="user"?"mrow-u":"mrow-ai"}`}><div className={`mav ${msg.role==="user"?"mav-u":"mav-ai"}`} style={msg.role==="assistant"?{background:mod.light,color:mod.color,borderColor:mod.mid}:{}}>{msg.role==="user"?"나":mod.icon}</div><div className={`mwrap ${msg.role==="user"?"mwrap-u":""}`}><div className="mmeta"><span className="msnd">{msg.role==="user"?"담당자":"AI 세무 어시스턴트"}</span><span className="mtm">{fmt(msg.time)}</span></div><div className={`mbub ${msg.role==="user"?"mbub-u":"mbub-ai"}`} style={msg.role==="user"?{background:mod.light,borderColor:mod.mid}:{}}>{msg.role==="assistant"?<div className="mdwrap" dangerouslySetInnerHTML={{__html:mdRender(msg.display)}}/>:<div className="utxt">{msg.display}</div>}</div>{msg.role==="assistant"&&<button className="cpbtn" onClick={()=>copyText(msg.id,msg.display)}>{copied===msg.id?"✓ 복사됨":"복사"}</button>}</div></div>))}
              {busy&&(<div className="mrow mrow-ai"><div className="mav mav-ai" style={{background:mod.light,color:mod.color,borderColor:mod.mid}}>{mod.icon}</div><div className="mwrap"><div className="mmeta"><span className="msnd">AI 세무 어시스턴트</span></div><div className="mbub mbub-ai"><div className="typing"><span style={{background:mod.color}}/><span style={{background:mod.color}}/><span style={{background:mod.color}}/></div><span className="typing-lbl">분석 중...</span></div></div></div>)}
              <div ref={bottomRef}/>
            </div>
          )}
        </div>
        <div className="inpzone">
          {file&&<div className="fchip"><span>📎</span><span className="fn">{file.name}</span><span className="fsz">({(file.size/1024).toFixed(0)}KB)</span><button className="fdel" onClick={()=>setFile(null)}>✕</button></div>}
          <div className="ibox" style={{"--ac":mod.color}}>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,.json" style={{display:"none"}} onChange={onFile}/>
            <button className="iatt" onClick={()=>fileRef.current?.click()}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
            <textarea ref={taRef} className="ita" rows={1} placeholder={mod.ph} value={text} onChange={e=>{setText(e.target.value);resizeTA();}} onKeyDown={onKey} disabled={busy}/>
            <button className="sendbtn" style={{background:(busy||(!text.trim()&&!file))?"#CBD5E1":mod.color}} onClick={()=>send()} disabled={busy||(!text.trim()&&!file)}>{busy?<span className="spin"/>:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}</button>
          </div>
          <div className="ihint"><span>Enter 전송 · Shift+Enter 줄바꿈 · CSV/TXT 첨부 가능</span>{text.length>100&&<span style={{color:text.length>9000?"#DC2626":"#94A3B8"}}>{text.length.toLocaleString()} / 10,000</span>}</div>
        </div>
      </div>
    </div>
    {err&&<div className="toast" onClick={()=>setErr("")}><span>⚠️</span><span className="toast-msg">{err}</span><span style={{opacity:.5,marginLeft:4}}>✕</span></div>}
  </>);
}

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#F1F5F9;font-family:'Noto Sans KR',-apple-system,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased}
button{font-family:inherit;cursor:pointer;border:none;background:none}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:99px}
.shell{display:flex;height:100vh;overflow:hidden}
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:98;backdrop-filter:blur(3px)}
.sb{width:232px;flex-shrink:0;background:#fff;border-right:1px solid #E2E8F0;display:flex;flex-direction:column;z-index:99;transition:transform .25s cubic-bezier(.4,0,.2,1)}
.sb-head{padding:20px 16px 16px;border-bottom:1px solid #F1F5F9}
.logo{display:flex;align-items:center;gap:11px}
.logo-gem{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#1D4ED8,#6D28D9);display:flex;align-items:center;justify-content:center;font-size:1.15rem;box-shadow:0 3px 10px rgba(29,78,216,.3);flex-shrink:0}
.logo-name{font-size:.85rem;font-weight:800;color:#0F172A;letter-spacing:-.025em}
.logo-ver{font-size:.6rem;color:#94A3B8;font-family:'JetBrains Mono',monospace;margin-top:2px}
.sb-nav{flex:1;overflow-y:auto;padding:10px 8px;display:flex;flex-direction:column;gap:2px}
.nav-sec{font-size:.58rem;font-weight:700;color:#94A3B8;letter-spacing:.1em;text-transform:uppercase;padding:8px 8px 6px}
.nav-btn{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:11px;border:1.5px solid transparent;background:transparent;text-align:left;transition:all .15s;position:relative}
.nav-btn:hover:not(.nav-on){background:#F8FAFC}
.nav-on{box-shadow:0 1px 4px rgba(0,0,0,.06)}
.nav-ico{font-size:1.05rem;width:24px;text-align:center;flex-shrink:0}
.nav-txt{display:flex;flex-direction:column;flex:1;min-width:0}
.nav-lbl{font-size:.8rem;font-weight:700;color:#334155}
.nav-tag{font-size:.58rem;color:#94A3B8;font-family:'JetBrains Mono',monospace;margin-top:1px}
.nav-pip{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.sb-foot{padding:12px 14px;border-top:1px solid #F1F5F9;display:flex;align-items:center;gap:7px}
.gdot{width:7px;height:7px;border-radius:50%;background:#22C55E;box-shadow:0 0 6px rgba(34,197,94,.5);flex-shrink:0;animation:pulse 2.5s ease infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.sb-stat{font-size:.65rem;color:#64748B;font-weight:500}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:#F8FAFC}
.hdr{display:flex;align-items:center;gap:10px;padding:0 16px;height:56px;flex-shrink:0;background:#fff;border-bottom:1px solid #E2E8F0;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.hbg{display:none;flex-direction:column;gap:4.5px;padding:6px;border-radius:7px;transition:background .15s;flex-shrink:0}
.hbg span{display:block;width:17px;height:2px;background:#64748B;border-radius:1px}
.hbg:hover{background:#F1F5F9}
.hdr-pill{display:flex;align-items:center;gap:6px;flex-shrink:0;padding:5px 12px;border-radius:20px;border:1.5px solid;font-size:.78rem;font-weight:700;white-space:nowrap}
.hdr-pill-lbl{display:none}
.hdr-info{flex:1;min-width:0}
.hdr-desc{font-size:.73rem;color:#64748B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.clr-btn{padding:5px 11px;border-radius:7px;border:1.5px solid #E2E8F0;background:#fff;color:#64748B;font-size:.7rem;font-weight:600;transition:all .15s;white-space:nowrap;flex-shrink:0}
.clr-btn:hover{background:#FEF2F2;border-color:#FECACA;color:#DC2626}
.tabbar{display:flex;gap:5px;padding:8px 14px;flex-shrink:0;background:#fff;border-bottom:1px solid #E2E8F0;overflow-x:auto;-webkit-overflow-scrolling:touch}
.tabbar::-webkit-scrollbar{height:0}
.tabpill{display:flex;align-items:center;gap:5px;flex-shrink:0;padding:6px 13px;border-radius:20px;border:1.5px solid #E8ECF0;background:#F8FAFC;font-size:.73rem;font-weight:500;color:#64748B;transition:all .15s;white-space:nowrap}
.tabpill:hover:not(.tabpill-on){border-color:#CBD5E1;color:#1E293B;background:#fff}
.tabpill-on{font-weight:700;border-color:transparent!important;box-shadow:0 1px 5px rgba(0,0,0,.08)}
.chat{flex:1;overflow-y:auto;padding:20px 16px 8px}
.welcome{display:flex;flex-direction:column;align-items:center;min-height:100%;justify-content:center;padding:20px 8px}
.w-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;margin-bottom:24px}
.w-ico{width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:1.8rem;box-shadow:0 4px 14px rgba(0,0,0,.08)}
.w-title{font-size:1.45rem;font-weight:900;color:#0F172A;letter-spacing:-.03em;margin-top:4px}
.w-desc{font-size:.82rem;color:#475569;max-width:340px;line-height:1.65}
.w-chip{font-size:.73rem;color:#94A3B8;background:#F8FAFC;border:1px solid #E2E8F0;padding:6px 14px;border-radius:20px;margin-top:2px}
.w-qs{width:100%;max-width:500px}
.qs-lbl{font-size:.62rem;font-weight:700;color:#94A3B8;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;padding-left:2px}
.qcard{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 14px;border-radius:10px;background:var(--qb);border:1.5px solid var(--qbr);color:#1E293B;font-size:.8rem;line-height:1.5;transition:all .18s;margin-bottom:7px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.qcard:last-child{margin-bottom:0}
.qcard:hover:not(:disabled){box-shadow:0 4px 14px rgba(0,0,0,.1);transform:translateY(-2px);border-color:var(--qc)}
.qcard:disabled{opacity:.5;cursor:not-allowed}
.qcard-n{font-size:.7rem;font-weight:800;font-family:'JetBrains Mono',monospace;flex-shrink:0;width:18px}
.qcard-t{flex:1;font-weight:500}
.qcard-a{font-size:1.1rem;flex-shrink:0;transition:transform .15s}
.qcard:hover .qcard-a{transform:translateX(3px)}
.msglist{display:flex;flex-direction:column;gap:16px}
.mrow{display:flex;gap:10px;animation:fu .22s ease}
.mrow-u{flex-direction:row-reverse}
@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.mav{width:34px;height:34px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:800;align-self:flex-start;margin-top:20px;border:1.5px solid transparent}
.mav-u{background:#1E293B;color:#F8FAFC;border-color:#1E293B}
.mav-ai{background:#F0F9FF;border-color:#BAE6FD;color:#0EA5E9}
.mwrap{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.mwrap-u{align-items:flex-end}
.mmeta{display:flex;align-items:center;gap:7px;padding:0 2px}
.msnd{font-size:.63rem;font-weight:700;color:#94A3B8}
.mtm{font-size:.6rem;color:#CBD5E1}
.mbub{max-width:min(80%,580px);padding:12px 15px;border-radius:14px;font-size:.845rem;line-height:1.68;border:1.5px solid;word-break:break-word}
.mbub-ai{background:#fff;border-color:#E2E8F0;color:#1E293B;border-radius:2px 14px 14px 14px;box-shadow:0 2px 6px rgba(0,0,0,.05)}
.mbub-u{border-radius:14px 2px 14px 14px;color:#1E293B}
.utxt{white-space:pre-wrap;word-break:break-word}
.cpbtn{font-size:.62rem;color:#94A3B8;padding:3px 8px;border-radius:5px;border:1px solid #E2E8F0;background:#fff;transition:all .15s;align-self:flex-start;margin-top:2px}
.cpbtn:hover{background:#F8FAFC;color:#475569}
.typing{display:inline-flex;gap:4px;align-items:center;margin-right:8px}
.typing span{width:7px;height:7px;border-radius:50%;animation:bo 1.1s ease infinite}
.typing span:nth-child(2){animation-delay:.16s}.typing span:nth-child(3){animation-delay:.32s}
@keyframes bo{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-6px);opacity:1}}
.typing-lbl{font-size:.72rem;color:#94A3B8;font-style:italic}
.mdwrap{color:#1E293B}
.mp{margin:0 0 .55em;line-height:1.72;font-size:.845rem}.mp:last-child{margin-bottom:0}
.gap{height:.4em}
.mh1{font-size:1.05rem;font-weight:900;color:#0F172A;margin:.9rem 0 .4rem;padding-bottom:5px;border-bottom:2px solid #E2E8F0}
.mh2{font-size:.95rem;font-weight:800;color:#1E293B;margin:.8rem 0 .3rem}
.mh3{font-size:.875rem;font-weight:700;color:#334155;margin:.65rem 0 .25rem}
.mc{background:#F1F5F9;padding:2px 6px;border-radius:5px;font-family:'JetBrains Mono',monospace;font-size:.78em;color:#6D28D9;border:1px solid #E2E8F0}
.mhr{border:none;border-top:2px solid #F1F5F9;margin:.7rem 0}
.mbq{border-left:3px solid #CBD5E1;padding:4px 10px;color:#64748B;font-style:italic;margin:.4rem 0;background:#F8FAFC;border-radius:0 6px 6px 0}
.mul,.mol{display:flex;align-items:flex-start;gap:8px;margin:3px 0;line-height:1.65;font-size:.845rem}
.mud{color:#94A3B8;flex-shrink:0;margin-top:1px}
.mon{color:#1D4ED8;font-weight:800;flex-shrink:0;min-width:20px;font-family:'JetBrains Mono',monospace;font-size:.78em;margin-top:2px}
.tw{overflow-x:auto;margin:10px 0;border-radius:10px;border:1.5px solid #E2E8F0;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.tt{width:100%;border-collapse:collapse;font-size:.79rem;min-width:260px}
.tt thead{background:linear-gradient(135deg,#F8FAFC,#F1F5F9)}
.tt th{padding:9px 12px;font-weight:700;color:#374151;text-align:left;border-bottom:2px solid #E2E8F0;white-space:nowrap;font-size:.78rem}
.tt td{padding:8px 12px;color:#374151;border-bottom:1px solid #F1F5F9;vertical-align:top}
.tt tr:last-child td{border-bottom:none}.tt tr:hover td{background:#FAFAFA}
.inpzone{padding:10px 14px 12px;flex-shrink:0;background:#fff;border-top:1px solid #E2E8F0;box-shadow:0 -2px 10px rgba(0,0,0,.04)}
.fchip{display:flex;align-items:center;gap:7px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:9px;padding:6px 10px;margin-bottom:8px;font-size:.73rem}
.fn{color:#1D4ED8;font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fsz{color:#94A3B8;font-size:.65rem;flex-shrink:0}
.fdel{color:#94A3B8;font-size:.9rem;padding:0 3px;line-height:1}.fdel:hover{color:#DC2626}
.ibox{display:flex;align-items:flex-end;gap:7px;background:#F8FAFC;border:2px solid #E2E8F0;border-radius:14px;padding:7px 7px 7px 11px;transition:border-color .2s,box-shadow .2s}
.ibox:focus-within{border-color:var(--ac);box-shadow:0 0 0 3px color-mix(in srgb,var(--ac) 10%,transparent)}
.iatt{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94A3B8;transition:all .15s;flex-shrink:0}
.iatt:hover{background:#E2E8F0;color:#475569}
.ita{flex:1;background:transparent;border:none;outline:none;font-family:'Noto Sans KR',sans-serif;font-size:.85rem;color:#0F172A;resize:none;line-height:1.58;padding:3px 0;min-height:26px}
.ita::placeholder{color:#94A3B8;font-size:.8rem}.ita:disabled{opacity:.5}
.sendbtn{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;transition:all .2s;box-shadow:0 2px 6px rgba(0,0,0,.15)}
.sendbtn:hover:not(:disabled){transform:scale(1.08)}.sendbtn:disabled{cursor:not-allowed;transform:none;box-shadow:none}
.spin{width:14px;height:14px;border-radius:50%;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;animation:sp .7s linear infinite;display:block}
@keyframes sp{to{transform:rotate(360deg)}}
.ihint{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:.6rem;color:#CBD5E1;padding:0 2px}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1E293B;color:#FCA5A5;padding:10px 16px;border-radius:10px;font-size:.78rem;z-index:9999;display:flex;align-items:flex-start;gap:8px;box-shadow:0 6px 24px rgba(0,0,0,.25);animation:fu .2s ease;cursor:pointer;max-width:calc(100vw - 32px)}
.toast-msg{flex:1;white-space:pre-wrap;word-break:break-word;line-height:1.5}
@media(max-width:768px){.sb{position:fixed;top:0;left:0;bottom:0;transform:translateX(-100%)}.sb-open{transform:translateX(0);box-shadow:4px 0 24px rgba(0,0,0,.15)}.hbg{display:flex}.hdr-pill-lbl{display:inline}.hdr-desc{display:none}.mbub{max-width:90%}.chat{padding:16px 12px 6px}.inpzone{padding:8px 12px 10px}}
@media(min-width:769px){.hdr-pill-lbl{display:inline}.tabbar{display:none}}
@media(min-width:1100px){.chat{padding:24px 36px 10px}.inpzone{padding:12px 36px 16px}.hdr{padding:0 28px}}
`;
