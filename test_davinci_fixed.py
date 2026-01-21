#!/usr/bin/env python3
"""
DaVinci Resolve Connection Test
Environment variables set by BAT file before Python runs
"""

import sys
import os

def main():
    print("=" * 60)
    print("DaVinci Resolve Connection Test")
    print("=" * 60)
    print()
    print(f"Python: {sys.version}")
    print()
    
    # Check environment variables
    print("Checking environment variables...")
    resolve_api = os.environ.get('RESOLVE_SCRIPT_API', 'NOT SET')
    resolve_lib = os.environ.get('RESOLVE_SCRIPT_LIB', 'NOT SET')
    
    print(f"  RESOLVE_SCRIPT_API: {resolve_api}")
    print(f"  RESOLVE_SCRIPT_LIB: {resolve_lib}")
    print()
    
    if resolve_api == 'NOT SET' or resolve_lib == 'NOT SET':
        print("ERROR: Environment variables not set!")
        print("Please run this via test_davinci_fixed.bat")
        input("\nPress Enter to exit...")
        return
    
    # Check if DaVinci is running
    print("Checking if DaVinci Resolve is running...")
    import subprocess
    result = subprocess.run(['tasklist'], capture_output=True, text=True)
    if 'Resolve.exe' not in result.stdout:
        print("  ✗ DaVinci Resolve is NOT running!")
        print()
        print("Please start DaVinci Resolve Studio first.")
        input("\nPress Enter to exit...")
        return
    
    print("  ✓ DaVinci Resolve is running")
    print()
    
    # Try to import
    print("Importing DaVinciResolveScript...")
    print("  (If this crashes, check that external scripting is enabled)")
    print()
    sys.stdout.flush()
    
    try:
        import DaVinciResolveScript as dvr_script
        print("  ✓✓✓ Import successful!")
        print()
    except Exception as e:
        print(f"  ✗ Import failed: {e}")
        print()
        import traceback
        traceback.print_exc()
        input("\nPress Enter to exit...")
        return
    
    # Try to connect
    print("Connecting to DaVinci Resolve...")
    print()
    
    try:
        resolve = dvr_script.scriptapp("Resolve")
        
        if not resolve:
            print("  ✗ Connection returned None")
            print()
            print("Make sure external scripting is enabled:")
            print("  Settings → System → General → External scripting using → Local")
            input("\nPress Enter to exit...")
            return
        
        print("  ✓✓✓ CONNECTION SUCCESSFUL! ✓✓✓")
        print()
        
        # Get project info
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
        print("SUCCESS! Python 3.11 + DaVinci API works!")
        print("=" * 60)
        print()
        print("You're ready to use the image placement script!")
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print()
        print("UNEXPECTED ERROR!")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        input("\nPress Enter to exit...")
































