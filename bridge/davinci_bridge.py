#!/usr/bin/env python3
"""
DaVinci Resolve Bridge Server
Auto-started by Next.js app to communicate with DaVinci Resolve
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import glob
import re

# Setup paths for DaVinci Resolve API
RESOLVE_SCRIPT_API = os.path.join(
    os.getenv('PROGRAMDATA', 'C:\\ProgramData'),
    'Blackmagic Design',
    'DaVinci Resolve',
    'Support',
    'Developer',
    'Scripting'
)

sys.path.append(os.path.join(RESOLVE_SCRIPT_API, 'Modules'))

try:
    import DaVinciResolveScript as dvr
    RESOLVE_AVAILABLE = True
except ImportError:
    RESOLVE_AVAILABLE = False
    print("WARNING: DaVinci Resolve API not found")
    print(f"Expected location: {RESOLVE_SCRIPT_API}")

# Try to import tkinter for folder picker
try:
    import tkinter as tk
    from tkinter import filedialog
    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False
    print("WARNING: tkinter not available, folder picker disabled")

app = Flask(__name__)
CORS(app)  # Allow requests from Next.js


@app.route('/status')
def status():
    """Check if bridge is running and DaVinci is connected"""
    status_data = {
        'bridgeRunning': True,
        'resolveAvailable': RESOLVE_AVAILABLE,
        'resolveConnected': False,
        'project': None,
        'timeline': None
    }
    
    if not RESOLVE_AVAILABLE:
        return jsonify(status_data)
    
    try:
        resolve = dvr.scriptapp("Resolve")
        if not resolve:
            return jsonify(status_data)
        
        project_manager = resolve.GetProjectManager()
        project = project_manager.GetCurrentProject()
        
        if project:
            status_data['resolveConnected'] = True
            status_data['project'] = project.GetName()
            
            timeline = project.GetCurrentTimeline()
            if timeline:
                status_data['timeline'] = timeline.GetName()
                status_data['fps'] = timeline.GetSetting('timelineFrameRate')
        
    except Exception as e:
        print(f"Error checking Resolve status: {e}")
    
    return jsonify(status_data)


@app.route('/browse-folder', methods=['POST'])
def browse_folder():
    """Open native Windows folder picker dialog"""
    if not TKINTER_AVAILABLE:
        return jsonify({
            'success': False,
            'message': 'Folder picker not available'
        })
    
    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        
        folder_path = filedialog.askdirectory(
            title='Select Image Folder',
            initialdir=os.path.expanduser('~\\Pictures')
        )
        
        root.destroy()
        
        if folder_path:
            return jsonify({
                'success': True,
                'path': folder_path
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No folder selected'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })


@app.route('/find-images', methods=['POST'])
def find_images():
    """Find images by NR prefix (001_, 002_, etc.)"""
    data = request.json
    folder_path = data.get('path')
    nr_list = data.get('nrList', [])
    
    if not os.path.exists(folder_path):
        return jsonify({
            'success': False,
            'message': f'Folder does not exist: {folder_path}'
        })
    
    results = []
    found_count = 0
    missing = []
    
    for nr in nr_list:
        # Format as 001, 002, 003, etc.
        prefix = str(nr).zfill(3)
        
        # Look for any file starting with "001_"
        # Support common image extensions
        found = False
        for ext in ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp']:
            pattern = os.path.join(folder_path, f"{prefix}_*.{ext}")
            matches = glob.glob(pattern)
            
            if matches:
                # Found it! Use first match
                filename = os.path.basename(matches[0])
                results.append({
                    'nr': nr,
                    'found': True,
                    'filename': filename,
                    'fullPath': matches[0]
                })
                found_count += 1
                found = True
                break
        
        if not found:
            # Missing
            results.append({
                'nr': nr,
                'found': False,
                'filename': None,
                'fullPath': None
            })
            missing.append(nr)
    
    return jsonify({
        'success': True,
        'total': len(nr_list),
        'found': found_count,
        'missing': len(missing),
        'missingNumbers': missing,
        'mappings': results
    })


def parse_timestamp(timestamp_str):
    """Parse timestamp like '00:00' or '01:23:45' to seconds"""
    parts = timestamp_str.strip().split(':')
    if len(parts) == 2:  # MM:SS
        m, s = int(parts[0]), int(parts[1])
        return m * 60 + s
    elif len(parts) == 3:  # HH:MM:SS
        h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
        return h * 3600 + m * 60 + s
    else:
        return 0


def timestamp_to_frame(timestamp_str, fps):
    """Convert timestamp to frame number"""
    seconds = parse_timestamp(timestamp_str)
    return int(seconds * fps)


@app.route('/place-images', methods=['POST'])
def place_images():
    """Place images on DaVinci Resolve timeline"""
    if not RESOLVE_AVAILABLE:
        return jsonify({
            'success': False,
            'message': 'DaVinci Resolve API not available'
        })
    
    data = request.json
    mappings = data.get('mappings', [])
    settings = data.get('settings', {})
    
    fps = int(settings.get('fps', 24))
    video_track = int(settings.get('videoTrack', 2))
    
    try:
        # Connect to Resolve
        resolve = dvr.scriptapp("Resolve")
        if not resolve:
            return jsonify({
                'success': False,
                'message': 'Cannot connect to DaVinci Resolve. Make sure it is running.'
            })
        
        project_manager = resolve.GetProjectManager()
        project = project_manager.GetCurrentProject()
        
        if not project:
            return jsonify({
                'success': False,
                'message': 'No project open in DaVinci Resolve'
            })
        
        timeline = project.GetCurrentTimeline()
        if not timeline:
            return jsonify({
                'success': False,
                'message': 'No timeline selected in DaVinci Resolve'
            })
        
        media_pool = project.GetMediaPool()
        root_folder = media_pool.GetRootFolder()
        
        # Create a folder for imported images
        import_folder = media_pool.AddSubFolder(root_folder, "Imported_Images")
        if not import_folder:
            import_folder = root_folder
        
        media_pool.SetCurrentFolder(import_folder)
        
        # Import all images first
        imported_items = {}
        import_errors = []
        
        for mapping in mappings:
            if not mapping.get('found'):
                continue
            
            filepath = mapping.get('fullPath')
            nr = mapping.get('nr')
            
            if not filepath or not os.path.exists(filepath):
                import_errors.append(f"#{nr}: File not found")
                continue
            
            # Import to media pool
            items = media_pool.ImportMedia([filepath])
            if items and len(items) > 0:
                imported_items[nr] = items[0]
            else:
                import_errors.append(f"#{nr}: Failed to import {mapping.get('filename')}")
        
        # Place images on timeline
        placed_count = 0
        placement_errors = []
        
        for mapping in mappings:
            nr = mapping.get('nr')
            
            if nr not in imported_items:
                continue
            
            media_item = imported_items[nr]
            timestamp = mapping.get('timestamp', '')
            
            # Parse timestamp range (e.g., "00:00-00:06")
            if '-' in timestamp:
                start_str, end_str = timestamp.split('-')
                start_frame = timestamp_to_frame(start_str.strip(), fps)
                end_frame = timestamp_to_frame(end_str.strip(), fps)
                duration = end_frame - start_frame
            else:
                placement_errors.append(f"#{nr}: Invalid timestamp format")
                continue
            
            # Place on timeline using AppendToTimeline
            clip_info = {
                "mediaPoolItem": media_item,
                "startFrame": 0,
                "endFrame": duration,
                "trackIndex": video_track,
                "recordFrame": start_frame
            }
            
            result = media_pool.AppendToTimeline([clip_info])
            
            if result:
                placed_count += 1
            else:
                placement_errors.append(f"#{nr}: Failed to place on timeline")
        
        return jsonify({
            'success': True,
            'imported': len(imported_items),
            'placed': placed_count,
            'total': len(mappings),
            'importErrors': import_errors,
            'placementErrors': placement_errors
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        })


if __name__ == '__main__':
    # Try to find an available port
    import socket
    
    def is_port_available(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('localhost', port))
                return True
            except OSError:
                return False
    
    port = 8765
    if not is_port_available(port):
        print(f"⚠️  Port {port} is already in use, trying alternate ports...")
        for alt_port in range(8766, 8775):
            if is_port_available(alt_port):
                port = alt_port
                break
        else:
            print("❌ Could not find available port between 8765-8774")
            print("Please close other applications using these ports")
            input("Press Enter to exit...")
            sys.exit(1)
    
    print("=" * 60)
    print("🎬 DaVinci Resolve Bridge Server")
    print("=" * 60)
    print(f"Status: Running on http://localhost:{port}")
    print(f"DaVinci API: {'✓ Available' if RESOLVE_AVAILABLE else '✗ Not Found'}")
    print(f"Folder Picker: {'✓ Available' if TKINTER_AVAILABLE else '✗ Not Available'}")
    print("=" * 60)
    print("\nWaiting for connections from Next.js app...\n")
    
    try:
        app.run(host='localhost', port=port, debug=False)
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        print("\nTroubleshooting:")
        print("1. Check if Flask is installed: pip install flask flask-cors")
        print("2. Check if port is available: netstat -ano | findstr :8765")
        print("3. Try running as administrator")
        input("\nPress Enter to exit...")
        sys.exit(1)

