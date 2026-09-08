"""Install the worker as a per-user LaunchAgent on the Mac mini. Run after heartbeat test."""
import os
from pathlib import Path
import plistlib
import subprocess
import sys
root=Path(__file__).resolve().parent
config=root/'config.json'
if not config.is_file():raise SystemExit('Install a private worker config first')
config.chmod(0o600)
label='com.kiw.blender-drawings'
path=Path.home()/'Library/LaunchAgents'/f'{label}.plist';path.parent.mkdir(parents=True,exist_ok=True)
content={'Label':label,'ProgramArguments':['/usr/bin/python3',str(root/'worker.py'),'--config',str(config)],'WorkingDirectory':str(root),'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':20,'StandardOutPath':str(root/'service.log'),'StandardErrorPath':str(root/'service-error.log')}
path.write_bytes(plistlib.dumps(content));path.chmod(0o600)
domain=f'gui/{os.getuid()}'
# Restart only this task's service when upgrading an existing installation.
subprocess.run(['launchctl','bootout',f'{domain}/{label}'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
subprocess.run(['launchctl','bootstrap',domain,str(path)],check=True)
print('Blender worker LaunchAgent installed and started')
