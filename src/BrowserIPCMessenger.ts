import { ipcRenderer } from "electron";

import { AbstractIPCMessenger } from "./AbstractIPCMessenger";
import { IPCMessengerResponseData } from "./IPCMessengerTypes";

export class BrowserIPCMessenger extends AbstractIPCMessenger {

	constructor() {
		super( ipcRenderer );
	}

	async send( label: string ): Promise<IPCMessengerResponseData>;
	async send( label: string, data: { [key:string]: any} ): Promise<IPCMessengerResponseData>;
	async send( label: string, timeout: number ): Promise<IPCMessengerResponseData>;
	async send( label: string, data: { [key:string]: any}, timeout?: number ): Promise<IPCMessengerResponseData>;
	async send( label: string, dataOrTimeout?: number|{ [key:string]: any}, timeout?: number ): Promise<IPCMessengerResponseData> {
		return super._send( label, dataOrTimeout, timeout );
	}
}