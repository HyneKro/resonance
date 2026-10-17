import {execFileSync} from 'node:child_process';

const git=(...args)=>execFileSync('git',args,{maxBuffer:64*1024*1024,windowsHide:true});
const history=process.argv.includes('--history');
const revisions=history?git('rev-list','--all').toString().trim().split('\n'):[''];
const entries=revisions.flatMap(revision=>(revision?git('ls-tree','-r','--name-only','-z',revision):git('ls-files','--cached','-z')).toString().split('\0').filter(Boolean).map(name=>({name,revision})));
const files=[...new Set(entries.map(entry=>entry.name))],issues=[],checked=new Set();
const binary=/\.(?:png|webp|jpe?g|ico|jar|m4a|opus)$/i;
for(const {name,revision} of entries){
 const object=git('rev-parse',revision+':'+name).toString().trim();
 if(checked.has(name+object))continue;checked.add(name+object);
 const forbidden=/(?:^|\/)(?:data|node_modules|releases|checkpoints|test-output|desktop-build|desktop-staging|\.toolchain|\.gradle|\.private|\.local-tools|\.aws|\.codex)(?:\/|$)/.test(name)||/^tools\//.test(name)||/^android\/(?:verification\/|.*\/build\/)/.test(name)||/(?:^|\/)(?:config\.json|local\.properties|cookies[^/]*|\.env(?:\..*)?)$/.test(name)&&!name.endsWith('.env.example')||/\.(?:sqlite(?:-.*)?|db(?:-.*)?|jks|keystore|p12|pfx|key|pem|exe|apk|zip|lnk|log)$/i.test(name);
 if(forbidden){issues.push({file:name,reason:'Private/generated file must not be tracked'});continue;}
 const bytes=git('cat-file','blob',object);
 if(bytes.length>25*1024*1024)issues.push({file:name,reason:'Large file belongs outside source history'});
 if(binary.test(name))continue;
 const text=bytes.toString('utf8');
 if(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16})\b/.test(text)||/^-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----/m.test(text))issues.push({file:name,reason:'Possible credential; inspect locally'});
 if(/[A-Z]:[\\/]Users[\\/](?!Public\b|USER\b|username\b)[^\\/\s]+[\\/]/i.test(text))issues.push({file:name,reason:'Personal machine path; use a relative path or configuration'});
}
console.log(JSON.stringify({ok:issues.length===0,files:files.length,revisions:revisions.length,issues},null,2));
if(!files.length||issues.length)process.exitCode=1;
