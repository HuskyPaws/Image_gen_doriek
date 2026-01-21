#!/usr/bin/env python3
"""
Test DaVinci connection with environment variables set in code
"""

import sys
import os

print("=" * 60)
print("DaVinci Resolve Connection Test (Adding paths in code)")
print("=" * 60)
print()
print(f"Python: {sys.version}")
print()

# FIRST: Set environment variables and paths BEFORE any import attempt
print("Step 1: Setting up environment...")

RESOLVE_SCRIPT_API = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting"
RESOLVE_SCRIPT_LIB = r"C:\Program Files\Blackmagic Design\DaVinci Resolve\fusionscript.dll"

# Set environment variables
os.environ['RESOLVE_SCRIPT_API'] = RESOLVE_SCRIPT_API
os.environ['RESOLVE_SCRIPT_LIB'] = RESOLVE_SCRIPT_LIB

# Add to PATH
dll_dir = os.path.dirname(RESOLVE_SCRIPT_LIB)
os.environ['PATH'] = dll_dir + os.pathsep + os.environ.get('PATH', '')

# Add to Python path
modules_path = os.path.join(RESOLVE_SCRIPT_API, 'Modules')
if modules_path not in sys.path:
    sys.path.insert(0, modules_path)  # Insert at beginning

print(f"  RESOLVE_SCRIPT_API: {RESOLVE_SCRIPT_API}")
print(f"  RESOLVE_SCRIPT_LIB: {RESOLVE_SCRIPT_LIB}")
print(f"  Modules path: {modules_path}")
print()

# Check if paths exist
print("Step 2: Verifying paths exist...")
if os.path.exists(modules_path):
    print(f"  ✓ Modules path exists")
    # List what's in there
    try:
        files = os.listdir(modules_path)
        print(f"  Files found: {', '.join(files)}")
    except:
        pass
else:
    print(f"  ✗ Modules path NOT found!")

if os.path.exists(RESOLVE_SCRIPT_LIB):
    print(f"  ✓ DLL exists")
else:
    print(f"  ✗ DLL NOT found!")

print()

# Check environment
print("Step 3: Checking if environment variables are accessible...")
print(f"  RESOLVE_SCRIPT_API from env: {os.environ.get('RESOLVE_SCRIPT_API', 'NOT SET')}")
print(f"  RESOLVE_SCRIPT_LIB from env: {os.environ.get('RESOLVE_SCRIPT_LIB', 'NOT SET')}")
print()

# Check if DaVinci is running
print("Step 4: Checking if DaVinci Resolve is running...")
import subprocess
result = subprocess.run(['tasklist'], capture_output=True, text=True)
if 'Resolve.exe' in result.stdout:
    print("  ✓ DaVinci Resolve is running")
else:
    print("  ✗ DaVinci Resolve is NOT running")
    print("  Please start DaVinci Resolve Studio first!")
    input("\nPress Enter to exit...")
    sys.exit(1)

print()

# NOW try to import
print("Step 5: Attempting import...")
print("  (This is the critical step)")
print()
sys.stdout.flush()

try:
    print("  Importing DaVinciResolveScript...")
    sys.stdout.flush()
    
    import DaVinciResolveScript as dvr_script
    
    print("  ✓✓✓ IMPORT SUCCESSFUL! ✓✓✓")
    print()
    
    # Try to connect
    print("Step 6: Connecting to DaVinci Resolve...")
    resolve = dvr_script.scriptapp("Resolve")
    
    if resolve:
        print("  ✓✓✓ CONNECTION SUCCESSFUL! ✓✓✓")
        print()
        
        pm = resolve.GetProjectManager()
        project = pm.GetCurrentProject()
        
        if project:
            print(f"  Project: {project.GetName()}")
            timeline = project.GetCurrentTimeline()
            if timeline:
                print(f"  Timeline: {timeline.GetName()}")
        else:
            print("  (No project open)")
        
        print()
        print("=" * 60)
        print("COMPLETE SUCCESS!")
        print("Python 3.11 + DaVinci Resolve API is working!")
        print("=" * 60)
    else:
        print("  ✗ Connection returned None")
        print()
        print("Check: Settings → System → General → External scripting → Local")

except ImportError as e:
    print(f"  ✗ ImportError: {e}")
    print()
    print("The module could not be found or imported.")
    print()
    print("Possible causes:")
    print("  1. DaVinciResolveScript.py is not in the Modules folder")
    print("  2. The module has dependencies that aren't met")
    
except Exception as e:
    print(f"  ✗ Error: {e}")
    print()
    import traceback
    traceback.print_exc()
    print()
    print("If this is a DLL crash, it might be:")
    print("  1. Python version incompatibility (though 3.11 should work)")
    print("  2. Missing Visual C++ Redistributables")
    print("  3. Corrupted DaVinci installation")

print()
input("\nPress Enter to exit...")
































