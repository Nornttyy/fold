import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url)),repo='Nornttyy/fold';
const run=(command,args,options={})=>execFileSync(command,args,{cwd:root,encoding:'utf8',...options});
const authArgs=['-c','credential.helper=','-c','credential.helper=!gh auth git-credential'];
const remote=run('git',['remote','get-url','origin']).trim();
if(!['https://github.com/'+repo+'.git','https://github.com/'+repo,'git@github.com:'+repo+'.git'].includes(remote))throw new Error('Publish remote does not match '+repo);
for(const task of ['check','test','build'])run('npm',['run',task],{stdio:'inherit'});
const version=JSON.parse(await readFile(root+'package.json','utf8')).version;
const user=JSON.parse(run('gh',['api','user','--jq','{login:.login,id:.id,name:.name}']));
const temporary=await mkdtemp(join(tmpdir(),'fold-pages-'));
try{
  const env={...process.env,GIT_INDEX_FILE:join(temporary,'index'),GIT_AUTHOR_NAME:user.name||user.login,GIT_AUTHOR_EMAIL:user.id+'+'+user.login+'@users.noreply.github.com',GIT_COMMITTER_NAME:user.name||user.login,GIT_COMMITTER_EMAIL:user.id+'+'+user.login+'@users.noreply.github.com'};
  const git=(args,options={})=>run('git',[...authArgs,...args],{env,...options});
  const head=git(['ls-remote','origin','refs/heads/gh-pages']).trim().split(/\s+/)[0];
  if(head)git(['fetch','--no-tags','origin','refs/heads/gh-pages:refs/remotes/origin/gh-pages']);
  git(['read-tree','--empty']);
  git(['--work-tree='+root+'dist','add','--all']);
  const tree=git(['write-tree']).trim();
  const parents=head?['-p',head]:[];
  const commit=git(['commit-tree',tree,...parents,'-m','Deploy Fold '+version]).trim();
  git(['push','origin',commit+':refs/heads/gh-pages'],{stdio:'inherit'});
  console.log('Published Fold '+version+' commit '+commit);
}finally{
  // Only the freshly-created isolated staging index is removed, never a checkout.
  await rm(temporary,{recursive:true,force:true});
}
