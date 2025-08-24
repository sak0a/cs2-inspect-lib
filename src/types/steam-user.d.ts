declare module 'steam-user' {
    import { EventEmitter } from 'events';
    
    export default class SteamUser extends EventEmitter {
        constructor(options?: any);
        
        // Core methods
        logOn(details: any): void;
        gamesPlayed(games: number[] | any[]): void;
        logOff(): void;
        
        // Properties
        packageName: string;
        packageVersion: string;
        steamID?: any;
        
        // Events
        on(event: 'loggedOn', listener: () => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: 'disconnected', listener: (eresult: number, msg?: string) => void): this;
        on(event: 'appLaunched', listener: (appid: number) => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
        
        emit(event: 'loggedOn'): boolean;
        emit(event: 'error', err: Error): boolean;
        emit(event: 'disconnected', eresult: number, msg?: string): boolean;
        emit(event: 'appLaunched', appid: number): boolean;
        emit(event: string, ...args: any[]): boolean;
    }
}
