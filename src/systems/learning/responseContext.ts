/** One submitted response, carried through existing synchronous/animated game callbacks. */
let pending: Record<string, unknown> | undefined;
export function prepareIndependentResponse(metadata: Record<string, unknown>) { pending=metadata; }
export function clearIndependentResponse(questionId?:string) { if (!questionId || pending?.questionId===questionId) pending=undefined; }
export function takeIndependentResponse(): Record<string,unknown>|undefined { const response=pending;pending=undefined;return response; }
