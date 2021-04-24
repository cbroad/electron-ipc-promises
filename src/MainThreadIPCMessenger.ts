import { ipcMain } from "electron";

import { AbstractIPCMessenger } from "./AbstractIPCMessenger";
import { IPCMessengerResponseData } from "./IPCMessengerTypes";

export class MainThreadIPCMessenger extends AbstractIPCMessenger {

	constructor( ) {
		super( ipcMain );
	}

	async send( target: Electron.WebContents, label: string ): Promise<IPCMessengerResponseData>;
	async send( target: Electron.WebContents, label: string, data: { [key:string]: any } ): Promise<IPCMessengerResponseData>;
	async send( target: Electron.WebContents, label: string, timeout: number ): Promise<IPCMessengerResponseData>;
	async send( target: Electron.WebContents, label: string, data: { [key:string]: any }, timeout: number ): Promise<IPCMessengerResponseData>;
	async send( target: Electron.WebContents, label: string, dataOrTimeout?: number|{[key:string]:any}, timeout?: number ): Promise<IPCMessengerResponseData> {
		return super._send( target, label, dataOrTimeout, timeout );
	}


}