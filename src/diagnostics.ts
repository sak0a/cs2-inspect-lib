import { analyzeInspectUrl } from './url-analyzer';
import { decodeInspectDocument } from './inspect-document';
import { ItemDiagnostic, validateItemData, ITEM_DATA_VERSION } from './item-tools';
import { EconItem } from './types';
export interface InspectDiagnostics {
    type: 'embedded' | 'inventory' | 'market' | 'invalid';
    requiresSteam: boolean;
    valid: boolean;
    diagnostics: ItemDiagnostic[];
    item?: EconItem;
    snapshot: string;
}
/** Nonthrowing strict diagnosis; existing analyzer methods retain their behavior. */
export function diagnoseInspectLink(url: string, options: { mode?: 'strict' | 'permissive' } = {}): InspectDiagnostics {
    const result: InspectDiagnostics = { type:'invalid', requiresSteam:false, valid:false, diagnostics:[], snapshot:ITEM_DATA_VERSION };
    let stage = 'URL_PARSE';
    try {
        const analyzed = analyzeInspectUrl(url,{validateInput:false});
        if (analyzed.url_type === 'unmasked') {
            result.type = analyzed.market_id ? 'market' : 'inventory'; result.requiresSteam=true; result.valid=true;
            return result;
        }
        result.type='embedded'; stage='WIRE_DECODE';
        result.item=decodeInspectDocument(url).item;
        const validation=validateItemData(result.item,options);
        result.valid=validation.valid; result.diagnostics=validation.diagnostics;
    } catch(error) { result.diagnostics.push({code:stage,path:'',message:(error as Error).message,severity:'error'}); }
    return result;
}
