import Electron, { IpcMain } from "electron";
import {EventEmitter} from "events";

import { IPCMessengerArg, IPCMessengerRequestData, IPCMessengerResponseData, IPCMessengerWaiting, IPCMessengerWaitingEntry } from "./IPCMessengerTypes";
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


		electronIPC.on("message", ( event: (Electron.IpcMainEvent | Electron.IpcRendererEvent), ...args: any[] ): void => {
			const { data, label, id } = args[0] as IPCMessengerArg;

			if( label === "response" ) {
				this.onResponse( id, data as IPCMessengerResponseData );
			} else {
				this.debug && consoleLog.debug( `IPCMessenger.on( "${label}", { id: ${id}, data: ${JSON.stringify(data)} } )` );
				
				this.emit( label, data, (  err: NodeJS.ErrnoException|String|null, res?: any ): void  => {
					this.debug && consoleLog.debug( `IPCMessenge.reply( ${id}, err=${err}, res=${JSON.stringify(res)} )` );

					err = (!err || (typeof err === "string") )? err : (err as NodeJS.ErrnoException).message;
					try {
						event.sender.send( "message", { data: { err, res }, id, label: "response" } );
					} catch( e ) {
						if( e.message !== "Object has been destroyed" ) {
							throw e;
						}
						this.debug && consoleLog.debug( "IPCMessenger: Target window has been closed." );
					}
				} );
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
		this.debug && consoleLog.debug( `IPCMessenger.onResponse( ${id}, ${JSON.stringify(data)} )` );

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


	// protected async _send( label: string ): Promise<any>;
	// protected async _send( label: string, data: IPCMessengerRequestData ): Promise<any>;
	// protected async _send( label: string, data: IPCMessengerRequestData, timeout: number ): Promise<any>;
	// protected async _send( target: Electron.WebContents, label: string ): Promise<any>;
	// protected async _send( target: Electron.WebContents, label: string, data: IPCMessengerRequestData ): Promise<any>;
	// protected async _send( target: Electron.WebContents, label: string, data: IPCMessengerRequestData, timeout: number ): Promise<any>;
	protected async _send( ...args: any[] ): Promise<any> {
		const target: Electron.IpcRenderer|Electron.WebContents = ( typeof args[0] ==="string" ) ? this.electronIPC as Electron.IpcRenderer : args.shift() as Electron.WebContents ;
		const label: string = args.shift() as string;
		const data: IPCMessengerRequestData = args.shift();
		const timeout: number = ( typeof args[0] === "number" ) ? args.shift() : this.defaultTimeout;

		const id = ( this.waiting.count++ );
		// const payload = { data: JSON.stringify( data ), id, label, };
		const payload = { data, id, label, };

		target.send( "message", payload );
		this.debug && consoleLog.debug( `IPCMessenger.send( ${id}, "${label}", ${JSON.stringify(data)} )` );

		return new Promise( (resolve: ((value:any)=>void), reject: ((reason?:any)=>void) ) => {
			if( timeout == 0 ) {
				return resolve;
			}
			const timer = setTimeout( () => {
				this.cleanUpAfterMessage( id );
				consoleLog.error( `IPCMessenger.timeout( ${id}, "${label}", ${JSON.stringify(data)} )` );
			}, timeout);
			this.waiting.entries[ id ] = { reject, resolve, timer, };
		} );
	}
	
}

