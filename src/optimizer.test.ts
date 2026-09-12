import {describe,it,expect} from 'vitest'; import {optimizeOpen} from './optimizer';
const p=(id:string,n:string)=>({id,number:n,geo:{lat:0,lon:Number(n)},kind:'checkpoint' as const});
describe('optymalizacja',()=>it('zachowuje start i koniec',()=>{const a=p('a','0'),b=p('b','1'),c=p('c','2');const out=optimizeOpen([a,b,c],a,c);expect(out[0].id).toBe('a');expect(out.at(-1)?.id).toBe('c');}));
