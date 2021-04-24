import Electron, { IpcMain } from "electron";
import {EventEmitter} from "events";

import { IPCMessengerArg, IPCMessengerResponseData, IPCMessengerWaiting, IPCMessengerWaitingEntry } from "./IPCMessengerTypes";
import { isBrowser } from "./HelperFunctions";
import Config from "./Config";

const consoleLog = isBrowser() ? console : require( "electron-log" );

export class AbstractIPCMessenger extends EventEmitter {

	debug: boolean = Config.debug;
	defaultTimeout: number = Config.timeout;
	
	electronIPC: ( Electron.IpcMain | Electron.IpcRenderer );

	waiting: IPCMessengerWaiting  = { count: 0, entries: {} };


	constructor( electronIPC: (Electron.IpcMain | Electron.IpcRenderer) ) {
		super();
		this.electronIPC = electronIPC ;


		// @ts-ignore
		electronIPC.on("message", ( event: (Electron.IpcMainEvent | Electron.IpcRendererEvent), ...args: any[] ): void => {
			const payload: IPCMessengerArg = args[0];
			let id = payload.id;
			let label = payload.label;
			let data: { [key:string]: any } = payload.hasOwnProperty( "data" ) ? JSON.parse( payload.data ) : {};

			this.debug && consoleLog.debug( `IPCMessenger.on(%j, { id: %j, data: %j } )`, label, id, data );

			if( label === "response" ) {
				this.onResponse( id, data as IPCMessengerResponseData );
			} else {
				this.emit( label, data, reply );
			}

			const self = this;

			function reply( replyData: { [key: string]: any } = {} ): void {
				self.debug && consoleLog.debug( "IPCMessenger: Sending reply to message:%j with: %j", id, replyData );
				try {
					event.sender.send( "message", { data: JSON.stringify(replyData), id, label: "response" } );
				} catch( err ) {
					if( err.message !== "Object has been destroyed" ) {
						self.debug && consoleLog.debug( "IPCMessenger: Target window has been closed." );
					} else {
						throw err;
					}
				}
			}
		} );
	}


	cleanUpAfterMessage( id: number ) {
		if( this.waiting.entries[ id ] ) {
			const entry = this.waiting.entries[ id ];
			if(entry.timer) {
				clearTimeout(entry.timer);
			}
			delete this.waiting.entries[ id ];
		}
	}

	onResponse( id: number, data: IPCMessengerResponseData ): void {
		this.debug && consoleLog.debug( `IPCMessenger.response(${id}, ${JSON.stringify(data)}})` );

		const entry = this.waiting.entries[ id ];

		if( ! entry ) {
			throw new Error( `Recieved unexpected response: ${ JSON.stringify( { id, data } ) }` );
		}

		const { reject, resolve, } = entry;
		if( data.success ) {
			resolve( data );
		} else {
			const err = (data.error)
				? ( (typeof data.error === "string" ) ? data.error : JSON.stringify( data.error ) )
				: "Unknown Error";
			reject( new Error( err ) );
		}
		this.cleanUpAfterMessage( id );
	}


	// protected async _send( label: string ): Promise<IPCMessengerResponseData>;
	// protected async _send( label: string, data: { [key:string]: any} ): Promise<IPCMessengerResponseData>;
	// protected async _send( label: string, timeout: number ): Promise<IPCMessengerResponseData>;
	// protected async _send( label: string, data: { [key:string]: any}, timeout?: number ): Promise<IPCMessengerResponseData>;
	// protected async _send( target: Electron.WebContents, label: string ): Promise<IPCMessengerResponseData>;
	// protected async _send( target: Electron.WebContents, label: string, data: { [key:string]: any } ): Promise<IPCMessengerResponseData>;
	// protected async _send( target: Electron.WebContents, label: string, timeout: number ): Promise<IPCMessengerResponseData>;
	// protected async _send( target: Electron.WebContents, label: string, data: { [key:string]: any }, timeout: number ): Promise<IPCMessengerResponseData>;
	protected async _send( ...args: any[] ): Promise<IPCMessengerResponseData> {
		const target: Electron.IpcRenderer|Electron.WebContents = ( typeof args[0] ==="string" ) ? this.electronIPC as Electron.IpcRenderer : args.shift() as Electron.WebContents ;
		const label: string = args.shift() as string;
		const data: {[key:string]:any} = ( typeof args[0] === "object" ) ? args.shift() : {};
		const timeout: number = ( typeof args[0] === "number" ) ? args.shift() : this.defaultTimeout;

		const id = ( this.waiting.count++ );
		const payload = { data: JSON.stringify( data ), id, label, };

		target.send( "message", payload );
		consoleLog.log( `IPCMessenger.send(${id}, "${label}", ${JSON.stringify(data)}})` );

		return new Promise( (resolve: ((value:any)=>void), reject: ((reason?:any)=>void) ) => {
			if( timeout == 0 ) {
				return resolve;
			}
			const timer = setTimeout( () => {
				this.cleanUpAfterMessage( id );
				consoleLog.log( `IPCMessenger.timeout(${id}, "${label}", ${JSON.stringify(data)}})` );
			}, timeout);
			this.waiting.entries[ id ] = { reject, resolve, timer, };
		} );
	}
	
}