// @vitest-environment node
import {expect,it} from 'vitest';
import {deflateRawSync} from 'node:zlib';
import {drawingAssemblyZip} from './drawing-assembly-zip';
function archive(text:string,expanded?:number){const name=Buffer.from('assembly.json'),data=Buffer.from(text),body=deflateRawSync(data),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt16LE(name.length,26);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(8,10);central.writeUInt32LE(body.length,20);central.writeUInt32LE(expanded??data.length,24);central.writeUInt16LE(name.length,28);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+body.length,16);return Buffer.concat([local,name,body,central,name,end]);}
it('extracts the known JSON entry without touching filesystem',()=>{expect(drawingAssemblyZip(archive('{"members":[]}'))).toEqual({members:[]});});
it('rejects oversized outputs, truncation and invalid JSON',()=>{expect(()=>drawingAssemblyZip(archive('{}',9*1024*1024))).toThrow();expect(()=>drawingAssemblyZip(archive('{}').subarray(0,50))).toThrow();expect(()=>drawingAssemblyZip(archive('not json'))).toThrow();});
