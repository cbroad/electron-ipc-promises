export type IPCEventCallback = ( err: NodeJS.ErrnoException|String|null, result?: any )=>void;

export type IPCMessengerArg = { data: {[key:string]:any}, id: number, label: string };

export type IPCMessengerResponseData = { err: NodeJS.ErrnoException|string|null, res?: any };

export type IPCMessengerWaiting = { count:number, entries: { [key: number]: IPCMessengerWaitingEntry } };

export type IPCMessengerWaitingEntry = { reject: (reason?:unknown)=>void, resolve: (value:unknown)=>void, timer: NodeJS.Timeout };