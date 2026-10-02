#!/usr/bin/env node
/** Pack then exercise installed exports, declarations, CLI and a real browser bundle. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'inspect-consumers-'));
function run(command, args, cwd = temporary) {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 300000 });
    if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
    return result.stdout.trim();
}
try {
    run('npm', ['run', 'build'], root);
    const [packed] = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], root));
    for (const entry of ['index', 'core', 'steam', 'cli']) assert(packed.files.some(file => file.path === `dist/${entry}.js`));
    for (const entry of ['index', 'core', 'steam']) assert(packed.files.some(file => file.path === `dist/${entry}.d.ts`));
    assert(packed.files.some(file => file.path === 'dist/item-data.json'));
    assert(!packed.files.some(file => /^(?:src|tests|node_modules)\//.test(file.path)));
    fs.writeFileSync(path.join(temporary, 'package.json'), JSON.stringify({ private: true }));
    const versions = (process.env.INSPECT_TEST_RUNTIMES || '22.12.0,24.0.0,26.10.0').split(',');
    run('npm', ['install', '--no-audit', '--no-fund', path.join(temporary, packed.filename), 'typescript@5.9.3', '@types/node@22.10.2', 'esbuild@0.28.2', ...(process.env.NODE_CS2_PACKAGE ? [process.env.NODE_CS2_PACKAGE] : []), ...versions.filter(v => v !== 'current').map(v => `runtime-${v.split('.')[0]}@npm:node@${v}`)]);
    fs.copyFileSync(path.join(root, 'fixtures/inspect-corpus.json'), path.join(temporary, 'corpus.json'));
    fs.writeFileSync(path.join(temporary, 'consumer.cjs'), `
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
Module._load = function(id, ...args) { if (/^(node-cs2|steam-user)(\\/|$)/.test(id)) throw new Error('core attempted Steam import: ' + id); return original.call(this,id,...args); };
const core = require('cs2-inspect-lib/core');
Module._load = original;
const root = require('cs2-inspect-lib');
const steam = require('cs2-inspect-lib/steam');
assert.equal(root.CS2Inspect, steam.CS2Inspect);
assert.equal(typeof require('cs2-inspect-lib/dist/protobuf-reader').ProtobufReader, 'function');
const corpus = require('./corpus.json');
const NodeCS2 = require('node-cs2');
const dependencyVersion = require('node-cs2/package.json').version;
const [dependencyMajor, dependencyMinor] = dependencyVersion.split('.').map(Number);
assert(dependencyMajor > 2 || (dependencyMajor === 2 && dependencyMinor >= 6), 'Expected installed node-cs2 >=2.6.0, got ' + dependencyVersion);
console.log('Installed node-cs2: ' + dependencyVersion);
const cs2 = Object.create(NodeCS2.prototype);
(async () => {
 for (const fixture of corpus.valid) {
  const url = 'steam://rungame/730/0/+csgo_econ_action_preview%20' + fixture.token;
  const document = core.decodeInspectDocument(url);
  const remote = await cs2.inspectItem(url);
  const local = document.item;
  assert.equal(local.itemid.toString(), remote.itemid);
  for (const [key, value] of Object.entries(fixture.expected)) {
   if (key === 'itemid') continue;
   if (key === 'blobdata') { assert.equal(Buffer.from(local[key]).toString('hex'), value); assert.equal(Buffer.from(remote[key]).toString('hex'), value); }
   else if (['stickers','keychains','variations'].includes(key)) {
    for (let i=0;i<value.length;i++) for (const field of Object.keys(value[i])) assert.equal(local[key][i][field], remote[key][i][field]);
   } else if (key === 'customnames') assert.deepEqual(local[key] || [], remote[key]);
   else assert.equal(local[key], remote[key]);
  }
 }
 const url = 'steam://rungame/730/0/+csgo_econ_action_preview%20' + corpus.valid[0].token;
 const batch = await root.inspectBatch([url, url, 'invalid'], { config:{validateInput:false} });
 assert.deepEqual(batch.map(result => result.status), ['success','success','error']);
 console.log(process.version + ': 56 shared fixtures agree; root/core/steam and batch passed');
})().catch(error => {console.error(error);process.exitCode=1});
`);
    fs.writeFileSync(path.join(temporary, 'usage.ts'), `
import { decodeInspectDocument, compareItems, diagnoseInspectLink, validateItemData, EconItem } from 'cs2-inspect-lib/core';
import { CS2Inspect, inspectBatch } from 'cs2-inspect-lib';
import { SteamClientManager } from 'cs2-inspect-lib/steam';
const item: EconItem = {defindex:7,paintindex:44,paintseed:0,paintwear:.15};
validateItemData(item,{mode:'permissive'});
compareItems(item,{...item,customname:''});
diagnoseInspectLink('url').diagnostics.forEach(d => console.log(d.code));
const edit = (url: string) => decodeInspectDocument(url).edit({paintseed:1}).editAttachment('stickers',0,{rotation:45});
void edit; void CS2Inspect; void SteamClientManager;
inspectBatch([], {signal:new AbortController().signal,onProgress:p=>console.log(p.completed)}).then(results=>results.forEach(result=> { if(result.status==='success') console.log(result.item.itemid); else console.log(result.error.message); }));
`);
    fs.writeFileSync(path.join(temporary, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target:'ES2022',module:'Node16',moduleResolution:'Node16',strict:true,noEmit:true,skipLibCheck:false }, files:['usage.ts'] }));
    console.log(run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']));
    // No ambient Node types: the core declaration graph must be consumable by
    // a browser-only TypeScript project, including its public argument types.
    fs.writeFileSync(path.join(temporary, 'browser-usage.ts'), `
import { createInspectUrl, decodeInspectDocument, compareItems, diagnoseInspectLink, validateItemData, ProtobufReader, ProtobufWriter, EconItem } from 'cs2-inspect-lib/core';
const item: EconItem = {defindex:7,paintindex:44,paintseed:0,paintwear:.15,blobdata:new Uint8Array([0,255])};
const url: string = createInspectUrl(item);
const document = decodeInspectDocument(url).edit({customnames:['日本語🔥','']});
const protobuf: Uint8Array = document.toProtobuf();
const decoded: EconItem = ProtobufReader.decodeItemData(protobuf);
const encoded: Uint8Array = ProtobufWriter.encodeItemData(decoded);
validateItemData(decoded,{mode:'permissive'}).diagnostics.forEach(d => document.item.customname === d.code);
compareItems(item,document.item).forEach(change => console.log(change.path));
diagnoseInspectLink(url).diagnostics.forEach(d => console.log(d.code));
void encoded;
// @ts-expect-error Buffer must not become an ambient dependency of the core.
Buffer.from([]);
// @ts-expect-error NodeJS globals must not leak through browser declarations.
const timer: NodeJS.Timeout = 0;
void timer;
`);
    fs.writeFileSync(path.join(temporary, 'tsconfig.browser.json'), JSON.stringify({ compilerOptions: { target:'ES2022',lib:['ES2022','DOM'],types:[],module:'ESNext',moduleResolution:'Bundler',strict:true,noEmit:true,skipLibCheck:false }, files:['browser-usage.ts'] }));
    run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.browser.json']);
    console.log('Browser-only TypeScript declarations pass with types:[] and ES2022/DOM libraries');
    fs.writeFileSync(path.join(temporary, 'browser-entry.js'), `import {decodeInspectDocument,createInspectUrl,compareItems,validateItemData,diagnoseInspectLink} from 'cs2-inspect-lib/core';globalThis.browserInspect={decodeInspectDocument,createInspectUrl,compareItems,validateItemData,diagnoseInspectLink};`);
    fs.writeFileSync(path.join(temporary, 'browser-check.cjs'), `
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const built=esbuild.buildSync({entryPoints:['browser-entry.js'],bundle:true,platform:'browser',format:'iife',write:false,metafile:true});
assert(!Object.keys(built.metafile.inputs).some(name=>/(node-cs2|steam-user)/.test(name)));
const context=vm.createContext({TextEncoder,TextDecoder,console});
vm.runInContext(built.outputFiles[0].text,context);
assert.equal(vm.runInContext('typeof Buffer',context),'undefined');
const fixture=require('./corpus.json').valid[6];
const document=context.browserInspect.decodeInspectDocument('steam://rungame/730/0/+csgo_econ_action_preview%20'+fixture.token);
assert.equal(document.item.itemid.toString(),fixture.expected.itemid);
const url=context.browserInspect.createInspectUrl({defindex:7,paintindex:44,paintwear:.15,paintseed:1});
assert.equal(context.browserInspect.decodeInspectDocument(url).item.paintseed,1);
console.log('Browser bundle executes without Buffer, node-cs2 or steam-user ('+built.outputFiles[0].contents.length+' bytes)');
`);
    console.log(run(process.execPath, ['browser-check.cjs']));
    const corpus = JSON.parse(fs.readFileSync(path.join(temporary, 'corpus.json'), 'utf8'));
    for (const version of versions) {
        const binary = version === 'current' ? process.execPath : path.join(temporary, 'node_modules', `runtime-${version.split('.')[0]}`, 'bin', 'node');
        console.log(run(binary, ['consumer.cjs']));
        const cli = path.join('node_modules', 'cs2-inspect-lib', 'dist', 'cli.js');
        assert.match(run(binary, [cli, '--help']), /decode/);
        assert.match(run(binary, [cli, '--version']), /^\d+\.\d+\.\d+/);
        const output = run(binary, [cli, 'decode', 'steam://rungame/730/0/+csgo_econ_action_preview%20' + corpus.valid[0].token]);
        assert.match(output, /paintwear/);
        console.log(`${version}: packed CLI help, version and embedded decode passed`);
    }
    console.log(`Validated packed ${packed.filename}; declarations, exports, CLI, browser and cross-library corpus complete.`);
} finally {
    if (process.env.KEEP_CONSUMER_PROJECT) console.log(`Consumer project retained: ${temporary}`);
    else fs.rmSync(temporary, { recursive: true, force: true });
}
