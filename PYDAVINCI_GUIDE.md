# Using PyDavinci for DaVinci Resolve Automation

## What is PyDavinci?

PyDavinci is a **modern Python wrapper** for DaVinci Resolve's API that provides:
- ✅ Better error handling
- ✅ Auto-completion and type hints
- ✅ Simpler API
- ✅ Works with Python 3.10+

**Repository:** https://github.com/pedrolabonia/pydavinci

---

## 🚀 Quick Setup

### Step 1: Install PyDavinci

**Double-click:** `install_pydavinci.bat`

Or run manually:
```powershell
C:\Python311\python.exe -m pip install git+https://github.com/pedrolabonia/pydavinci
```

### Step 2: Enable External Scripting in DaVinci

1. Open **DaVinci Resolve Studio**
2. Go to **Settings** (gear icon) → **System** → **General**
3. Scroll down to **External scripting using**
4. Set to **Local**
5. Click **Save**

### Step 3: Test the Connection

**Double-click:** `run_pydavinci_test.bat`

Or run:
```powershell
C:\Python311\python.exe test_pydavinci.py
```

---

## ✅ Requirements

- ✅ **DaVinci Resolve Studio** (free version doesn't support API)
- ✅ **Python 3.10 or higher** (you have 3.11 ✓)
- ✅ **External scripting enabled** (see Step 2 above)
- ✅ **DaVinci Resolve must be running** when you run scripts

---

## 📝 Basic Usage Example

```python
from pydavinci import davinci

# Connect to DaVinci Resolve
resolve = davinci.Resolve()

# Get current project
project = resolve.project_manager.get_current_project()
print(f"Project: {project.name}")

# Get current timeline
timeline = project.get_current_timeline()
print(f"Timeline: {timeline.name}")
print(f"FPS: {timeline.framerate}")

# Import media
media_pool = project.media_pool
media_pool.import_media(['path/to/image.png'])

# Place on timeline
clips = media_pool.append_to_timeline([item])
```

---

## 🔧 Troubleshooting

### "pydavinci not installed"
Run `install_pydavinci.bat`

### "Connection failed"
1. Make sure DaVinci Resolve is **running**
2. Check external scripting is set to **Local**
3. Make sure you have **Studio version** (not free)

### "Python 3.10+ required"
You're using Python 3.11, so this should be fine!

---

## 🎯 Next Steps

Once the test is successful, we'll update the image placement script to use PyDavinci instead of the raw DaVinci API.
































