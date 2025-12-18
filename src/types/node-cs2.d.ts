declare module 'node-cs2' {
    import { EventEmitter } from 'events';
    
    export default class NodeCS2 extends EventEmitter {
        constructor(steamUser: any);
        
        // Core methods
        helloGC(): void;
        inspectItem(owner: string, assetid: string, d: string): void;
        requestLiveGameForUser(accountid: string): void;
        requestRecentGames(accountid: string): void;
        requestPlayersProfile(accountid: string): void;
        requestCurrentLiveGames(): void;
        
        // Static properties
        static ItemCustomizationNotification: any;
        static ItemQuality: any;
        static ItemRarity: any;
        static ItemType: any;
        static ItemWear: any;
        
        // Events
        on(event: 'connectedToGC', listener: () => void): this;
        on(event: 'disconnectedFromGC', listener: (reason: number) => void): this;
        on(event: 'connectionStatus', listener: (status: number, data: any) => void): this;
        on(event: 'inspectItemInfo', listener: (item: InspectItemInfo) => void): this;
        on(event: 'matchList', listener: (matches: any[], data: any) => void): this;
        on(event: 'playersProfile', listener: (profile: any) => void): this;
        on(event: 'liveGames', listener: (games: any[]) => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
        
        emit(event: 'connectedToGC'): boolean;
        emit(event: 'disconnectedFromGC', reason: number): boolean;
        emit(event: 'connectionStatus', status: number, data: any): boolean;
        emit(event: 'inspectItemInfo', item: InspectItemInfo): boolean;
        emit(event: 'matchList', matches: any[], data: any): boolean;
        emit(event: 'playersProfile', profile: any): boolean;
        emit(event: 'liveGames', games: any[]): boolean;
        emit(event: string, ...args: any[]): boolean;
    }
    
    // Interface for inspect item info with all modern CS2 fields
    export interface InspectItemInfo {
        // Basic item properties
        itemid?: string;
        defindex?: number;
        paintindex?: number;
        paintseed?: number;
        paintwear?: number;
        rarity?: number;
        quality?: number;
        killeaterscoretype?: number;
        killeatervalue?: number;
        
        // Modern CS2 fields
        musicindex?: number;
        entindex?: number;
        petindex?: number;
        style?: number;
        upgrade_level?: number;
        
        // Arrays with full field support
        stickers?: StickerInfo[];
        keychains?: StickerInfo[];
        variations?: StickerInfo[];  // New array support
    }
    
    // Interface for sticker/keychain/variation info with highlight_reel support
    export interface StickerInfo {
        slot?: number;
        sticker_id?: number;
        wear?: number | null;
        scale?: number | null;
        rotation?: number | null;
        tint_id?: number | null;
        offset_x?: number | null;
        offset_y?: number | null;
        offset_z?: number | null;
        pattern?: number | null;
        highlight_reel?: number | null;
        wrapped_sticker?: number | null;
    }
}
