# 🎉 DaVinci Resolve - Lua Script Guide

## ✅ PROBLEM SOLVED!

**No more Python version issues!** Lua works perfectly with DaVinci Resolve out of the box.

---

## 🚀 How to Use

### Method 1: From Your Next.js App (Recommended)

1. **Open your Next.js app:**
   ```powershell
   cd image-generator-app
   npm run dev
   ```

2. **Go to the DaVinci Export tool** (in your app)

3. **Upload your CSV file** with columns: `NR`, `Timestamp`
   - Example: `001,00:00-00:06`

4. **Select your images folder**

5. **Click "Download Lua Script"**

6. **You'll get `place_images.lua`**

---

### Method 2: Run in DaVinci Console (Quick Test)

1. **Open DaVinci Resolve**

2. **Open Console:**
   - Go to **Workspace** → **Console**
   - Or press the **`` ` ``** (backtick) key

3. **Select "Lua"** from the dropdown at the bottom

4. **Open your `place_images.lua`** in a text editor

5. **Copy the entire script** and **paste into the console**

6. **Press Enter** to run!

---

### Method 3: Install as Permanent Script

1. **Copy `place_images.lua`** to:
   ```
   %APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\
   ```

2. **In DaVinci Resolve:**
   - **Workspace** → **Scripts** → **Utility** → **place_images**

3. **The script runs immediately!**

---

## 📋 Before Running

### ✅ Checklist:

1. **DaVinci Resolve is running**
2. **Open a project**
3. **Open a timeline**
4. **Enable external scripting:**
   - Settings → System → General
   - External scripting using → **Local**

---

## 🎯 What the Script Does

1. ✅ Connects to DaVinci Resolve
2. ✅ Gets your current project and timeline
3. ✅ Imports images from your specified folder
4. ✅ Places them at exact timestamps from your CSV
5. ✅ Shows progress and results

---

## 📝 CSV Format

Your CSV should look like this:

```csv
NR,Timestamp
1,00:00-00:06
2,00:06-00:12
3,00:12-00:18
```

**Images should be named:**
- `001_hash.png`
- `002_hash.png`
- `003_hash.png`
- etc.

The script matches by the `001` prefix to the `NR` in the CSV.

---

## 🎨 Customization

You can edit these values in the generated script:

```lua
local FPS = 30  -- Timeline FPS
local VIDEO_TRACK = 2  -- Which track to place images (1=V1, 2=V2, etc.)
local IMAGE_FOLDER = [[C:\Path\To\Images]]  -- Your images folder
```

---

## ✨ Advantages of Lua

### vs Python:
- ✅ **No version compatibility issues**
- ✅ **No installation required**
- ✅ **Works in free AND studio**
- ✅ **Simpler syntax**
- ✅ **Run directly in Console**
- ✅ **Officially supported**

---

## 🐛 Troubleshooting

### "Could not connect to DaVinci Resolve"
- Make sure DaVinci Resolve is **running**
- Enable external scripting: **Settings → System → General → Local**

### "No project is open"
- Open a project in DaVinci Resolve

### "No timeline is open"
- Open or create a timeline

### "No images found"
- Check that `IMAGE_FOLDER` path is correct
- Check that images are named like `001_hash.png`
- Check that the numbers match your CSV `NR` column

---

## 🎉 Success!

If everything works, you'll see:
```
✅ SUCCESS! Check your timeline in DaVinci Resolve.
```

Your images will be placed on the timeline at the exact timestamps from your CSV!

---

## 📚 Learn More About Lua Scripting

- **Official Docs:** DaVinci Resolve → Help → Documentation → Developer
- **Console:** Great for testing small scripts
- **Community:** Lots of Lua examples online

---

## 💡 Pro Tips

1. **Test in Console first** before installing as permanent script
2. **Create a test timeline** before running on your real project
3. **Keep a backup** of your project (just in case)
4. **Check FPS** matches your timeline settings
5. **Use meaningful track numbers** (don't overlap with existing clips)

---

Happy automating! 🚀
































