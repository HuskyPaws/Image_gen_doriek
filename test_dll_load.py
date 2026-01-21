#!/usr/bin/env python3
"""
Test if fusionscript.dll can be loaded at all
"""

import sys
import os
import ctypes

print("=" * 60)
print("DLL Load Test")
print("=" * 60)
print()
print(f"Python: {sys.version}")
print()

RESOLVE_SCRIPT_LIB = r"C:\Program Files\Blackmagic Design\DaVinci Resolve\fusionscript.dll"

# Check alternate path
if not os.path.exists(RESOLVE_SCRIPT_LIB):
    RESOLVE_SCRIPT_LIB = r"C:\Program Files\Blackmagic Design\DaVinci Resolve Studio\fusionscript.dll"

print(f"DLL Path: {RESOLVE_SCRIPT_LIB}")
print()

if not os.path.exists(RESOLVE_SCRIPT_LIB):
    print("ERROR: DLL not found!")
    input("\nPress Enter to exit...")
    sys.exit(1)

print("Attempting to load DLL with ctypes...")
print()

try:
    # Add DLL directory to PATH
    dll_dir = os.path.dirname(RESOLVE_SCRIPT_LIB)
    os.environ['PATH'] = dll_dir + os.pathsep + os.environ.get('PATH', '')
    
    print("Loading DLL...")
    sys.stdout.flush()
    
    dll = ctypes.CDLL(RESOLVE_SCRIPT_LIB)
    
    print("✓ DLL loaded successfully!")
    print()
    print("DLL object:", dll)
    print()
    print("This means the DLL itself is OK.")
    print("The issue is with how the DaVinci Python module uses it.")
    
except FileNotFoundError as e:
    print(f"✗ DLL file not found: {e}")
    print()
    print("Make sure DaVinci Resolve is installed.")
    
except OSError as e:
    print(f"✗ OS Error loading DLL: {e}")
    print()
    print("Common causes:")
    print("  1. Missing Visual C++ Redistributables")
    print("  2. DLL is 32-bit but Python is 64-bit (or vice versa)")
    print("  3. DLL has dependencies that can't be found")
    print()
    print("Download VC++ Redistributables:")
    print("  https://aka.ms/vs/17/release/vc_redist.x64.exe")
    
except Exception as e:
    print(f"✗ Unexpected error: {e}")
    print()
    import traceback
    traceback.print_exc()

print()
input("\nPress Enter to exit...")
































