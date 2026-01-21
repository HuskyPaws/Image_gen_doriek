#!/usr/bin/env python3
"""
DaVinci Bridge Setup Checker
Run this to verify your setup is correct
"""

import sys
import os

print("=" * 60)
print("DaVinci Bridge Setup Checker")
print("=" * 60)
print()

# Check Python version
print("✓ Python version:", sys.version.split()[0])
python_version = sys.version_info
if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 7):
    print("  ⚠️  WARNING: Python 3.7+ recommended")
print()

# Check Flask
print("Checking dependencies...")
try:
    import flask
    print("  ✓ Flask installed:", flask.__version__)
except ImportError:
    print("  ✗ Flask NOT installed")
    print("    Run: pip install flask")

try:
    import flask_cors
    print("  ✓ Flask-CORS installed")
except ImportError:
    print("  ✗ Flask-CORS NOT installed")
    print("    Run: pip install flask-cors")

print()

# Check DaVinci Resolve API
print("Checking DaVinci Resolve API...")
RESOLVE_SCRIPT_API = os.path.join(
    os.getenv('PROGRAMDATA', 'C:\\ProgramData'),
    'Blackmagic Design',
    'DaVinci Resolve',
    'Support',
    'Developer',
    'Scripting'
)

api_path = os.path.join(RESOLVE_SCRIPT_API, 'Modules')
if os.path.exists(api_path):
    print(f"  ✓ API path found: {api_path}")
    sys.path.append(api_path)
    
    try:
        import DaVinciResolveScript as dvr
        print("  ✓ DaVinci Resolve API can be imported")
        
        # Try to connect
        try:
            resolve = dvr.scriptapp("Resolve")
            if resolve:
                print("  ✓ Connected to DaVinci Resolve!")
                
                pm = resolve.GetProjectManager()
                project = pm.GetCurrentProject()
                if project:
                    print(f"  ✓ Current project: {project.GetName()}")
                    
                    timeline = project.GetCurrentTimeline()
                    if timeline:
                        print(f"  ✓ Current timeline: {timeline.GetName()}")
                    else:
                        print("  ⚠️  No timeline selected")
                else:
                    print("  ⚠️  No project open")
            else:
                print("  ⚠️  DaVinci Resolve not running or external scripting not enabled")
                print("     Go to: Preferences → General → External scripting using → Local")
        except Exception as e:
            print(f"  ⚠️  Could not connect to Resolve: {e}")
            
    except ImportError as e:
        print(f"  ✗ Cannot import DaVinci API: {e}")
else:
    print(f"  ✗ API path NOT found: {api_path}")
    print("     Is DaVinci Resolve Studio installed?")

print()

# Check tkinter
print("Checking folder picker support...")
try:
    import tkinter
    print("  ✓ tkinter available (folder picker will work)")
except ImportError:
    print("  ⚠️  tkinter not available (folder picker disabled)")
    print("     Users will need to paste folder path manually")

print()

# Summary
print("=" * 60)
print("Setup Summary")
print("=" * 60)

all_good = True
try:
    import flask
    import flask_cors
except ImportError:
    all_good = False
    print("❌ Install dependencies: pip install -r requirements.txt")

if not os.path.exists(api_path):
    all_good = False
    print("❌ Install DaVinci Resolve Studio")

if all_good:
    print("✅ All checks passed! You're ready to use the bridge.")
    print()
    print("Next steps:")
    print("1. Make sure DaVinci Resolve is running")
    print("2. Open a project with a timeline")
    print("3. Start your Next.js app and click 'DaVinci Export'")
else:
    print()
    print("⚠️  Some issues found. Fix them and run this script again.")

print()
input("Press Enter to exit...")
































