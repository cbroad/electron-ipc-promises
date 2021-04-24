import { BrowserIPCMessenger } from "./BrowserIPCMessenger";
import { MainThreadIPCMessenger } from "./MainThreadIPCMessenger";
import { isBrowser } from "./HelperFunctions";

export * from "./IPCMessengerTypes";
export const IPCMessenger = isBrowser() ? new BrowserIPCMessenger() : new MainThreadIPCMessenger();