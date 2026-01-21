#!/usr/bin/env python3
"""
MINIMAL TEST - Just try to connect to DaVinci Resolve
"""

print("=" * 60)
print("DaVinci Resolve Connection Test")
print("=" * 60)
print()

import sys
import os

print(f"Python version: {sys.version}")
print()

# Step 1: Setup paths
print("Step 1: Setting up DaVinci paths...")

RESOLVE_SCRIPT_API = os.path.join(
    os.getenv('PROGRAMDATA', 'C:\\ProgramData'),
    'Blackmagic Design',
    'DaVinci Resolve',
    'Support',
    'Developer',
    'Scripting'
)

RESOLVE_SCRIPT_LIB = r"C:\Program Files\Blackmagic Design\DaVinci Resolve\fusionscript.dll"

print(f"  API Path: {RESOLVE_SCRIPT_API}")
print(f"  DLL Path: {RESOLVE_SCRIPT_LIB}")
print()

# Check if paths exist
modules_path = os.path.join(RESOLVE_SCRIPT_API, 'Modules')
print(f"Checking if API exists: {modules_path}")
if os.path.exists(modules_path):
    print("  ✓ API path exists")
else:
    print("  ✗ API path NOT FOUND")
    print()
    print("DaVinci Resolve Studio is not installed or in wrong location")
    input("\nPress Enter to exit...")
    sys.exit(1)

print()
print(f"Checking if DLL exists: {RESOLVE_SCRIPT_LIB}")
if os.path.exists(RESOLVE_SCRIPT_LIB):
    print("  ✓ DLL exists")
else:
    print("  ✗ DLL NOT FOUND")
    # Try alternate path
    alt_dll = r"C:\Program Files\Blackmagic Design\DaVinci Resolve Studio\fusionscript.dll"
    print(f"  Trying alternate: {alt_dll}")
    if os.path.exists(alt_dll):
        print("  ✓ Found at alternate location")
        RESOLVE_SCRIPT_LIB = alt_dll
    else:
        print("  ✗ DLL not found anywhere")
        input("\nPress Enter to exit...")
        sys.exit(1)

print()

# Step 2: Add to PATH
print("Step 2: Adding DLL directory to PATH...")
dll_dir = os.path.dirname(RESOLVE_SCRIPT_LIB)
os.environ['PATH'] = dll_dir + os.pathsep + os.environ.get('PATH', '')
os.environ['RESOLVE_SCRIPT_LIB'] = RESOLVE_SCRIPT_LIB
print(f"  Added: {dll_dir}")
print()

# Step 3: Add Python modules
print("Step 3: Adding Python modules to sys.path...")
sys.path.append(modules_path)
print(f"  Added: {modules_path}")
print()

# Step 4: Check Python version
print("Step 4: Checking Python version compatibility...")
py_version = sys.version_info
print(f"  Python {py_version.major}.{py_version.minor}.{py_version.micro}")

if py_version.major == 3 and py_version.minor >= 12:
    print()
    print("  ✗✗✗ INCOMPATIBLE PYTHON VERSION ✗✗✗")
    print()
    print(f"  You are using Python {py_version.major}.{py_version.minor}")
    print("  DaVinci Resolve requires Python 3.6 - 3.11")
    print()
    print("  Python 3.12+ changed internal APIs that break DaVinci's fusionscript.dll")
    print()
    print("  SOLUTION: Use Python 3.11 instead:")
    print("    C:\\Python311\\python.exe test_davinci_connection.py")
    print()
    print("  Or double-click: run_test.bat")
    print()
    input("Press Enter to exit...")
    sys.exit(1)
else:
    print(f"  ✓ Python {py_version.major}.{py_version.minor} is compatible")

print()

# Step 5: Check if DaVinci is running
print("Step 5: Checking if DaVinci Resolve is running...")
import subprocess
try:
    result = subprocess.run(
        ['tasklist', '/FI', 'IMAGENAME eq Resolve.exe'],
        capture_output=True,
        text=True
    )
    if 'Resolve.exe' in result.stdout:
        print("  ✓ DaVinci Resolve is running")
    else:
        print("  ✗ DaVinci Resolve is NOT running")
        print()
        print("  IMPORTANT: DaVinci Resolve must be running BEFORE you run this script!")
        print("  Please start DaVinci Resolve first, then run this test again.")
        print()
        input("Press Enter to exit...")
        sys.exit(1)
except Exception as e:
    print(f"  ? Could not check if running: {e}")

print()

# Step 6: Try to load DLL with ctypes first (diagnostic)
print("Step 6: Testing DLL load with ctypes...")
import ctypes
try:
    dll = ctypes.CDLL(RESOLVE_SCRIPT_LIB)
    print("  ✓ DLL loaded successfully with ctypes")
except Exception as e:
    print(f"  ✗ Failed to load DLL: {e}")
    print()
    print("The DLL exists but can't be loaded. Possible reasons:")
    print("  1. Missing Visual C++ Redistributables")
    print("  2. DLL is corrupted")
    print("  3. DLL is incompatible with this Python version")
    print()
    input("Press Enter to exit...")
    sys.exit(1)

print()

# Step 7: Try to import
print("Step 7: Importing DaVinciResolveScript module...")
print("  (This might take a few seconds...)")
print("  (If it crashes here, it's a Python/DLL compatibility issue)")
print()
sys.stdout.flush()

try:
    print("  Starting import...")
    sys.stdout.flush()
    
    import DaVinciResolveScript as dvr
    
    print("  ✓✓✓ Import successful!")
    sys.stdout.flush()
    
except ImportError as e:
    print(f"  ✗ Import failed: {e}")
    print()
    print("Make sure DaVinci Resolve Studio is installed")
    input("\nPress Enter to exit...")
    sys.exit(1)
except Exception as e:
    print(f"  ✗ Unexpected error during import: {e}")
    print()
    import traceback
    traceback.print_exc()
    print()
    print("This usually means fusionscript.dll crashed")
    input("\nPress Enter to exit...")
    sys.exit(1)

print()

# Step 8: Try to connect
print("Step 8: Connecting to DaVinci Resolve...")
print("  (Make sure DaVinci Resolve is RUNNING)")
print()

try:
    resolve = dvr.scriptapp("Resolve")
    
    if resolve:
        print("  ✓✓✓ CONNECTION SUCCESSFUL! ✓✓✓")
        print()
        
        # Get more info
        pm = resolve.GetProjectManager()
        project = pm.GetCurrentProject()
        
        if project:
            print(f"  Current Project: {project.GetName()}")
            
            timeline = project.GetCurrentTimeline()
            if timeline:
                print(f"  Current Timeline: {timeline.GetName()}")
            else:
                print("  (No timeline selected)")
        else:
            print("  (No project open)")
        
        print()
        print("=" * 60)
        print("SUCCESS! DaVinci Resolve API is working!")
        print("=" * 60)
        
    else:
        print("  ✗ Connection failed - resolve is None")
        print()
        print("Possible reasons:")
        print("  1. DaVinci Resolve is not running")
        print("  2. External scripting not enabled:")
        print("     Preferences → General → External scripting using → Local")
        print("  3. DaVinci Resolve is busy/frozen")

except Exception as e:
    print(f"  ✗ Error during connection: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
input("\nPress Enter to exit...")

