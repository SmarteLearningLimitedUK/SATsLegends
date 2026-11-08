const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
export function britishNumberWords(n:number):string {
 if(!Number.isInteger(n)||n<0||n>10000000)throw Error('Number outside KS2 whole-number range');
 if(n<20)return small[n];
 if(n<100)return tens[Math.floor(n/10)]+(n%10?'-'+small[n%10]:'');
 for(const [value,label]of [[1000000,'million'],[1000,'thousand'],[100,'hundred']] as const){if(n>=value){const remainder=n%value;return britishNumberWords(Math.floor(n/value))+' '+label+(remainder?(remainder<100?' and ':' ')+britishNumberWords(remainder):'');}}
 return '';
}
