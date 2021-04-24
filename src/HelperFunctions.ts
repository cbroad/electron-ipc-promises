export function isBrowser() {
    return typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer';
}