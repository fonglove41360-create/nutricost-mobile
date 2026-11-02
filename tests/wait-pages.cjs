const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const url='https://fonglove41360-create.github.io/nutricost-mobile/';let ready=false;
for(let i=0;i<48;i++){try{
 const cache='?verify='+Date.now(),html=await fetch(url+cache,{cache:'no-store'}).then(r=>r.text());
 const js=await fetch(url+'features-20261102.js'+cache,{cache:'no-store'}).then(r=>r.text());
 const css=await fetch(url+'features-20261102.css'+cache,{cache:'no-store'}).then(r=>r.text());
 if(html.includes("version:'2026.11.02.1'")&&js===fs.readFileSync('features-20261102.js','utf8')&&css===fs.readFileSync('features-20261102.css','utf8')){ready=true;break}
}catch(e){}await new Promise(r=>setTimeout(r,5000))}
assert(ready,'GitHub Pages did not serve the exact verified release assets');console.log('Pages serves release 2026.11.02.1 and exact verified JS/CSS');
})().catch(e=>{console.error(e);process.exitCode=1});