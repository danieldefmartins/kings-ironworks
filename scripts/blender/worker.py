"""Outbound HTTPS Blender queue worker. No database credentials or inbound ports."""
import argparse
import json
import logging
import os
from pathlib import Path
import subprocess
import time
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import uuid
import zipfile

ROOT=Path(__file__).resolve().parent
LOG=logging.getLogger('kiw-blender')


def api(config, body):
    data=json.dumps(dict(body,engine='blender')).encode()
    request=Request(config['url']+'/shop/api/shop-drawings/worker',data=data,headers={'Authorization':'Bearer '+config['token'],'Content-Type':'application/json'})
    with urlopen(request,timeout=30) as response:return json.load(response)


def package(output):
    required=['railing.blend','shop-drawings.pdf','measurements.json','manifest.json']
    for name in required:
        if not (output/name).is_file() or (output/name).stat().st_size==0:raise ValueError('Missing drawing output')
    if (output/'railing.blend').read_bytes()[:7]!=b'BLENDER':raise ValueError('Invalid Blender model')
    if not (output/'shop-drawings.pdf').read_bytes().startswith(b'%PDF-'):raise ValueError('Invalid drawing sheets')
    archive=output/'shop-drawings.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for name in required:z.write(output/name,name)
        for path in sorted(output.glob('sheet-*.svg')):z.write(path,path.name)
    if archive.stat().st_size>100*1024*1024:raise ValueError('Drawing package exceeds storage limit')
    return archive


def generate(config,job,blender,root):
    identifier=str(uuid.UUID(job['id']));lease=str(uuid.UUID(job['lease']))
    output=root/'jobs'/f'{identifier}-{lease}';output.mkdir(parents=True,exist_ok=False)
    source=output/'input.json';source.write_text(json.dumps(job['payload']))
    command=[blender,'--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',str(ROOT/'build_drawings.py'),'--',str(source),str(output)]
    with (output/'blender.log').open('w') as log:
        process=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT)
        started=time.monotonic();renew=started
        try:
            while process.poll() is None:
                time.sleep(1)
                if time.monotonic()-started>180:raise TimeoutError('Blender generation time limit')
                if time.monotonic()-renew>45:
                    api(config,{'action':'renew','id':identifier,'lease':lease});renew=time.monotonic()
            if process.returncode:raise RuntimeError('Blender generation failed')
        finally:
            if process.poll() is None:process.kill();process.wait()
    archive=package(output)
    upload=urlparse(job['uploadUrl'])
    if upload.scheme!='https' or not (upload.hostname or '').endswith('.supabase.co') or upload.username:raise ValueError('Invalid storage URL')
    request=Request(job['uploadUrl'],method='PUT',data=archive.read_bytes(),headers={'Content-Type':'application/zip'})
    with urlopen(request,timeout=60) as response:
        if response.status not in (200,201):raise RuntimeError('Upload failed')
    api(config,{'action':'complete','id':identifier,'lease':lease})
    LOG.info('Draft completed: %s',identifier)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--config',required=True);parser.add_argument('--blender',default='/Applications/Blender.app/Contents/MacOS/Blender');parser.add_argument('--once',action='store_true');parser.add_argument('--heartbeat-only',action='store_true');args=parser.parse_args()
    os.umask(0o077)
    path=Path(args.config).resolve();config=json.loads(path.read_text());url=urlparse(config['url'])
    if url.scheme!='https' or not url.hostname or url.username or url.query or url.path not in ('','/'):raise ValueError('Invalid shop URL')
    config['url']=config['url'].rstrip('/')
    if len(config['token'])!=64 or any(c not in '0123456789abcdef' for c in config['token']):raise ValueError('Invalid worker token')
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(message)s')
    if args.heartbeat_only:api(config,{'action':'heartbeat'});LOG.info('Worker heartbeat verified');return
    while True:
        job=None
        try:
            job=api(config,{'action':'claim'}).get('request')
            if job:generate(config,job,args.blender,path.parent)
        except Exception as error:
            # HTTP exceptions may contain signed URLs; never log their contents.
            LOG.error('Worker request failed: %s',type(error).__name__)
            if job:
                try:api(config,{'action':'fail','id':job['id'],'lease':job['lease'],'error':'Blender could not generate or upload the draft. Check the Mac mini worker.'})
                except Exception:LOG.error('Could not report failed lease')
            if args.once:raise SystemExit(1)
        if args.once:return
        time.sleep(15)


if __name__=='__main__':main()
