import { ipcRenderer } from "electron";

import { AbstractIPCMessenger } from "./AbstractIPCMessenger";
import { IPCMessengerRequestData } from "./IPCMessengerTypes";

export class BrowserIPCMessenger extends AbstractIPCMessenger {

	constructor() {
		super( ipcRenderer );
	}

	async send( label: string ): Promise<any>;
	async send( label: string, data: IPCMessengerRequestData ): Promise<any>;
	async send( label: string, timeout: number ): Promise<any>;
	async send( label: string, data: IPCMessengerRequestData, timeout?: number ): Promise<any>;
	async send( label: string, dataOrTimeout?: number|IPCMessengerRequestData, timeout?: number ): Promise<any> {
		return super._send( label, dataOrTimeout, timeout );
	}
}