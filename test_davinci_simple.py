#!/usr/bin/env python3
"""
SIMPLE DaVinci Resolve Connection Test
Using raw DaVinci API (no PyDavinci)
"""

import sys
import os

def main():
    try:
        print("=" * 60)
        print("DaVinci Resolve Simple Connection Test")
        print("=" * 60)
        print()
        print(f"Python: {sys.version}")
        print()
        sys.stdout.flush()
        
        # Check Python version
        if sys.version_info >= (3, 12):
            print("ERROR: Python 3.12+ is not compatible with DaVinci Resolve API")
            print("Please use Python 3.11 or lower")
            print()
            input("Press Enter to exit...")
            sys.exit(1)
        
        # Check if DaVinci is running
        print("Checking if DaVinci Resolve is running...")
        sys.stdout.flush()
        
        import subprocess
        result = subprocess.run(['tasklist'], capture_output=True, text=True)
        if 'Resolve.exe' not in result.stdout:
            print("  ✗ DaVinci Resolve is NOT running!")
            print()
            print("Please start DaVinci Resolve Studio first.")
            print()
            input("Press Enter to exit...")
            sys.exit(1)
        
        print("  ✓ DaVinci Resolve is running")
        print()
        sys.stdout.flush()
        
        # Setup DaVinci API paths
        print("Setting up DaVinci API paths...")
        sys.stdout.flush()
        
        RESOLVE_SCRIPT_API = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting"
        RESOLVE_SCRIPT_LIB = r"C:\Program Files\Blackmagic Design\DaVinci Resolve\fusionscript.dll"
        
        # Check alternate path for Studio
        if not os.path.exists(RESOLVE_SCRIPT_LIB):
            RESOLVE_SCRIPT_LIB = r"C:\Program Files\Blackmagic Design\DaVinci Resolve Studio\fusionscript.dll"
        
        if not os.path.exists(RESOLVE_SCRIPT_LIB):
            print("  ✗ fusionscript.dll not found!")
            print()
            print("Make sure DaVinci Resolve Studio is installed.")
            input("Press Enter to exit...")
            sys.exit(1)
        
        # Add to Python path
        modules_path = os.path.join(RESOLVE_SCRIPT_API, 'Modules')
        sys.path.append(modules_path)
        
        # Set environment
        dll_dir = os.path.dirname(RESOLVE_SCRIPT_LIB)
        os.environ['PATH'] = dll_dir + os.pathsep + os.environ.get('PATH', '')
        os.environ['RESOLVE_SCRIPT_LIB'] = RESOLVE_SCRIPT_LIB
        
        print(f"  API: {RESOLVE_SCRIPT_API}")
        print(f"  DLL: {RESOLVE_SCRIPT_LIB}")
        print()
        sys.stdout.flush()
        
        # Import DaVinci module
        print("Importing DaVinci Resolve API...")
        print("  (This is where it crashes if Python version is incompatible)")
        print("  (If it crashes here, make sure you're using Python 3.11, NOT 3.13)")
        print()
        sys.stdout.flush()
        
        # Force immediate output before the crash
        import time
        time.sleep(0.1)
        
        print("  Starting import now...")
        sys.stdout.flush()
        
        import DaVinciResolveScript as dvr_script
        
        print("  ✓✓✓ Import successful!")
        print()
        sys.stdout.flush()
        
        # Try to connect
        print("Connecting to DaVinci Resolve...")
        print("(External scripting must be enabled: Settings → System → General → External scripting → Local)")
        print()
        sys.stdout.flush()
        
        resolve = dvr_script.scriptapp("Resolve")
        
        if not resolve:
            print("  ✗ Connection returned None")
            print()
            print("Troubleshooting:")
            print("  1. Check Settings → System → General → External scripting using → Local")
            print("  2. Try restarting DaVinci Resolve")
            print("  3. Make sure you have DaVinci Resolve Studio (not free version)")
            input("\nPress Enter to exit...")
            sys.exit(1)
        
        print("  ✓✓✓ CONNECTED SUCCESSFULLY! ✓✓✓")
        print()
        sys.stdout.flush()
        
        # Get info
        pm = resolve.GetProjectManager()
        project = pm.GetCurrentProject()
        
        if project:
            print(f"  Project: {project.GetName()}")
            
            timeline = project.GetCurrentTimeline()
            if timeline:
                print(f"  Timeline: {timeline.GetName()}")
                fps = timeline.GetSetting("timelineFrameRate")
                print(f"  FPS: {fps}")
            else:
                print("  (No timeline open)")
        else:
            print("  (No project open)")
        
        print()
        print("=" * 60)
        print("SUCCESS! Everything is working!")
        print("=" * 60)
        print()
        print("You're ready to use the image placement script!")
        sys.stdout.flush()
        
    except Exception as e:
        print()
        print("=" * 60)
        print("UNEXPECTED ERROR!")
        print("=" * 60)
        print(f"Error: {e}")
        print()
        import traceback
        traceback.print_exc()
        print()
        print("This likely means:")
        print("  1. You're using Python 3.12+ (use Python 3.11)")
        print("  2. DaVinci Resolve is not properly installed")
        print("  3. External scripting is not enabled")
        sys.stdout.flush()
    
    print()
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
