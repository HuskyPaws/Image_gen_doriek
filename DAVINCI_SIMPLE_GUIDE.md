# 🎬 DaVinci Resolve Integration - Simple Guide

## ✨ Super Simple Approach

No bridge servers, no auto-starting, no complexity. Just:

1. **Upload CSV** → Your file with NR and Timestamp
2. **Enter folder path** → Where your images are
3. **Download script** → One Python file
4. **Run it** → `python place_images.py`

That's it!

## 📋 Prerequisites

1. **DaVinci Resolve Studio** (Free version doesn't have API)
2. **Python 3.7+** (Just Python itself, no packages needed!)
3. Your **CSV file** with NR and Timestamp
4. Your **images** (001_xxx.png, 002_xxx.png, etc.)

## 🚀 Step-by-Step

### 1. Prepare Your Data

You should have:
- ✅ CSV file from Claude (NR, Timestamp columns)
- ✅ Images in a folder (001_*.png, 002_*.png format)

### 2. Generate the Script

1. Open your Next.js app
2. Click **"DaVinci Export"** in the header
3. **Upload your CSV**
4. **Enter your image folder path** (e.g., `C:\Users\MrHusky\images`)
5. Click **"Download Python Script"**

### 3. Enable DaVinci Resolve API

In DaVinci Resolve:
1. Open **Preferences** (Ctrl+,)
2. Go to **General** tab
3. Set **"External scripting using"** to **"Local"**
4. Click **Save**

### 4. Run the Script

1. **Open DaVinci Resolve**
2. **Open your project and timeline**
3. **Run the script:**
   ```powershell
   python place_images.py
   ```

The script will:
- Connect to DaVinci Resolve
- Import all your images
- Place them at the correct timestamps
- Show progress and results

## 📝 CSV Format

Your CSV should look like this:

```csv
NR,Timestamp
1,00:00-00:06
2,00:06-00:10
3,00:10-00:14
```

The tool will match:
- NR 1 → `001_*.png`
- NR 2 → `002_*.png`
- etc.

## 🐛 Troubleshooting

### "Cannot connect to DaVinci Resolve"

**Fix:**
1. Make sure DaVinci Resolve is **running**
2. Open a **project**
3. Open/select a **timeline**
4. Enable external scripting (see step 3 above)

### "DaVinci Resolve API not found"

**Fix:**
1. Make sure you have **DaVinci Resolve Studio** (not free version)
2. Check path exists: `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting`

### "File not found"

**Fix:**
1. Check your image folder path is correct
2. Make sure images are named: `001_*.png`, `002_*.png`, etc.
3. Supported formats: .png, .jpg, .jpeg, .webp

### Python Not Found

**Fix:**
Install Python from: https://python.org/downloads/

⚠️ **Check "Add Python to PATH" during installation!**

## ✅ What You'll See

When you run the script:

```
============================================================
DaVinci Resolve Image Placement
============================================================

[1/5] Connecting to DaVinci Resolve...
  ✓ Connected!

[2/5] Getting project and timeline...
  ✓ Project: My Video Project
  ✓ Timeline: Main Timeline

[3/5] Importing 168 images...
  ✓ #001: 001_ca89f8e9e9be4745bc53bab22eac55e0.png
  ✓ #002: 002_810610074a8644cb9697321402f16175.png
  ...
  Imported: 168/168

[4/5] Placing images on timeline (Track 2)...
  ✓ #001: Frame 0 (00:00-00:06)
  ✓ #002: Frame 144 (00:06-00:10)
  ...

[5/5] Summary
============================================================
Total images: 168
Imported: 168
Placed on timeline: 168
============================================================

✅ SUCCESS! Check your timeline in DaVinci Resolve.

Press Enter to exit...
```

## 💡 Tips

- **Backup first:** Save your DaVinci project before running
- **Test small:** Try with 5-10 images first to make sure it works
- **Track selection:** Use Track 2 to keep your main video on Track 1
- **Undo:** You can undo in DaVinci if needed (Ctrl+Z)

## 🎯 Advantages of This Approach

✅ **No setup** - No bridge server, no dependencies
✅ **No ports** - No network issues
✅ **Simple** - Just Python and DaVinci
✅ **Reliable** - Script runs directly, no middleman
✅ **Debuggable** - Easy to see what's happening
✅ **Portable** - Works on any machine with Python

## 🆘 Still Having Issues?

1. **Check Python version:** `python --version` (should be 3.7+)
2. **Run the script** and copy the error message
3. **Check DaVinci Resolve** is running with a project + timeline open
4. **Verify API path** exists on your system

That's it! Much simpler than the bridge approach. 🎉
































