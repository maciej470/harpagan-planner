import {describe,it,expect} from 'vitest'; import {mapyRouteUrl} from './mapy';
describe('Mapy.com',()=>it('tworzy link pętli pieszej z punktami',()=>{const u=mapyRouteUrl({lat:54,lon:18},[{id:'1',number:'7',geo:{lat:54.1,lon:18.1},kind:'checkpoint'}],true);expect(u).toContain('routeType=foot_hiking');expect(u).toContain('navigate=true');expect(u).toContain('waypoints=18.1%2C54.1');}));
