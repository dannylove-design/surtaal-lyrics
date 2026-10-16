import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const $ = id => document.getElementById(id);
const fileInput = $("audioFile"), startBtn = $("start"), stopBtn = $("stop");
let selectedFile = null, active = false, stopRequested = false, recognizer = null;

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files?.[0] || null;
  startBtn.disabled = !selectedFile || active;
  $("status").textContent = selectedFile ? `चुनी गई फ़ाइल: ${selectedFile.name} (${(selectedFile.size/1024/1024).toFixed(1)} MB)` : "पहले ऑडियो फ़ाइल चुनें।";
});
function status(s, pct) { $("status").textContent = s; if (pct !== undefined) $("bar").style.width = `${Math.max(0,Math.min(100,pct))}%`; }
function fmt(t) { if (!Number.isFinite(t) || t < 0) t=0; const m=Math.floor(t/60), s=Math.floor(t%60), ms=Math.floor((t%1)*1000); return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(ms).padStart(3,"0")}`; }
function download(name, content, type="text/plain;charset=utf-8") {
  const blob = new Blob([content], {type}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function toSrt(text) {
  const lines=text.split(/\r?\n/).filter(Boolean);
  return lines.map((line,i)=>{const m=line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);let start=0,body=line;if(m){start=Number(m[1])*60+Number(m[2])+Number("0."+(m[3]||"0"));body=m[4];}const end=start+3;return `${i+1}\n${srtTime(start)} --> ${srtTime(end)}\n${body}\n`;}).join("\n");
}
function srtTime(t){const ms=Math.floor((t%1)*1000),s=Math.floor(t%60),m=Math.floor(t/60);return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(ms).padStart(3,"0")}`;}
async function decodeAudio(file) {
  const bytes=await file.arrayBuffer();
  const Ctx=window.AudioContext||window.webkitAudioContext;
  const ctx=new Ctx();
  try {
    const decoded=await ctx.decodeAudioData(bytes);
    const mono=new Float32Array(decoded.length);
    for(let c=0;c<decoded.numberOfChannels;c++){const ch=decoded.getChannelData(c);for(let i=0;i<ch.length;i++)mono[i]+=ch[i]/decoded.numberOfChannels;}
    const targetRate=16000;
    if(decoded.sampleRate===targetRate) return {audio:mono, sample_rate:targetRate};
    const length=Math.ceil(mono.length*targetRate/decoded.sampleRate);
    const offline=new OfflineAudioContext(1,length,targetRate);
    const buffer=offline.createBuffer(1,mono.length,decoded.sampleRate);buffer.copyToChannel(mono,0);
    const src=offline.createBufferSource();src.buffer=buffer;src.connect(offline.destination);src.start();
    const rendered=await offline.startRendering();
    return {audio:rendered.getChannelData(0),sample_rate:targetRate};
  } finally { await ctx.close(); }
}
startBtn.addEventListener("click", async()=>{
  if(!selectedFile||active)return;
  active=true;stopRequested=false;startBtn.disabled=true;stopBtn.disabled=false;
  $("results").classList.add("hidden");$("transcript").value="";
  try{
    if(!recognizer){
      const model=$("model").value;
      status("AI मॉडल लोड हो रहा है। पहली बार मॉडल डाउनलोड होने में समय लग सकता है…",2);
      recognizer=await pipeline("automatic-speech-recognition",model,{
        progress_callback: p=>{
          if(p.status==="progress" && p.total) status(`मॉडल डाउनलोड: ${p.file || ""} ${Math.round(p.progress)}%`, Math.round(p.progress));
          else if(p.status==="done") status(`मॉडल फ़ाइल तैयार: ${p.file || ""}`,8);
        }
      });
    }
    status("ऑडियो पढ़ा जा रहा है…",10);
    const input=await decodeAudio(selectedFile);
    if(input.audio.length/16000>900) throw new Error("यह संस्करण 15 मिनट तक के ऑडियो के लिए बनाया गया है। छोटे हिस्से में काटकर दोबारा आज़माएँ।");
    const lang=$("language").value;
    status("बोल पहचाने जा रहे हैं। मोबाइल पर इसमें कुछ समय लग सकता है…",20);
    const options={return_timestamps:true,chunk_length_s:30,stride_length_s:5};
    if(lang!=="auto") options.language=lang==="hi"?"hindi":"english";
    const result=await recognizer(input.audio,options);
    if(stopRequested){status("प्रक्रिया रोकी गई।",0);return;}
    let text="";
    if(result.chunks?.length){
      text=result.chunks.map(c=>`[${fmt(c.timestamp?.[0] ?? 0)}] ${String(c.text||"").trim()}`).join("\n");
    } else text=result.text||"";
    $("transcript").value=text.trim();$("results").classList.remove("hidden");
    status("पूरा हुआ। परिणाम एडिट करके कॉपी या डाउनलोड कर सकते हैं।",100);
  }catch(e){
    console.error(e);status("समस्या: "+(e?.message||String(e))+"\nअगर मोबाइल धीमा हो, Whisper Tiny चुनें, ब्राउज़र टैब खुला रखें और छोटा ऑडियो इस्तेमाल करें।",0);
  }finally{active=false;startBtn.disabled=!selectedFile;stopBtn.disabled=true;}
});
stopBtn.addEventListener("click",()=>{stopRequested=true;status("रोकने का अनुरोध भेजा गया…");});
$("copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("transcript").value);status("Lyrics कॉपी हो गए।",100);}catch{ $("transcript").select();status("टेक्स्ट चुना गया है; Copy दबाएँ।");}});
$("downloadTxt").addEventListener("click",()=>download("surtaal-lyrics.txt",$("transcript").value));
$("downloadSrt").addEventListener("click",()=>download("surtaal-lyrics.srt",toSrt($("transcript").value),"text/srt;charset=utf-8"));
if("serviceWorker" in navigator && location.protocol.startsWith("http")) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
