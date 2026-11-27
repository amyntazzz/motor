import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const token=Deno.env.get("TELEGRAM_BOT_TOKEN")!, secret=Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
async function tg(method:string,payload:Record<string,unknown>){return await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});}
async function send(chat:number,text:string){
 return tg("sendMessage",{chat_id:chat,text,parse_mode:"HTML",reply_markup:{keyboard:[
 [{text:"📍 Catat KM"},{text:"🛠 Catat Servis"}],[{text:"🏍 Profil Motor"},{text:"📅 Jadwal"}],[{text:"💰 Pengeluaran"},{text:"❓ Bantuan"}]
 ],resize_keyboard:true,is_persistent:true}});
}

async function sendServiceMenu(chat:number) {
  return tg("sendMessage", {
    chat_id: chat,
    text: "🛠 <b>Pilih jenis servis motor:</b>",
    parse_mode: "HTML",
    reply_markup: {
      keyboard: [
        [{text:"Ganti oli mesin"},{text:"Ganti oli gardan"}],
        [{text:"Servis CVT"},{text:"Ganti busi"}],
        [{text:"Ganti kampas rem"},{text:"Ganti filter udara"}],
        [{text:"Ganti aki"},{text:"Ganti ban"}],
        [{text:"Servis rantai dan gear"}],
        [{text:"Servis kelistrikan"}],
        [{text:"Servis lainnya"}]
      ],
      resize_keyboard: true,
      is_persistent: true
    }
  });
}

async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("");}
const help=`<b>RiderCare Bot</b>
/odo 28500 | Catatan
/servis Ganti oli | 28500 | 75000 | 25000 | Catatan
/motor · /jadwal · /biaya · /bantuan
Format servis: nama | KM | sparepart | jasa | catatan. Biaya dalam rupiah tanpa titik.`;
function num(s:string){return Number(s.trim().replace(/[. ]/g,"").replace(",","."));}
Deno.serve(async req=>{
 if(req.method!=="POST")return new Response("ok");
 if(req.headers.get("x-telegram-bot-api-secret-token")!==secret)return new Response("Unauthorized",{status:401});
 try{
  const upd=await req.json(),m=upd.message;if(!m?.chat?.id||!m?.from?.id||typeof m.text!=="string")return new Response("ok");
  const chat=Number(m.chat.id),tid=Number(m.from.id),txt=m.text.trim();
  const sendHelp=async()=>send(chat,help);
  if(txt==="/start"||txt==="/bantuan"||txt==="❓ Bantuan"){
   const {data:l}=await db.from("ridercare_telegram_links").select("user_id").eq("telegram_id",tid).maybeSingle();
   return await send(chat,l?`Akun Anda sudah terhubung.\n\n${help}`:`Selamat datang! Hubungkan akun melalui RiderCare → Pengaturan → Buat kode, lalu kirim /link KODE.\n\n${help}`);
  }
  if(txt.startsWith("/link ")){
   const code=txt.split(/\s+/)[1]||"";if(!/^\d{6}$/.test(code))return await send(chat,"Format: /link diikuti kode 6 digit.");
   const {data:c}=await db.from("ridercare_telegram_link_codes").select("user_id,expires_at,used_at").eq("code_hash",await sha(code)).maybeSingle();
   if(!c||c.used_at||Date.parse(c.expires_at)<Date.now())return await send(chat,"Kode tidak valid/kedaluwarsa. Buat kode baru dari RiderCare.");
   const {error}=await db.from("ridercare_telegram_links").upsert({telegram_id:tid,user_id:c.user_id,telegram_username:m.from.username||null,first_name:m.from.first_name||null,pending_action:null,updated_at:new Date().toISOString()},{onConflict:"telegram_id"});
   if(error)return await send(chat,"Gagal menautkan akun. Periksa apakah akun RiderCare sudah tertaut ke Telegram lain.");
   await db.from("ridercare_telegram_link_codes").update({used_at:new Date().toISOString()}).eq("code_hash",await sha(code));
   return await send(chat,"✅ Telegram berhasil ditautkan ke akun RiderCare Anda.");
  }
  const {data:u}=await db.from("ridercare_telegram_links").select("user_id,pending_action").eq("telegram_id",tid).maybeSingle();
  if(!u)return await send(chat,"Telegram belum terhubung. Buka RiderCare → Pengaturan → Buat kode, lalu kirim /link KODE.");
  if(txt==="📍 Catat KM"){await db.from("ridercare_telegram_links").update({pending_action:"odo"}).eq("telegram_id",tid);return await send(chat,"Kirim: 28500 | Catatan (catatan opsional).");}
  if(txt.includes("Catat Servis")) {
  await db.from("ridercare_telegram_links")
    .update({pending_action:"service"})
    .eq("telegram_id",tid);
  return await sendServiceMenu(chat);
}
  if(txt==="🏍 Profil Motor"||txt==="/motor"){
   const {data}=await db.from("ridercare_data").select("app_data").eq("user_id",u.user_id).maybeSingle();const b=data?.app_data?.bike||{};
   return await send(chat,`<b>Profil motor</b>\n${b.name||"Motor saya"}\n${b.model||"-"} · ${b.year||"-"}\n${Number(b.km||0).toLocaleString("id-ID")} KM`);
  }
  if(txt==="📅 Jadwal"||txt==="/jadwal"){
   const {data}=await db.from("ridercare_data").select("app_data").eq("user_id",u.user_id).maybeSingle();const a=data?.app_data?.schedules||[];
   return await send(chat,a.length?`<b>Jadwal maintenance</b>\n`+a.slice(0,20).map((s:any)=>`• ${s.name}: ${s.km?s.km+" KM":s.months+" bulan"}`).join("\n"):"Belum ada jadwal.");
  }
  if(txt==="💰 Pengeluaran"||txt==="/biaya"){
   const {data}=await db.from("ridercare_data").select("app_data").eq("user_id",u.user_id).maybeSingle();const logs=data?.app_data?.logs||[];
   const total=logs.reduce((a:number,x:any)=>a+Number(x.part||0)+Number(x.labor||0),0);
   return await send(chat,`<b>Pengeluaran</b>\nTransaksi: ${logs.length}\nTotal: ${new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(total)}`);
  }


const serviceTypes = [
  "Ganti oli mesin",
  "Ganti oli gardan",
  "Servis CVT",
  "Ganti busi",
  "Ganti kampas rem",
  "Ganti filter udara",
  "Ganti aki",
  "Ganti ban",
  "Servis rantai dan gear",
  "Servis kelistrikan",
  "Servis lainnya"
];

if (serviceTypes.includes(txt)) {
  const selected = txt === "Servis lainnya" ? "" : txt;

  await db.from("ridercare_telegram_links")
    .update({
      pending_action: selected
        ? `service|${selected}`
        : "service"
    })
    .eq("telegram_id", tid);

  return await send(
    chat,
    selected
      ? `Jenis servis: <b>${selected}</b>\n\nKirim data dengan format:\nKM | Sparepart | Jasa | Catatan`
      : "Kirim data dengan format:\nNama servis | KM | Sparepart | Jasa | Catatan"
  );
}


  let action=u.pending_action,payload=txt;
  if(txt.startsWith("/odo ")){action="odo";payload=txt.slice(5);}
  if(txt.startsWith("/servis ")){action="service";payload=txt.slice(8);}
  if(!action)return await sendHelp();
  const p=payload.split("|").map((x:string)=>x.trim());
  if(action==="odo"){
   const km=num(p[0]);if(!Number.isFinite(km)||km<=0)return await send(chat,"KM tidak valid. Contoh: /odo 28500 | Catatan");
   const {error}=await db.rpc("ridercare_telegram_add_odo",{p_user_id:u.user_id,p_km:km,p_note:p[1]||""});
   if(error)return await send(chat,`Gagal: ${error.message}`);
   await db.from("ridercare_telegram_links").update({pending_action:null}).eq("telegram_id",tid);
   return await send(chat,`✅ Odometer tersimpan: <b>${km.toLocaleString("id-ID")} KM</b>`);
  }

const selectedName = action.startsWith("service|") ? action.slice(8) : "";
const offset = selectedName ? 0 : 1;
const name = selectedName || p[0] || "";
const km = num(p[offset] || "");
const part = num(p[offset+1] || "0");
const labor = num(p[offset+2] || "0");
const note = p.slice(offset+3).join(" | ");  

  if(!name||!Number.isFinite(km)||km<=0||!Number.isFinite(part)||!Number.isFinite(labor)||part<0||labor<0)return await send(chat,"Format servis: /servis Ganti oli | 28500 | 75000 | 25000 | Catatan");
  const {error}=await db.rpc("ridercare_telegram_add_service",{p_user_id:u.user_id,p_name:name,p_km:km,p_part:part,p_labor:labor,p_note:note});
  if(error)return await send(chat,`Gagal: ${error.message}`);
  await db.from("ridercare_telegram_links").update({pending_action:null}).eq("telegram_id",tid);
  return await send(chat,`✅ Servis dicatat: ${name}\nKM ${km.toLocaleString("id-ID")}\nTotal biaya Rp${(part+labor).toLocaleString("id-ID")}`);
 }catch(e){console.error(e);return new Response("ok");}
});
