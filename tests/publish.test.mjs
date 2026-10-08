import test from 'node:test';
import assert from 'node:assert/strict';
import {assetUrl} from '../src/audio.js';
import {makeChart,DIFFICULTIES} from '../src/chart.js';
import {SONGS} from '../src/songs.js';

test('audio URLs remain relative for GitHub project pages and invalidate stale song caches',()=>{
  for(const s of SONGS){const url=new URL(assetUrl(s.file),'https://example.github.io/fold/');assert.equal(url.pathname,'/fold/'+s.file);assert.equal(url.searchParams.get('v'),'0.7.0');}
  assert.equal(assetUrl('assets/snap.wav?preview=1'),'assets/snap.wav?preview=1&v=0.7.0');
});
test('every difficulty remains capped at two simultaneous heads below level fourteen',()=>{
  for(const s of SONGS)Object.keys(DIFFICULTIES).forEach((d,i)=>{if(s.levels[i]<14)assert.ok(makeChart(d,s.id).every(n=>n.chord<=2));});
});
