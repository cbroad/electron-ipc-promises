export type IPCMessengerArg = { data: string, id: number, label: string };

export type IPCMessengerResponseData = ( { success: true } | { success: false, error: any } ) & { [key:string]: any };

export type IPCMessengerWaitingEntry = { reject: (reason?:unknown)=>void, resolve: (value:unknown)=>void, timer: NodeJS.Timeout };

export type IPCMessengerWaiting = { count:number, entries: { [key: number]: IPCMessengerWaitingEntry } };