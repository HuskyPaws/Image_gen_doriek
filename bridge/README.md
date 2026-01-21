# DaVinci Resolve Bridge Server

This Python server provides a bridge between the Next.js web app and DaVinci Resolve's local API.

## 🚀 Quick Setup

### 1. Install Dependencies

**Easy Way (Windows):**
```cmd
Double-click: install_dependencies.bat
```

**Manual Way:**
```bash
pip install -r requirements.txt
```

### 2. Verify Setup

**Run the checker:**
```cmd
Double-click: check_setup.bat
```

Or:
```bash
python check_setup.py
```

This checks:
- ✓ Python version
- ✓ Dependencies installed
- ✓ DaVinci Resolve API available
- ✓ Can connect to DaVinci

### 3. Enable DaVinci External Scripting

In DaVinci Resolve:
1. **Preferences** (Ctrl+,)
2. **General** tab
3. **External scripting using** → Set to **Local**
4. Click **Save**

## ✨ How It Works

The bridge server is **automatically started** by the Next.js app when you visit the DaVinci Export page. You don't need to run it manually!

### Manual Testing (Optional)

To test the bridge manually:

```cmd
Double-click: test_bridge.bat
```

Or:
```bash
python davinci_bridge.py
```

You should see:
```
🎬 DaVinci Resolve Bridge Server
Status: Running on http://localhost:8765
```

Visit http://localhost:8765/status to check connection.

## 📡 API Endpoints

- `GET /status` - Check if bridge and DaVinci are connected
- `POST /browse-folder` - Open native folder picker
- `POST /find-images` - Find images by number prefix (001_, 002_, etc.)
- `POST /place-images` - Place images on DaVinci timeline

## 🐛 Troubleshooting

### Python Not Found

Install Python 3.7+ from: https://www.python.org/downloads/

⚠️ **IMPORTANT:** Check "Add Python to PATH" during installation!

### Dependencies Not Installed

Run:
```bash
pip install -r requirements.txt
```

### Can't Connect to DaVinci

1. Make sure DaVinci Resolve is **running**
2. Open a **project**
3. Select a **timeline**
4. Check external scripting is enabled (see step 3 above)

### Port Already in Use

If port 8765 is already in use, edit `davinci_bridge.py` line 353:
```python
app.run(host='localhost', port=8765, debug=False)
```

Change `8765` to another port like `8766`.

## 📚 Files

- `davinci_bridge.py` - Main bridge server
- `requirements.txt` - Python dependencies
- `install_dependencies.bat` - Easy installer
- `check_setup.bat` - Setup verification
- `test_bridge.bat` - Manual test runner
- `check_setup.py` - Diagnostic script

