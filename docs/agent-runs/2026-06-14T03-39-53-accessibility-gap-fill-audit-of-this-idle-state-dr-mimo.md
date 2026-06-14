# MiMo run — 2026-06-14T03:39:53.663Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Accessibility gap-fill audit of this idle-state draggable bottom sheet (driver app). Focus ONLY on additive non-visual a11y. Questions: 1) The drag handle near line 104 is a plain motion.div, drag-only — keyboard and screen-reader users cannot expand the sheet to reach the Where-to search and saved places. Note: the drag is on the OUTER motion.div near line 77 (drag=y, onDragEnd). Recommend an additive way to make the handle operable (role=button, tabIndex 0, aria-expanded bound to isExpanded, aria-label, onClick, onKeyDown for Enter/Space toggling setIsExpanded). Flag the risk that a trailing click after a drag double-toggles, and give a dragOccurredRef mitigation (set true in onDragStart on the outer motion.div, reset false in onPointerDown on the handle, early-return in onClick). 2) List the decorative lucide icons that should get aria-hidden true: Search at 140 (inside Where-to button with visible text), the saved-place Icon at 157, Clock at 180, ChevronUp at 202 (decorative bounce hint, pointer-events-none). 3) Reduced motion: the file does NOT import useReducedMotion. The handle pulse (line 107, width keyframes repeat Infinity), the ChevronUp bounce (line 199, y keyframes repeat Infinity), and the expanded-content fade (line 128). Which should be guarded and how (prop-gate animate/transition to undefined for the two perpetual loops; guard initial for the fade)? Note: the handle uses a ternary animate=isExpanded ? empty-object : keyframes — give the exact reduced-motion form. Do NOT suggest visual redesign, copy, routing, or layout changes. Give exact line plus attribute for each.
- files: src/components/map/IdleBottomSheet.tsx

---

I need to locate the exact file first. Let me find the driver app bottom sheet component.<tool_call>
<function=task>
<parameter=description>Find driver bottom sheet file</parameter>
<parameter=prompt>Search the codebase for the driver app bottom sheet component. It's a draggable bottom sheet with:
- A drag handle (motion.div) around line 104
- An outer motion.div with drag=y and onDragEnd around line 77
- A "Where-to" search button around line 140
- Saved places with an Icon around line 157
- A Clock icon around line 180
- A ChevronUp bounce animation around line 199-202
- A handle pulse animation around line 107
- An expanded-content fade around line 128

Look in directories like src/pages/driver/, src/pages/zivodriver/, src/components/driver/, or similar paths. Also check for any file with "BottomSheet" or "IdleSheet" or "DriverSheet" in the name. Search broadly - try grep for "Where.to" or "drag=y" or "isExpanded" in combination with "saved places" or "ChevronUp" patterns.

Return the FULL file path and FULL file contents.</parameter>
<parameter=subagent_type>explore</parameter>
</function>
</tool_call>
