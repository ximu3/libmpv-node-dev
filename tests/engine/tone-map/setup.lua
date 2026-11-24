local utils = require("mp.utils")
for _, pair in ipairs(scene.options) do
    assert(mp.set_property(pair[1], pair[2]))
end

local overlay
if scene.overlay then
    overlay = mp.create_osd_overlay("ass-events")
    overlay.res_x = 63
    overlay.res_y = 47
    overlay.z = 100
    overlay.data = "{\\an7\\pos(43,4)\\bord0\\shad0\\1c&H0000FF&\\1a&H40&\\p1}m 0 0 l 16 0 l 16 8 l 0 8"
    overlay:update()
end

mp.register_event("file-loaded", function()
    local selected = false
    for _, track in ipairs(mp.get_property_native("track-list")) do
        if track.type == "sub" and track.selected then selected = true end
    end
    assert(selected == (scene.subtitle ~= nil))
    local file = assert(io.open(scene.receipt, "w"))
    file:write(utils.format_json({
        primaries = mp.get_property("target-prim"),
        transfer = mp.get_property("target-trc"),
        peak = mp.get_property_native("target-peak"),
        toneMapping = mp.get_property("tone-mapping"),
        subtitle = selected,
        overlay = overlay ~= nil
    }))
    file:close()
end)

local options = { ["sub-auto"] = "no" }
if scene.subtitle then options["sub-file"] = scene.subtitle end
assert(mp.command_native({"loadfile", scene.source, "replace", -1, options}))
