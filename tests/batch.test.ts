import { inspectBatch, createInspectUrl, BatchInspectionError } from '../src/core';
const item = {defindex:7,paintindex:0,paintseed:1,paintwear:0.125};
const url = createInspectUrl(item);
test('mixed inputs retain order, report partial failure and deduplicate canonical legacy URLs', async () => {
 const steamClient = {inspectUnmaskedUrl:jest.fn().mockResolvedValue(item)};
 const progress=jest.fn();
 const results=await inspectBatch([url,'M1A2D3','invalid','steam://rungame/730/0/+csgo_econ_action_preview%20M1A2D3',url], {steamClient,onProgress:progress});
 expect(results.map(r=>r.status)).toEqual(['success','success','error','success','success']);
 expect(results.map(r=>r.index)).toEqual([0,1,2,3,4]);
 expect(steamClient.inspectUnmaskedUrl).toHaveBeenCalledTimes(1);
 expect(progress).toHaveBeenCalledTimes(5);
 expect(progress.mock.calls.map(([p])=>p.completed)).toEqual([1,2,3,4,5]);
});
test('missing Steam prerequisites are per-item structured errors', async()=>{
 const result=await inspectBatch(['M1A2D3',url]);
 expect(result[0]).toMatchObject({status:'error',error:{code:'STEAM_REQUIRED'}});
 expect(result[1].status).toBe('success');
});
test('abort stops waiting for an uncooperative resolver and never schedules additional work',async()=>{
 const controller=new AbortController();
 let complete!: (value:typeof item)=>void;
 const steamClient={inspectUnmaskedUrl:jest.fn(()=>new Promise<typeof item>(resolve=>{complete=resolve;}))};
 const batch=inspectBatch(['M1A2D3','M1A3D3',url],{steamClient,signal:controller.signal,concurrency:1});
 await Promise.resolve(); await Promise.resolve(); controller.abort();
 const results=await batch;
 expect(results.every(r=>r.status==='error' && r.error instanceof BatchInspectionError && r.error.code==='CANCELLED')).toBe(true);
 expect(steamClient.inspectUnmaskedUrl).toHaveBeenCalledTimes(1);
 complete(item); await Promise.resolve();
});
test('pre-cancelled batches, empty inputs and duplicate failures are predictable',async()=>{
 const controller=new AbortController();controller.abort();
 expect((await inspectBatch([url],{signal:controller.signal}))[0]).toMatchObject({status:'error',error:{code:'CANCELLED'}});
 expect(await inspectBatch([])).toEqual([]);
 const steamClient={inspectUnmaskedUrl:jest.fn().mockRejectedValue(new Error('offline'))};
 const results=await inspectBatch(['M1A2D3','M1A2D3'],{steamClient});
 expect(results.map(r=>r.status)).toEqual(['error','error']);expect(steamClient.inspectUnmaskedUrl).toHaveBeenCalledTimes(1);
 await expect(inspectBatch([],{concurrency:0})).rejects.toThrow('concurrency');
});

test('unclassified resolver Errors receive a batch code while coded errors retain identity', async () => {
 const original = new Error('resolver disconnected');
 const coded = Object.assign(new Error('Steam not ready'), {code:'STEAM_NOT_READY_ERROR'});
 const steamClient = {inspectUnmaskedUrl:jest.fn().mockRejectedValueOnce(original).mockRejectedValueOnce(coded)};
 const results=await inspectBatch(['M1A2D3','M1A3D3'],{steamClient});
 expect(results[0]).toMatchObject({status:'error',error:{code:'INSPECTION_FAILED',cause:original}});
 expect(results[1].status === 'error' && results[1].error).toBe(coded);
});
