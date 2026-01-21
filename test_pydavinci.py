#!/usr/bin/env python3
"""
Test DaVinci Resolve Connection using PyDavinci
"""

print("=" * 60)
print("DaVinci Resolve Connection Test (PyDavinci)")
print("=" * 60)
print()

import sys

print(f"Python version: {sys.version}")
print()

# Step 1: Check Python version
print("Step 1: Checking Python version...")
py_version = sys.version_info
print(f"  Python {py_version.major}.{py_version.minor}.{py_version.micro}")

if py_version.major == 3 and py_version.minor < 10:
    print()
    print("  ✗ PyDavinci requires Python 3.10+")
    print(f"  You have Python {py_version.major}.{py_version.minor}")
    input("\nPress Enter to exit...")
    sys.exit(1)
elif py_version.major == 3 and py_version.minor >= 13:
    print(f"  ⚠ Python {py_version.major}.{py_version.minor} - PyDavinci might work (experimental)")
else:
    print(f"  ✓ Python {py_version.major}.{py_version.minor} is compatible")

print()

# Step 2: Check if DaVinci is running
print("Step 2: Checking if DaVinci Resolve is running...")
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
        print("  IMPORTANT: Start DaVinci Resolve FIRST, then run this test!")
        print()
        input("Press Enter to exit...")
        sys.exit(1)
except Exception as e:
    print(f"  ? Could not check: {e}")

print()

# Step 3: Try to import pydavinci
print("Step 3: Importing pydavinci...")
try:
    from pydavinci import davinci
    print("  ✓ pydavinci imported successfully!")
except ImportError:
    print("  ✗ pydavinci not installed")
    print()
    print("  Install it by running:")
    print("    install_pydavinci.bat")
    print()
    print("  Or manually:")
    print("    C:\\Python311\\python.exe -m pip install git+https://github.com/pedrolabonia/pydavinci")
    print()
    input("Press Enter to exit...")
    sys.exit(1)

print()

# Step 4: Try to connect
print("Step 4: Connecting to DaVinci Resolve...")
print("  (Make sure external scripting is enabled)")
print("  Settings → System → General → External scripting using → Local")
print()

try:
    resolve = davinci.Resolve()
    
    if resolve:
        print("  ✓✓✓ CONNECTION SUCCESSFUL! ✓✓✓")
        print()
        
        # Get project info
        project_manager = resolve.project_manager
        project = project_manager.get_current_project()
        
        if project:
            print(f"  Current Project: {project.name}")
            
            timeline = project.get_current_timeline()
            if timeline:
                print(f"  Current Timeline: {timeline.name}")
                print(f"  Timeline FPS: {timeline.framerate}")
                print(f"  Timeline Start Frame: {timeline.start_frame}")
            else:
                print("  (No timeline selected)")
        else:
            print("  (No project open)")
        
        print()
        print("=" * 60)
        print("SUCCESS! PyDavinci is working perfectly!")
        print("=" * 60)
        
    else:
        print("  ✗ Connection failed")
        print()
        print("Possible reasons:")
        print("  1. DaVinci Resolve is not running")
        print("  2. External scripting not enabled:")
        print("     Settings → System → General → External scripting using → Local")
        print("  3. You need DaVinci Resolve Studio (free version doesn't support API)")

except Exception as e:
    print(f"  ✗ Error: {e}")
    import traceback
    traceback.print_exc()
    print()
    print("Check that:")
    print("  1. DaVinci Resolve Studio is running")
    print("  2. External scripting is set to 'Local'")

print()
print("=" * 60)
input("\nPress Enter to exit...")

