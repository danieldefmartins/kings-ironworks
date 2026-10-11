import {inflateRawSync} from 'node:zlib';
/** Extract one known JSON entry in memory. No filesystem paths or executable content. */
export function drawingAssemblyZip(zip:Buffer):unknown{
 const invalid=()=>{throw new Error('Invalid drawing archive. Generate a new drawing.');};
 if(zip.length>100*1024*1024||zip.length<22)return invalid();
 let end=-1;
 for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--)if(zip.readUInt32LE(i)===0x06054b50&&i+22+zip.readUInt16LE(i+20)===zip.length){end=i;break;}
 if(end<0||zip.readUInt16LE(end+4)||zip.readUInt16LE(end+6))return invalid();
 const count=zip.readUInt16LE(end+10),size=zip.readUInt32LE(end+12),start=zip.readUInt32LE(end+16);
 if(count>2000||count!==zip.readUInt16LE(end+8)||start+size>end)return invalid();
 let at=start,found:unknown;
 for(let i=0;i<count;i++){
  if(at+46>start+size||zip.readUInt32LE(at)!==0x02014b50)return invalid();
  const flags=zip.readUInt16LE(at+8),method=zip.readUInt16LE(at+10),compressed=zip.readUInt32LE(at+20),expanded=zip.readUInt32LE(at+24),nameLen=zip.readUInt16LE(at+28),extra=zip.readUInt16LE(at+30),comment=zip.readUInt16LE(at+32),offset=zip.readUInt32LE(at+42);
  const next=at+46+nameLen+extra+comment;if(next>start+size)return invalid();
  const name=zip.toString('utf8',at+46,at+46+nameLen);at=next;if(name!=='assembly.json')continue;
  if(found!==undefined||flags&1||![0,8].includes(method)||expanded>8*1024*1024||offset+30>start||zip.readUInt32LE(offset)!==0x04034b50)return invalid();
  const localName=zip.readUInt16LE(offset+26),localExtra=zip.readUInt16LE(offset+28),body=offset+30+localName+localExtra;
  if(zip.readUInt16LE(offset+8)!==method||zip.toString('utf8',offset+30,offset+30+localName)!==name||body+compressed>start)return invalid();
  const bytes=method===0?zip.subarray(body,body+compressed):inflateRawSync(zip.subarray(body,body+compressed),{maxOutputLength:8*1024*1024});
  if(bytes.length!==expanded)return invalid();found=JSON.parse(bytes.toString('utf8'));
 }
 if(at!==start+size||found===undefined)return invalid();return found;
}
