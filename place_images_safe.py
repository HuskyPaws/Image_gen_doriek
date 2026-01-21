#!/usr/bin/env python3
"""
Safe version with better error handling
This version won't crash silently - it will show you what's wrong
"""

import sys
import os

print("=" * 60)
print("DaVinci Resolve Image Placement (Safe Mode)")
print("=" * 60)
print()
print(f"Python version: {sys.version}")
print()

# Test imports one by one
print("Testing imports...")
try:
    print("  Testing sys, os... ", end="")
    import sys, os
    print("✓")
except Exception as e:
    print(f"✗ Failed: {e}")
    input("\nPress Enter to exit...")
    sys.exit(1)

# Try to import DaVinci Resolve API
print("  Testing DaVinci Resolve API... ", end="")

RESOLVE_SCRIPT_API = os.path.join(
    os.getenv('PROGRAMDATA', 'C:\\ProgramData'),
    'Blackmagic Design',
    'DaVinci Resolve',
    'Support',
    'Developer',
    'Scripting'
)

api_path = os.path.join(RESOLVE_SCRIPT_API, 'Modules')
print(f"\n    Path: {api_path}")
print(f"    Exists: {os.path.exists(api_path)}")

if not os.path.exists(api_path):
    print("\n  ✗ DaVinci Resolve API path not found!")
    print("\n  This means:")
    print("  - DaVinci Resolve Studio is not installed")
    print("  - Or it's installed in a different location")
    input("\nPress Enter to exit...")
    sys.exit(1)

sys.path.append(api_path)

try:
    import DaVinciResolveScript as dvr
    print("  ✓ DaVinci API imported successfully!")
except ImportError as e:
    print(f"  ✗ Cannot import DaVinci API: {e}")
    input("\nPress Enter to exit...")
    sys.exit(1)
except Exception as e:
    print(f"  ✗ Unexpected error importing API: {e}")
    import traceback
    traceback.print_exc()
    input("\nPress Enter to exit...")
    sys.exit(1)

# Try to connect
print("\nConnecting to DaVinci Resolve...")
try:
    resolve = dvr.scriptapp("Resolve")
    if resolve:
        print("  ✓ Connected!")
        
        pm = resolve.GetProjectManager()
        project = pm.GetCurrentProject()
        
        if project:
            print(f"  ✓ Project: {project.GetName()}")
            
            timeline = project.GetCurrentTimeline()
            if timeline:
                print(f"  ✓ Timeline: {timeline.GetName()}")
                print("\n✅ Everything is working!")
                print("\nYou can now use the real script.")
            else:
                print("  ⚠️  No timeline selected")
                print("  Please open/select a timeline in DaVinci Resolve")
        else:
            print("  ⚠️  No project open")
            print("  Please open a project in DaVinci Resolve")
    else:
        print("  ✗ Could not connect to DaVinci Resolve")
        print("\n  Make sure:")
        print("  1. DaVinci Resolve is running")
        print("  2. A project is open")
        print("  3. External scripting is enabled:")
        print("     Preferences → General → External scripting using → Local")

except Exception as e:
    print(f"  ✗ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
input("\nPress Enter to exit...")
































