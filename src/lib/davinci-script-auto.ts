/**
 * Automatic placement script - based on proven working method
 */

interface ImageMapping {
  nr: number;
  timestamp: string;
  filename: string;
  startTime: string;
  endTime: string;
}

interface ScriptSettings {
  fps: number;
  videoTrack: number;
  imageFolder: string;
}

export function generateAutoPlaceScript(
  mappings: ImageMapping[],
  settings: ScriptSettings
): string {
  const luaMappings = mappings.map(m => 
    `  {nr = ${m.nr}, filename = "${m.filename}", startTime = "${m.startTime}", endTime = "${m.endTime}"}`
  ).join(',\n');

  const imageFolder = settings.imageFolder;

  return `--[[
  DaVinci Resolve - AUTO PLACEMENT Script
  Places images at exact positions on timeline.
  
  Based on proven working method with proper timecode handling.
  Handles any timeline start timecode (e.g., 01:00:00:00).
]]

-- ── Setup ───────────────────────────────────────────────────────────────────
local resolve = Resolve and Resolve() or (bmd and bmd.scriptapp and bmd.scriptapp("Resolve")) or nil
assert(resolve, "Run inside DaVinci Resolve.")
local pm       = resolve:GetProjectManager()
local project  = assert(pm:GetCurrentProject(), "No current project.")
local timeline = assert(project:GetCurrentTimeline(), "No current timeline.")
local media    = assert(project:GetMediaPool(), "No Media Pool.")

local fps = tonumber(project:GetSetting("timelineFrameRate")) or ${settings.fps}
local VIDEO_TRACK = 1
local IMAGE_FOLDER = [[${imageFolder}]]

local function log(...) print("[AutoPlace]", string.format(...)) end

-- Try to get the current still image default duration
local defaultStillDuration = tonumber(project:GetSetting("timelineStillImageDefaultDuration"))
if defaultStillDuration then
  log("DEBUG: Project default still duration = %d frames (%.2f seconds)", defaultStillDuration, defaultStillDuration/fps)
end

-- ── Image mappings from CSV ─────────────────────────────────────────────────
local IMAGES = {
${luaMappings}
}

-- ── Helper functions ────────────────────────────────────────────────────────
local function clampInt(x) return math.max(0, math.floor(tonumber(x or 0) or 0)) end

-- Parse flexible timecode: SS, MM:SS, HH:MM:SS, HH:MM:SS:FF
local function parseTCFlexible(tc)
  if type(tc) == "number" then return math.floor(tc) end
  if type(tc) ~= "string" then return nil end
  tc = tc:match("^%s*(.-)%s*$")  -- trim
  if tc == "" then return nil end
  
  tc = tc:gsub(";", ":")  -- handle drop-frame
  
  local parts = {}
  for p in tc:gmatch("[^:]+") do parts[#parts+1] = p end
  
  if #parts == 1 then  -- SS
    return clampInt(parts[1]) * fps
  elseif #parts == 2 then  -- MM:SS
    return (clampInt(parts[1]) * 60 + clampInt(parts[2])) * fps
  elseif #parts == 3 then  -- HH:MM:SS
    return (clampInt(parts[1]) * 3600 + clampInt(parts[2]) * 60 + clampInt(parts[3])) * fps
  elseif #parts == 4 then  -- HH:MM:SS:FF
    return (clampInt(parts[1]) * 3600 + clampInt(parts[2]) * 60 + clampInt(parts[3])) * fps + clampInt(parts[4])
  end
  return nil
end

local function framesToTC(fr)
  local total = math.max(0, math.floor(fr or 0))
  local s = math.floor(total / fps)
  local f = total % fps
  local h = math.floor(s / 3600); s = s % 3600
  local m = math.floor(s / 60);   s = s % 60
  return string.format("%02d:%02d:%02d:%02d", h, m, s, f)
end

-- Get timeline start timecode - try multiple methods
local startSetting = timeline:GetStartTimecode() or project:GetSetting("timelineStartTimecode")
if not startSetting or startSetting == "" then
  -- Try getting start frame and converting it
  local startFrame = timeline:GetStartFrame()
  if startFrame and startFrame > 0 then
    log("DEBUG: Using timeline:GetStartFrame() = %d", startFrame)
    tlStartFrame = startFrame
  else
    startSetting = "00:00:00:00"
    tlStartFrame = 0
  end
else
  log("DEBUG: Got startSetting = '%s'", tostring(startSetting))
  tlStartFrame = parseTCFlexible(startSetting)
  if not tlStartFrame then
    log("WARN: Couldn't parse timeline start '%s'. Using 00:00:00:00.", tostring(startSetting))
    tlStartFrame = 0
  end
end

-- Convert CSV timestamp (relative, e.g., "00:00") to offset frames from timeline start
local function csvTimeToOffsetFrames(csvTime)
  local f = parseTCFlexible(csvTime)
  assert(f ~= nil, ("Bad CSV time '%s'"):format(tostring(csvTime)))
  return f  -- CSV times are RELATIVE offsets (00:00 = start, 00:08 = 8 seconds in, etc.)
end

-- Convert offset to absolute TC
local function offsetToAbsTC(offsetFrames)
  return framesToTC(tlStartFrame + (offsetFrames or 0))
end

-- Find clip in media pool (case-insensitive substring match)
local function findClip(rootFolder, want)
  local w = string.lower(tostring(want or ""))
  local function walk(folder)
    for _, item in pairs(folder:GetClips() or {}) do
      local nm = item:GetName() or ""
      if nm == want or string.find(string.lower(nm), w, 1, true) then 
        return item 
      end
    end
    for _, sub in ipairs(folder:GetSubFolderList() or {}) do
      local r = walk(sub)
      if r then return r end
    end
    return nil
  end
  return walk(rootFolder)
end

-- Ensure video track exists
local function ensureTrack(index)
  local function getCount() return timeline:GetTrackCount("video") or 0 end
  while getCount() < index do
    assert(timeline:AddTrack("video"), "Failed to add video track")
  end
end

-- ── Import images ───────────────────────────────────────────────────────────
log("")
log("════════════════════════════════════════════════════════════════")
log("AUTO PLACEMENT - Timeline: %s", timeline:GetName() or "Current")
log("Timeline Start: %s (frame %d)", framesToTC(tlStartFrame), tlStartFrame)
log("FPS: %.2f", fps)
log("════════════════════════════════════════════════════════════════")
log("")
log("[1/3] Importing images from: %s", IMAGE_FOLDER)

local mediaStorage = resolve:GetMediaStorage()
local allFiles = mediaStorage:GetFileList(IMAGE_FOLDER)

assert(allFiles and #allFiles > 0, "No files found in image folder!")

-- Build list of expected image prefixes
local expectedNRs = {}
for _, img in ipairs(IMAGES) do
  expectedNRs[string.format("%03d", img.nr)] = true
end

-- Find matching images (support various extensions)
local imagePaths = {}
local foundPrefixes = {}
for _, filepath in ipairs(allFiles) do
  local filename = filepath:match("([^\\\\]+)$")
  if filename then
    local prefix = filename:sub(1, 3)
    if expectedNRs[prefix] then
      table.insert(imagePaths, filepath)
      foundPrefixes[prefix] = (foundPrefixes[prefix] or 0) + 1
    end
  end
end

log("  Found files for %d/%d image numbers", 
    #imagePaths > 0 and (function() local c=0; for _ in pairs(foundPrefixes) do c=c+1 end; return c end)() or 0, 
    #IMAGES)

-- Show which are missing
for _, img in ipairs(IMAGES) do
  local prefix = string.format("%03d", img.nr)
  if not foundPrefixes[prefix] then
    log("  ⚠️  Missing: %s_*.* (no file found)", prefix)
  end
end

assert(#imagePaths > 0, "No matching images found!")
log("")

-- Import to media pool
local root = media:GetRootFolder()
local importFolder = media:AddSubFolder(root, "Auto Imported " .. os.date("%H%M%S"))
if importFolder then media:SetCurrentFolder(importFolder) end

local importedClips = mediaStorage:AddItemListToMediaPool(imagePaths)
assert(importedClips and #importedClips > 0, "Failed to import images!")

log("  ✓ Imported %d clips to Media Pool", #importedClips)
log("")

-- Build clip lookup by NR (first 3 digits)
local clipsByNR = {}
for _, clip in ipairs(importedClips) do
  local clipName = clip:GetName()
  if clipName and #clipName >= 3 then
    local prefix = clipName:sub(1, 3)
    local nr = tonumber(prefix)
    if nr and nr >= 1 and nr <= #IMAGES then
      if clipsByNR[nr] then
        log("  ⚠️  Duplicate for #%03d: '%s' (using first found)", nr, clipName)
      else
        clipsByNR[nr] = clip
        log("  → Mapped #%03d to '%s'", nr, clipName)
      end
    end
  end
end
log("")

-- ── Build placement info ────────────────────────────────────────────────────
log("[2/3] Placing sequentially on timeline (Track V%d)...", VIDEO_TRACK)
log("")

ensureTrack(VIDEO_TRACK)

local placedCount = 0
for _, img in ipairs(IMAGES) do
  local mpItem = clipsByNR[img.nr]
  if not mpItem then
    log("  #%03d: ✗ MISSING (not found in media pool)", img.nr)
  else
    local startOffset = csvTimeToOffsetFrames(img.startTime)
    local endOffset = csvTimeToOffsetFrames(img.endTime)
    local duration = endOffset - startOffset

    -- Park playhead at absolute placement position
    timeline:SetCurrentTimecode(offsetToAbsTC(startOffset))

    -- Append a single item; Resolve may override endFrame for stills
    local ci = {
      mediaPoolItem = mpItem,
      mediaType     = 1,
      trackIndex    = VIDEO_TRACK,
      recordFrame   = startOffset,
      startFrame    = 0,
      endFrame      = 1, -- placeholder; Resolve sets default still duration
    }
    media:AppendToTimeline({ ci })

    -- Retry loop to find the placed item reliably
    local placedStart, placedEnd, targetEnd
    local placedItem
    local wantName = mpItem:GetName()
    targetEnd = startOffset + duration
    for attempt = 1, 10 do
      if bmd and bmd.wait then bmd.wait(50) end
      local items = timeline:GetItemListInTrack("video", VIDEO_TRACK) or {}
      for _, it in ipairs(items) do
        local s = it:GetStart(); local e = it:GetEnd()
        local mpi = it:GetMediaPoolItem(); local nm = mpi and mpi:GetName() or ""
        if nm == wantName and s and e and math.abs(s - startOffset) <= (fps or 24) then
          placedItem = it; placedStart = s; placedEnd = e; break
        end
      end
      if placedItem then break end
    end

    if placedItem then
      if placedEnd ~= targetEnd then
        local ok = placedItem:SetProperty("End", targetEnd)
        log("  #%03d '%s': start=%d end=%d → trim to %d (%s)", img.nr, wantName, placedStart, placedEnd, targetEnd, ok and "✓" or "✗")
      else
        log("  #%03d '%s': already correct (start=%d end=%d)", img.nr, wantName, placedStart, placedEnd)
      end
      placedCount = placedCount + 1
    else
      -- Fallback: append again to ensure presence, then move on
      media:AppendToTimeline({ ci })
      log("  #%03d '%s': re-appended due to not found on first pass", img.nr, wantName)
    end
  end
end

log("")
log("Placed %d/%d clips sequentially.", placedCount, #IMAGES)
log("")

-- Final verification (optional)
local verifyItems = timeline:GetItemListInTrack("video", VIDEO_TRACK) or {}
for _, img in ipairs(IMAGES) do
  local wantName = clipsByNR[img.nr] and clipsByNR[img.nr]:GetName() or ""
  local startOffset = csvTimeToOffsetFrames(img.startTime)
  local endOffset = csvTimeToOffsetFrames(img.endTime)
  for _, it in ipairs(verifyItems) do
    local s = it:GetStart(); local e = it:GetEnd()
    local mpi = it:GetMediaPoolItem(); local nm = mpi and mpi:GetName() or ""
    if nm == wantName and s and e and math.abs(s - startOffset) <= (fps or 24) and math.abs(e - endOffset) <= (fps or 24) then
      log("  ✓ #%03d '%s' verified: %s→%s", img.nr, wantName, framesToTC(s), framesToTC(e))
      break
    end
  end
end

log("")
log("════════════════════════════════════════════════════════════════")
log("✅ DONE! Sequential placement complete.")
log("════════════════════════════════════════════════════════════════")
`;
}
