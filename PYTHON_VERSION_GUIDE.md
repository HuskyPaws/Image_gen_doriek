# DaVinci Resolve Python Version Requirements

## ⚠️ CRITICAL: Python Version Compatibility

**DaVinci Resolve's Python API officially supports Python 3.6**

According to official documentation and user reports:
- ✅ **Python 3.6** - Officially supported, most reliable
- ⚠️ **Python 3.7-3.10** - May work depending on your DaVinci version
- ❌ **Python 3.11** - Often crashes (as you're experiencing)
- ❌ **Python 3.12+** - Incompatible (changed internal C API)

---

## 🔧 Solution: Install Python 3.6

### Step 1: Download Python 3.6.8

**Direct Download:**
https://www.python.org/ftp/python/3.6.8/python-3.6.8-amd64.exe

(This is the last official release of Python 3.6)

### Step 2: Install

1. Run the installer
2. ✅ **Check "Add Python 3.6 to PATH"**
3. Choose **"Customize installation"**
4. Install location: `C:\Python36`
5. Complete installation

### Step 3: Verify

Open PowerShell and run:
```powershell
C:\Python36\python.exe --version
```

You should see: `Python 3.6.8`

---

## 🚀 After Installing Python 3.6

Run the test again:
```powershell
C:\Python36\python.exe test_davinci_simple.py
```

---

## 📝 Why Python 3.6?

- DaVinci Resolve's `fusionscript.dll` was compiled against Python 3.6
- Newer Python versions changed internal APIs that break compatibility
- Python 3.6 is old (2016) but still works fine for DaVinci scripting

---

## ⚠️ Security Note

Python 3.6 is no longer supported (EOL: December 2021). Only use it for DaVinci Resolve scripting, not for general development or internet-facing applications.

---

## 🔍 Alternative: Check Your DaVinci Version

Some newer versions of DaVinci Resolve (18+) may support Python 3.10. Check:
- DaVinci Resolve → About → Version number

If you have DaVinci 18.5+, you might try Python 3.10 instead of 3.6.
































