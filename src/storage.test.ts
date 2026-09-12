// @vitest-environment jsdom
import {describe,it,expect,beforeEach} from 'vitest'; import {saveProject,listProjects} from './storage';
describe('lokalny zapis',()=>{beforeEach(()=>localStorage.clear());it('zapisuje i odczytuje projekt bez serwera',async()=>{const p:any={id:'p1',name:'Test',createdAt:1,updatedAt:1,controlPoints:[],checkpoints:[],opacity:.5,imageTransform:{x:0,y:0,scale:1,rotation:0}};await saveProject(p);const result=await listProjects();expect(result[0].name).toBe('Test');});});
