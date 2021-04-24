import { ipcMain } from "electron";

import { AbstractIPCMessenger } from "./AbstractIPCMessenger";
import { IPCMessengerRequestData } from "./IPCMessengerTypes";

export class MainThreadIPCMessenger extends AbstractIPCMessenger {

	constructor( ) {
		super( ipcMain );
	}

	async send( target: Electron.WebContents, label: string ): Promise<any>;
	async send( target: Electron.WebContents, label: string, data: IPCMessengerRequestData ): Promise<any>;
	async send( target: Electron.WebContents, label: string, timeout: number ): Promise<any>;
	async send( target: Electron.WebContents, label: string, data: IPCMessengerRequestData, timeout: number ): Promise<any>;
	async send( target: Electron.WebContents, label: string, dataOrTimeout?: number|{[key:string]:any}, timeout?: number ): Promise<any> {
		return super._send( target, label, dataOrTimeout, timeout );
	}


}