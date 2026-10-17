import {execFileSync} from 'node:child_process';

const git=(...args)=>execFileSync('git',args,{maxBuffer:64*1024*1024,windowsHide:true});
const files=git('ls-files','--cached','-z').toString().split('\0').filter(Boolean),issues=[];
const binary=/\.(?:png|webp|jpe?g|ico|jar|m4a|opus)$/i;
for(const name of files){
 const forbidden=/(?:^|\/)(?:data|node_modules|releases|checkpoints|test-output|desktop-build|desktop-staging|\.toolchain|\.gradle|\.private|\.local-tools|\.aws|\.codex)(?:\/|$)/.test(name)||/^tools\//.test(name)||/^android\/(?:verification\/|.*\/build\/)/.test(name)||/(?:^|\/)(?:config\.json|local\.properties|cookies[^/]*|\.env(?:\..*)?)$/.test(name)&&!name.endsWith('.env.example')||/\.(?:sqlite(?:-.*)?|db(?:-.*)?|jks|keystore|p12|pfx|key|pem|exe|apk|zip|lnk|log)$/i.test(name);
 if(forbidden){issues.push({file:name,reason:'Private/generated file must not be tracked'});continue;}
 const bytes=git('show',':'+name);
 if(bytes.length>25*1024*1024)issues.push({file:name,reason:'Large file belongs outside source history'});
 if(binary.test(name))continue;
 const text=bytes.toString('utf8');
 if(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16})\b/.test(text)||/^-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----/m.test(text))issues.push({file:name,reason:'Possible credential; inspect locally'});
 if(/[A-Z]:[\\/]Users[\\/](?!Public\b|USER\b|username\b)[^\\/\s]+[\\/]/i.test(text))issues.push({file:name,reason:'Personal machine path; use a relative path or configuration'});
}
console.log(JSON.stringify({ok:issues.length===0,stagedFiles:files.length,issues},null,2));
if(!files.length||issues.length)process.exitCode=1;
