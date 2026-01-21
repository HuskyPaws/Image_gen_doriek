-- DaVinci Resolve Lua Connection Test
print("============================================================")
print("DaVinci Resolve Lua Connection Test")
print("============================================================")
print("")

-- Get Resolve object (works in both free and studio)
local resolve = Resolve() or app:GetResolve()

if not resolve then
    print("ERROR: Could not connect to DaVinci Resolve")
    print("")
    print("Make sure:")
    print("  1. DaVinci Resolve is running")
    print("  2. External scripting is enabled:")
    print("     Settings → System → General → External scripting → Local")
    print("")
    return
end

print("✓✓✓ Connected to DaVinci Resolve!")
print("")

-- Get project manager
local projectManager = resolve:GetProjectManager()
local project = projectManager:GetCurrentProject()

if project then
    print("Project: " .. project:GetName())
    
    -- Get current timeline
    local timeline = project:GetCurrentTimeline()
    if timeline then
        print("Timeline: " .. timeline:GetName())
        
        -- Get timeline settings
        local fps = timeline:GetSetting("timelineFrameRate")
        local startFrame = timeline:GetStartFrame()
        
        print("FPS: " .. fps)
        print("Start Frame: " .. startFrame)
    else
        print("(No timeline open)")
    end
else
    print("(No project open)")
end

print("")
print("============================================================")
print("SUCCESS! Lua scripting works perfectly!")
print("============================================================")
































