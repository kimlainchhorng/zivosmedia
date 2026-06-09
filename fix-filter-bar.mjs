import { readFileSync, writeFileSync } from "node:fs";
const p = "src/pages/ReelsFeedPage.tsx";
let c = readFileSync(p, "utf8").replace(/\r\n/g, "\n");

// Find the closing of the tab bar section and add filter bar after it
// The tab bar ends with:
//   </div>
//   )}   <- closes {userId && (
//
// We want to insert the filter bar AFTER the tab bar but still inside {userId && (}
// Actually it's cleaner to add it after userId conditional, as a separate piece

// Find pattern: the end of the tab bar inside the userId block
// Looking at lines 2038-2041:
//   </button>
//   ))}
//   </div>
//   )}   <- closes {userId && (

const filterBar = `
                {/* Filter bar — all / photos / videos / text */}
                <div className="grid grid-cols-4 gap-1 px-2 pb-1.5 pt-1">
                  {(["all", "photos", "videos", "text"] as const).map((f) => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => setFeedFilter(f)}
                      aria-pressed={feedFilter === f}
                      className={cn(
                        "min-h-10 w-full px-2 py-2 rounded-full text-[11px] font-semibold capitalize transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                        feedFilter === f
                          ? "min-h-[40px] rounded-[1rem] px-6 bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                      )}
                    >
                      {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>`;

// Insert after the closing "  )}" of the tab bar (userId block end)
// The pattern we're looking for:
const searchStr = `                  )}
                </div>
              </div>
            </div>
          </div>`;

// We want to insert the filter bar before the closing </div> chain
// Find the tab bar section and insert after it
const tabBarEnd = `                  )}
                </div>`;

// Find it by its unique context (grid-cols-5 tab bar end)
const insertAfter = `                    </div>
                  )}`;

// Let's find where the tab bar closes: after grid-cols-5 div
const idx = c.indexOf('                    </div>\n                  )}\n                </div>\n              </div>\n            </div>\n          </div>');
if (idx !== -1) {
  const before = c.slice(0, idx + '                    </div>\n                  )}\n'.length);
  const after = c.slice(idx + '                    </div>\n                  )}\n'.length);
  c = before + filterBar + '\n' + after;
  writeFileSync(p, c, "utf8");
  console.log("Added filter bar to ReelsFeedPage.tsx");
} else {
  // Try another approach - find by unique content
  const tabBarClose = '                    </div>\n                  )}\n                </div>';
  const tabBarCloseIdx = c.indexOf(tabBarClose);
  if (tabBarCloseIdx !== -1) {
    const insertPos = tabBarCloseIdx + '                    </div>\n                  )}\n'.length;
    c = c.slice(0, insertPos) + filterBar + '\n' + c.slice(insertPos);
    writeFileSync(p, c, "utf8");
    console.log("Added filter bar (alt) to ReelsFeedPage.tsx");
  } else {
    console.error("Could not find insertion point");
    // Debug: find the FEED_TABS map section
    const mapIdx = c.indexOf('                    {FEED_TABS.map((label) => (');
    console.log("FEED_TABS.map found at index:", mapIdx);
    if (mapIdx !== -1) {
      console.log("Context:", JSON.stringify(c.slice(mapIdx, mapIdx+400)));
    }
  }
}
