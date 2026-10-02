const accountPath = /^\/(?:parent|subscriptions|admin)$/;
const progressPath = /^\/parent\/progress\/[a-f0-9-]{36}(?:\?game=english)?$/;

export function safeReturnPath(path: string | null): string {
  if (!path) return '/parent';
  return accountPath.test(path) || progressPath.test(path) ? path : '/parent';
}
