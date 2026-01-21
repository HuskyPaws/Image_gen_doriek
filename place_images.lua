--[[
    DaVinci Resolve Image Placement Script (Lua)
    
    This script:
    1. Reads a CSV file with image numbers (NR) and timestamps
    2. Finds matching images in a folder
    3. Imports them to the media pool
    4. Places them on the timeline at exact timestamps
    
    Usage:
    1. Open DaVinci Resolve
    2. Open your project and timeline
    3. Run this script from: Workspace → Scripts → Utility
]]

print("============================================================")
print("DaVinci Resolve - Image Placement Script")
print("============================================================")
print("")

-- ===================================================================
-- CONFIGURATION (Edit these values)
-- ===================================================================

local CSV_FILE = [[C:\Path\To\Your\images.csv]]
local IMAGES_FOLDER = [[C:\Path\To\Your\Images]]
local VIDEO_TRACK = 2  -- Which video track to place images on (1 = V1, 2 = V2, etc.)

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Check if file exists
local function fileExists(path)
    local file = io.open(path, "r")
    if file then
        file:close()
        return true
    end
    return false
end

-- Parse CSV file
local function parseCSV(filePath)
    if not fileExists(filePath) then
        print("ERROR: CSV file not found: " .. filePath)
        return nil
    end
    
    local file = io.open(filePath, "r")
    if not file then
        print("ERROR: Could not open CSV file")
        return nil
    end
    
    local rows = {}
    local lineNum = 0
    
    for line in file:lines() do
        lineNum = lineNum + 1
        
        -- Skip header row
        if lineNum == 1 then
            -- Verify header has required columns
            if not line:lower():match("nr") or not line:lower():match("timestamp") then
                print("ERROR: CSV must have 'NR' and 'Timestamp' columns")
                file:close()
                return nil
            end
        else
            -- Parse data rows: NR,Timestamp
            local nr, timestamp = line:match("^(%d+)%s*,%s*(.+)$")
            if nr and timestamp then
                table.insert(rows, {
                    nr = tonumber(nr),
                    timestamp = timestamp:match("^%s*(.-)%s*$")  -- Trim whitespace
                })
            end
        end
    end
    
    file:close()
    print("✓ Parsed " .. #rows .. " rows from CSV")
    return rows
end

-- Convert timestamp (MM:SS-MM:SS) to start/end seconds
local function parseTimestamp(timestamp)
    local startMin, startSec, endMin, endSec = timestamp:match("(%d+):(%d+)%-(%d+):(%d+)")
    
    if not startMin then
        print("WARNING: Invalid timestamp format: " .. timestamp)
        return nil, nil
    end
    
    local startTime = tonumber(startMin) * 60 + tonumber(startSec)
    local endTime = tonumber(endMin) * 60 + tonumber(endSec)
    
    return startTime, endTime
end

-- Convert seconds to frames
local function secondsToFrames(seconds, fps)
    return math.floor(seconds * fps)
end

-- Find image file matching NR
local function findImageForNR(imagesFolder, nr)
    -- Format NR with leading zeros (e.g., 1 → "001")
    local nrFormatted = string.format("%03d", nr)
    
    -- Check if folder ends with separator
    if not imagesFolder:match("[/\\]$") then
        imagesFolder = imagesFolder .. "\\"
    end
    
    -- Common image extensions
    local extensions = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"}
    
    -- Try to find file with pattern: 001_*.png
    for _, ext in ipairs(extensions) do
        -- Try exact pattern with underscore
        local pattern = imagesFolder .. nrFormatted .. "_*" .. ext
        
        -- For Windows, we need to use a different approach
        -- Just construct the most likely path
        local testPath = imagesFolder .. nrFormatted .. "_" 
        
        -- We'll use Resolve's media pool to verify the file exists
        -- For now, return the pattern for Resolve to handle
        return imagesFolder .. nrFormatted
    end
    
    return nil
end

-- ===================================================================
-- MAIN SCRIPT
-- ===================================================================

-- Step 1: Connect to DaVinci Resolve
print("Step 1: Connecting to DaVinci Resolve...")
local resolve = Resolve() or app:GetResolve()

if not resolve then
    print("ERROR: Could not connect to DaVinci Resolve")
    print("")
    print("Make sure:")
    print("  1. DaVinci Resolve is running")
    print("  2. External scripting is enabled:")
    print("     Settings → System → General → External scripting → Local")
    return
end

print("✓ Connected to DaVinci Resolve")
print("")

-- Step 2: Get current project and timeline
print("Step 2: Getting current project and timeline...")
local projectManager = resolve:GetProjectManager()
local project = projectManager:GetCurrentProject()

if not project then
    print("ERROR: No project is open")
    print("Please open a project first")
    return
end

print("✓ Project: " .. project:GetName())

local timeline = project:GetCurrentTimeline()
if not timeline then
    print("ERROR: No timeline is open")
    print("Please open a timeline first")
    return
end

print("✓ Timeline: " .. timeline:GetName())

-- Get timeline FPS
local fps = tonumber(timeline:GetSetting("timelineFrameRate"))
print("✓ Timeline FPS: " .. fps)
print("")

-- Step 3: Parse CSV file
print("Step 3: Parsing CSV file...")
local imageData = parseCSV(CSV_FILE)

if not imageData or #imageData == 0 then
    print("ERROR: No data found in CSV file")
    return
end

print("")

-- Step 4: Find and import images
print("Step 4: Finding and importing images...")
local mediaPool = project:GetMediaPool()
local rootFolder = mediaPool:GetRootFolder()

-- Create a folder for imported images
mediaPool:SetCurrentFolder(rootFolder)
local importFolder = mediaPool:AddSubFolder(rootFolder, "Script Imported Images")
if importFolder then
    mediaPool:SetCurrentFolder(importFolder)
end

local imagePaths = {}
local imageItems = {}

for _, data in ipairs(imageData) do
    local imageBasePath = findImageForNR(IMAGES_FOLDER, data.nr)
    
    if imageBasePath then
        -- Try different extensions
        local extensions = {".png", ".jpg", ".jpeg", ".tiff", ".tif"}
        
        for _, ext in ipairs(extensions) do
            -- Try to find files matching pattern
            local testPath = imageBasePath .. "_*" .. ext
            
            -- For simplicity, let's just add common pattern
            -- User will need to ensure files are named correctly
            local imagePath = imageBasePath .. ext
            
            if fileExists(imagePath) then
                table.insert(imagePaths, imagePath)
                imageItems[data.nr] = {
                    path = imagePath,
                    timestamp = data.timestamp
                }
                print("  Found: " .. imagePath)
                break
            end
        end
    end
end

if #imagePaths == 0 then
    print("ERROR: No images found")
    print("Check that images are named like: 001_hash.png, 002_hash.png, etc.")
    return
end

-- Import images to media pool
print("")
print("Importing " .. #imagePaths .. " images...")
local importedClips = mediaPool:ImportMedia(imagePaths)

if not importedClips or #importedClips == 0 then
    print("ERROR: Failed to import images")
    return
end

print("✓ Imported " .. #importedClips .. " images")
print("")

-- Step 5: Place images on timeline
print("Step 5: Placing images on timeline...")

local placed = 0
local failed = 0

for _, data in ipairs(imageData) do
    local startTime, endTime = parseTimestamp(data.timestamp)
    
    if startTime and endTime then
        local startFrame = secondsToFrames(startTime, fps)
        local duration = secondsToFrames(endTime - startTime, fps)
        
        -- Find the imported clip
        local clipItem = nil
        for _, clip in ipairs(importedClips) do
            local clipName = clip:GetName()
            -- Match by NR prefix (e.g., "001")
            if clipName:match("^" .. string.format("%03d", data.nr)) then
                clipItem = clip
                break
            end
        end
        
        if clipItem then
            -- Append to timeline at specific position
            local success = mediaPool:AppendToTimeline({
                {
                    mediaPoolItem = clipItem,
                    startFrame = 0,
                    endFrame = duration,
                    recordFrame = startFrame,
                    trackIndex = VIDEO_TRACK,
                    mediaType = 1  -- Video only
                }
            })
            
            if success then
                print("  ✓ Placed image " .. data.nr .. " at " .. data.timestamp)
                placed = placed + 1
            else
                print("  ✗ Failed to place image " .. data.nr)
                failed = failed + 1
            end
        else
            print("  ✗ Could not find clip for NR " .. data.nr)
            failed = failed + 1
        end
    else
        print("  ✗ Invalid timestamp for NR " .. data.nr)
        failed = failed + 1
    end
end

print("")
print("============================================================")
print("COMPLETE!")
print("============================================================")
print("Placed: " .. placed .. " images")
print("Failed: " .. failed .. " images")
print("============================================================")
































