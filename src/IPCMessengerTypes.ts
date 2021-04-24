export type IPCEventCallback = ( err: NodeJS.ErrnoException|String|null, result?: any )=>void;

export type IPCMessengerRequestArg = { data: IPCMessengerRequestData, id: number, label: string };
export type IPCMessengerResponseArg = { data: IPCMessengerResponseData, id: number, label: "response" };
export type IPCMessengerArg = IPCMessengerRequestArg|IPCMessengerResponseArg;

export type IPCMessengerRequestData = {[key:string]:any};
export type IPCMessengerResponseData = { err: NodeJS.ErrnoException|string|null, res?: any };

export type IPCMessengerWaiting = { count:number, entries: { [key: number]: IPCMessengerWaitingEntry } };

export type IPCMessengerWaitingEntry = { reject: (reason?:unknown)=>void, resolve: (value:unknown)=>void, timer: NodeJS.Timeout };