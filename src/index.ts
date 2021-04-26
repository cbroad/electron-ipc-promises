import Electron, { ipcRenderer, ipcMain } from "electron";
import {EventEmitter} from "events";

import Config from "./Config";

const IS_RENDERER: boolean = (process && process.type === 'renderer');


type IPCMessengerRequestArg = { data: IPCMessengerRequestData, id: number, label: string };
type IPCMessengerResponseArg = { data: IPCMessengerResponseData, id: number, label: "response" };
type IPCMessengerArg = IPCMessengerRequestArg|IPCMessengerResponseArg;

type IPCMessengerRequestData = any;
type IPCMessengerResponseData = { err: NodeJS.ErrnoException|string|null, res?: any };

type IPCMessengerWaiting = { count:number, entries: { [key: number]: IPCMessengerWaitingEntry } };

type IPCMessengerWaitingEntry = { reject: (reason?:unknown)=>void, resolve: (value:unknown)=>void, timer: NodeJS.Timeout };



class AbstractIPCMessenger extends EventEmitter {

	channel: string = Config.channel;
	console: Console = Config.console;
	debug: boolean = Config.debug;
	defaultTimeout: number = Config.timeout;
	
	electronIPC: ( Electron.IpcMain | Electron.IpcRenderer );

	waiting: IPCMessengerWaiting  = { count: 0, entries: {} };


	constructor( electronIPC: (Electron.IpcMain | Electron.IpcRenderer) ) {
		super();
		this.electronIPC = electronIPC ;


		electronIPC.on( this.channel, ( event: (Electron.IpcMainEvent | Electron.IpcRendererEvent), ...args: any[] ): void => {
			const { data, label, id } = args[0] as IPCMessengerArg;

			if( label === "response" ) {
				this.onResponse( id, data as IPCMessengerResponseData );
			} else {
				this.debug && this.console.debug( `IPCMessenger.on( "${label}", { id: ${id}, data: ${JSON.stringify(data)} } )` );
				
				this.emit( label, data, (  err: NodeJS.ErrnoException|String|null, res?: any ): void  => {
					this.debug && this.console.debug( `IPCMessenge.reply( ${id}, err=${err}, res=${JSON.stringify(res)} )` );

					err = (!err || (typeof err === "string") )? err : (err as NodeJS.ErrnoException).message;
					const payload = { data: { err, res }, id, label: "response" };
					try {
						event.sender.send( this.channel, payload );
					} catch( e ) {
						if( e.message !== "Object has been destroyed" ) {
							throw e;
						}
						this.debug && this.console.debug( "IPCMessenger: Target window has been closed." );
					}
				} );
			}
		} );
	}


	cleanUpAfterMessage( id: number ) {
		this.console.log( `IPCMessenger.cleanupAfterMessage( ${id} )` );
		if( this.waiting.entries[ id ] ) {
			const entry = this.waiting.entries[ id ];
			if(entry.timer) {
				clearTimeout(entry.timer);
			}
			delete this.waiting.entries[ id ];
		}
	}

	onResponse( id: number, data: IPCMessengerResponseData ): void {
		this.debug && this.console.debug( `IPCMessenger.onResponse( ${id}, ${JSON.stringify(data)} )` );

		const entry = this.waiting.entries[ id ];

		if( ! entry ) {
			throw new Error( `Recieved unexpected response: ${ JSON.stringify( { id, data } ) }` );
		}

		const { reject, resolve, } = entry;
		if( data.err ) {
			reject( new Error( data.err as string ) );
		} else {
			resolve( data.res );
		}
		this.cleanUpAfterMessage( id );
	}


	// async _send( label: string ): Promise<any>;
	// async _send( label: string, data: IPCMessengerRequestData ): Promise<any>;
	// async _send( label: string, data: IPCMessengerRequestData, timeout: number ): Promise<any>;
	// async _send( target: Electron.WebContents, label: string ): Promise<any>;
	// async _send( target: Electron.WebContents, label: string, data: IPCMessengerRequestData ): Promise<any>;
	// async _send( target: Electron.WebContents, label: string, data: IPCMessengerRequestData, timeout: number ): Promise<any>;
	async _send( ...args: any[] ): Promise<any> {
		const target: Electron.IpcRenderer|Electron.WebContents = ( typeof args[0] ==="string" ) ? this.electronIPC as Electron.IpcRenderer : args.shift() as Electron.WebContents ;
		const label: string = args.shift() as string;
		const data: IPCMessengerRequestData = args.shift();
		const timeout: number = ( typeof args[0] === "number" ) ? args.shift() : this.defaultTimeout;

		const id = ( this.waiting.count++ );
		// const payload = { data: JSON.stringify( data ), id, label, };
		const payload = { data, id, label, };

		target.send( this.channel, payload );
		this.debug && this.console.debug( `IPCMessenger.send( ${id}, "${label}", ${JSON.stringify(data)} )` );

		if( this.electronIPC !== target ) {
			( target as Electron.WebContents ).once( "destroyed", () => {
				this.cleanUpAfterMessage( id );
			} );
		}

		return new Promise( (resolve: ((value:any)=>void), reject: ((reason?:any)=>void) ) => {
			if( timeout == 0 ) {
				return resolve;
			}
			const timer = setTimeout( () => {
				this.cleanUpAfterMessage( id );
				this.console.error( `IPCMessenger.timeout( ${id}, "${label}", ${JSON.stringify(data)} )` );
			}, timeout);
			this.waiting.entries[ id ] = { reject, resolve, timer, };
		} );
	}
	
}

export class IPCMessengerMain extends AbstractIPCMessenger {

	constructor( ) {
		super( ipcMain );
	}

	async send( target: Electron.WebContents, label: string ): Promise<any>;
	async send( target: Electron.WebContents, label: string, data: IPCMessengerRequestData ): Promise<any>;
	async send( target: Electron.WebContents, label: string, data: IPCMessengerRequestData, timeout: number ): Promise<any>;
	async send( target: Electron.WebContents, label: string, data?: IPCMessengerRequestData, timeout?: number ): Promise<any> {
		return super._send( target, label, data, timeout );
	}


}

class IPCMessengerRenderer extends AbstractIPCMessenger {

	constructor() {
		super( ipcRenderer );
	}

	async send( label: string ): Promise<any>;
	async send( label: string, data: IPCMessengerRequestData ): Promise<any>;
	async send( label: string, data: IPCMessengerRequestData, timeout: number ): Promise<any>;
	async send( label: string, data?: IPCMessengerRequestData, timeout?: number ): Promise<any> {
		return super._send( label, data, timeout );
	}
}


export const IPCMessenger = IS_RENDERER ? new IPCMessengerRenderer() : new IPCMessengerMain();