const STORAGE_KEY = "zivo-employees-state-v2";
const LEGACY_STORAGE_KEY = "zivo-employees-state-v1";

const defaultSchedule = [
  { day: "Monday", shifts: [{ employee: "Nita Vong", time: "8 AM - 4 PM" }, { employee: "Dara Kim", time: "10 AM - 6 PM" }, { employee: "Sam Ath", time: "11 AM - 7 PM" }] },
  { day: "Tuesday", shifts: [{ employee: "Maly Sok", time: "9 AM - 5 PM" }, { employee: "Dara Kim", time: "10 AM - 6 PM" }, { employee: "Lina Sun", time: "Training" }] },
  { day: "Wednesday", shifts: [{ employee: "Nita Vong", time: "8 AM - 4 PM" }, { employee: "Sam Ath", time: "11 AM - 7 PM" }, { employee: "Ratan Srey", time: "1 PM - 7 PM" }] },
  { day: "Thursday", shifts: [{ employee: "Dara Kim", time: "10 AM - 6 PM" }, { employee: "Maly Sok", time: "9 AM - 5 PM" }] },
  { day: "Friday", shifts: [{ employee: "Nita Vong", time: "8 AM - 4 PM" }, { employee: "Ratan Srey", time: "1 PM - 7 PM" }, { employee: "Sam Ath", time: "11 AM - 7 PM" }] },
];

const defaultDocuments = [
  { id: 1, title: "Employee handbook", meta: "Version 2026.05", status: "Published", signedBy: [1, 2, 3, 5] },
  { id: 2, title: "NDA and data policy", meta: "6 pending signatures", status: "Needs review", signedBy: [1, 3] },
  { id: 3, title: "Payroll tax forms", meta: "All active employees", status: "Complete", signedBy: [1, 2, 3, 4, 5] },
  { id: 4, title: "Training checklist", meta: "New hire packet", status: "Draft", signedBy: [] },
];

const defaultTraining = [
  { id: 1, title: "ZIVO service standards", assignedTo: "All", due: "May 24", completedBy: [1, 2, 3] },
  { id: 2, title: "Privacy and data handling", assignedTo: "All", due: "May 26", completedBy: [1, 3] },
  { id: 3, title: "Driver support playbook", assignedTo: "Support", due: "May 29", completedBy: [2] },
  { id: 4, title: "New hire orientation", assignedTo: "Lina Sun", due: "May 30", completedBy: [] },
];

const defaultGoals = [
  { id: 1, employeeId: 1, title: "Close onboarding docs for new hires", progress: 70 },
  { id: 2, employeeId: 2, title: "Resolve support queue under 2 hours", progress: 55 },
  { id: 3, employeeId: 5, title: "Finish mobile QA smoke checklist", progress: 80 },
  { id: 4, employeeId: 6, title: "Complete first-week training", progress: 25 },
];

const defaultState = {
  isAuthenticated: false,
  currentRole: "manager",
  activeEmployeeId: 1,
  clockedIn: false,
  breakActive: false,
  clockStartedAt: null,
  breakStartedAt: null,
  requestFilter: "all",
  payrollPeriod: "Current cycle",
  scheduleWeek: "2026-W21",
  schedulePublished: false,
  selectedEmployeeId: 1,
  settings: {
    companyName: "ZIVO Employees",
    timezone: "America/Chicago",
    payPeriod: "Biweekly",
    managerPin: "1234",
    employeePin: "0000",
    managerApproval: true,
    payrollReminders: true,
    mobileClockIn: false,
  },
  clockEvents: [
    { title: "Nita clocked in", meta: "Today, 8:02 AM" },
    { title: "Ratan break ended", meta: "Today, 10:44 AM" },
    { title: "Maly submitted timesheet", meta: "Yesterday, 5:31 PM" },
  ],
  employees: [
    { id: 1, name: "Nita Vong", role: "Employee success lead", department: "Operations", location: "Phnom Penh", status: "Active", manager: "Vireak", nextShift: "Today, 8 AM - 4 PM", payRate: 28, phone: "+855 12 000 101" },
    { id: 2, name: "Dara Kim", role: "Driver support specialist", department: "Support", location: "Siem Reap", status: "Active", manager: "Nita", nextShift: "Today, 10 AM - 6 PM", payRate: 22, phone: "+855 12 000 102" },
    { id: 3, name: "Maly Sok", role: "Payroll coordinator", department: "Finance", location: "Remote", status: "Active", manager: "Vireak", nextShift: "Tomorrow, 9 AM - 5 PM", payRate: 30, phone: "+855 12 000 103" },
    { id: 4, name: "Ratan Srey", role: "Restaurant onboarding", department: "Growth", location: "Battambang", status: "On leave", manager: "Nita", nextShift: "Friday, 1 PM - 7 PM", payRate: 24, phone: "+855 12 000 104" },
    { id: 5, name: "Sam Ath", role: "Mobile QA analyst", department: "Engineering", location: "Phnom Penh", status: "Active", manager: "Maly", nextShift: "Today, 11 AM - 7 PM", payRate: 32, phone: "+855 12 000 105" },
    { id: 6, name: "Lina Sun", role: "People operations assistant", department: "Operations", location: "Remote", status: "Pending", manager: "Vireak", nextShift: "Onboarding pending", payRate: 20, phone: "+855 12 000 106" },
  ],
  requests: [
    { id: 1, person: "Ratan Srey", title: "Leave request", detail: "May 27 - May 29, family travel", status: "Open" },
    { id: 2, person: "Dara Kim", title: "Schedule swap", detail: "Swap Thursday evening with Friday morning", status: "Open" },
    { id: 3, person: "Lina Sun", title: "Equipment request", detail: "Laptop and mobile test device", status: "Open" },
  ],
  payrollChecks: [
    { label: "Timesheets reviewed", done: true },
    { label: "Overtime approved", done: true },
    { label: "New hires verified", done: false },
    { label: "Finance export sent", done: false },
  ],
  timesheets: [
    { id: 1, employeeId: 1, type: "Clocked in", at: "Today, 8:02 AM" },
    { id: 2, employeeId: 2, type: "Clocked in", at: "Today, 10:00 AM" },
    { id: 3, employeeId: 4, type: "Break ended", at: "Today, 10:44 AM" },
    { id: 4, employeeId: 3, type: "Timesheet submitted", at: "Yesterday, 5:31 PM" },
  ],
  announcements: [
    { title: "Payroll closes Friday", meta: "Managers should finish reviews before 5 PM." },
    { title: "Mobile clock-in pilot", meta: "Enabled for selected teams after supervisor approval." },
    { title: "New hire checklist", meta: "Lina Sun still needs onboarding documents." },
  ],
  notifications: [
    { id: 1, title: "Schedule ready", meta: "This week’s schedule is ready for review.", read: false, view: "schedule" },
    { id: 2, title: "Request queue", meta: "3 employee requests need a decision.", read: false, view: "requests" },
    { id: 3, title: "Training due", meta: "Privacy and data handling is due soon.", read: false, view: "training" },
  ],
  training: clone(defaultTraining),
  goals: clone(defaultGoals),
  onboarding: [
    { id: 1, label: "Profile created", doneBy: [1, 2, 3, 4, 5, 6] },
    { id: 2, label: "Documents signed", doneBy: [1, 2, 3, 5] },
    { id: 3, label: "First shift assigned", doneBy: [1, 2, 3, 4, 5] },
    { id: 4, label: "Training complete", doneBy: [1, 2, 3] },
  ],
  schedule: clone(defaultSchedule),
  documents: clone(defaultDocuments),
};

let state = loadState();
let currentView = "dashboard";
let searchTerm = "";
let statusFilter = "all";
let departmentFilter = "all";
let documentCategoryFilter = "all";
let employeeProfileTab = "info";

const viewTitles = {
  dashboard: "Dashboard",
  employees: "Employees",
  schedule: "Schedule",
  timeclock: "Time clock",
  payroll: "Payroll",
  requests: "Requests",
  documents: "Documents",
  training: "Training",
  reports: "Reports",
  settings: "Settings",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return normalizeState(stored ? JSON.parse(stored) : {});
  } catch {
    return normalizeState({});
  }
}

function normalizeState(stored) {
  const next = { ...clone(defaultState), ...stored };
  next.settings = { ...clone(defaultState.settings), ...(stored.settings || {}) };
	  next.employees = (Array.isArray(stored.employees) ? stored.employees : defaultState.employees).map((employee, index) => ({
	    id: employee.id || index + 1,
	    manager: "Unassigned",
	    payRate: 22,
	    phone: "",
	    hireDate: "",
	    emergencyContact: "",
	    availability: "Weekdays",
	    notes: "",
	    ...employee,
	  }));
  next.requests = Array.isArray(stored.requests) ? stored.requests : clone(defaultState.requests);
  next.payrollChecks = Array.isArray(stored.payrollChecks) ? stored.payrollChecks : clone(defaultState.payrollChecks);
  next.schedule = normalizeSchedule(stored.schedule);
	  next.documents = (Array.isArray(stored.documents) ? stored.documents : clone(defaultDocuments)).map((document) => ({
	    signedBy: [],
	    category: "Policy",
	    fileName: "",
	    dueDate: "",
	    ...document,
	  }));
	  next.timesheets = (Array.isArray(stored.timesheets) ? stored.timesheets : clone(defaultState.timesheets)).map((entry) => ({
	    approved: false,
	    ...entry,
	  }));
  next.announcements = Array.isArray(stored.announcements) ? stored.announcements : clone(defaultState.announcements);
  next.notifications = Array.isArray(stored.notifications) ? stored.notifications : clone(defaultState.notifications);
  next.training = (Array.isArray(stored.training) ? stored.training : clone(defaultTraining)).map((module) => ({
    completedBy: [],
    ...module,
  }));
  next.goals = Array.isArray(stored.goals) ? stored.goals : clone(defaultGoals);
  next.onboarding = (Array.isArray(stored.onboarding) ? stored.onboarding : clone(defaultState.onboarding)).map((item) => ({
    doneBy: [],
    ...item,
  }));
  if (!next.employees.some((employee) => employee.id === next.selectedEmployeeId)) {
    next.selectedEmployeeId = next.employees[0]?.id || null;
  }
  if (!next.employees.some((employee) => employee.id === next.activeEmployeeId)) {
    next.activeEmployeeId = next.employees[0]?.id || null;
  }
  if (next.currentRole !== "employee") next.currentRole = "manager";
  return next;
}

function normalizeSchedule(schedule) {
  if (!Array.isArray(schedule)) return clone(defaultSchedule);
  return schedule.map((day) => ({
    day: day.day,
    shifts: (day.shifts || []).map((shift) => Array.isArray(shift)
      ? { employee: shift[0], time: shift[1] }
      : { employee: shift.employee, time: shift.time }),
  }));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function statusClass(status) {
	  if (status === "On leave") return "leave";
	  if (status === "Pending") return "pending";
	  if (status === "Declined") return "pending";
	  if (status === "Archived") return "muted-status";
	  return "";
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function getEmployeeById(id) {
  return state.employees.find((employee) => employee.id === Number(id));
}

function activeEmployee() {
  return getEmployeeById(state.activeEmployeeId) || state.employees[0];
}

function isManager() {
  return state.currentRole === "manager";
}

function visibleEmployees() {
  return isManager() ? filteredEmployees() : state.employees.filter((employee) => employee.id === state.activeEmployeeId);
}

function formatMoney(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

function downloadText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseEmployeesCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  let nextEmployeeId = nextId(state.employees);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    if (!row.name) return null;
    return {
      id: nextEmployeeId++,
      name: row.name,
      role: row.role || "Team member",
      department: row.department || "Operations",
      location: row.location || "Remote",
      status: row.status || "Pending",
      manager: row.manager || "Unassigned",
      nextShift: row.nextshift || row.next_shift || "Onboarding pending",
      payRate: Number(row.payrate || row.pay_rate || 20),
      phone: row.phone || "",
    };
  }).filter(Boolean);
}

function exportWorkspaceData() {
  downloadText("zivo-employees-data.json", JSON.stringify(state, null, 2), "application/json");
  showToast("Workspace data exported");
}

function restoreWorkspaceData(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.employees)) {
    throw new Error("Backup must include employees.");
  }
  state = normalizeState({ ...parsed, isAuthenticated: true });
  saveState();
}

function addNotification(title, meta, view = "dashboard") {
  state.notifications.unshift({ id: nextId(state.notifications), title, meta, view, read: false });
  state.notifications = state.notifications.slice(0, 20);
}

function requireConfirmation(message) {
  return window.confirm(message);
}

function printableWindow(title, html) {
  const popup = window.open("", "_blank");
  if (!popup) return;
  popup.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px;color:#171a22}
          table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #dce2eb;padding:10px}
          h1{font-size:22px}
        </style>
      </head>
      <body><h1>${escapeHtml(title)}</h1>${html}</body>
    </html>
  `);
  popup.document.close();
  popup.print();
}

function payrollRows() {
  return state.employees.map((employee) => {
    const baseHours = employee.status === "Active" ? 80 : employee.status === "On leave" ? 24 : 0;
    const periodOffset = state.payrollPeriod === "Next cycle" ? -4 : state.payrollPeriod === "Last cycle" ? 2 : 0;
    const hours = Math.max(0, baseHours + periodOffset);
    const overtime = Math.max(0, hours - 80);
    const regularHours = hours - overtime;
    const rate = employee.payRate || 22;
    const gross = (regularHours * rate) + (overtime * rate * 1.5);
    return {
      name: employee.name,
      department: employee.department,
      hours,
      overtime,
      rate,
      gross,
      status: employee.status === "Pending" ? "Hold" : "Ready",
    };
  });
}

function scheduleWarnings() {
  const warnings = [];
  state.schedule.forEach((day) => {
    const counts = day.shifts.reduce((map, shift) => {
      map[shift.employee] = (map[shift.employee] || 0) + 1;
      return map;
    }, {});
    Object.entries(counts).forEach(([employee, count]) => {
      if (count > 1) warnings.push(`${employee} has ${count} shifts on ${day.day}.`);
    });
    day.shifts.forEach((shift) => {
      const employee = state.employees.find((person) => person.name === shift.employee);
      if (employee?.availability && !employee.availability.toLowerCase().includes("weekday") && !employee.availability.toLowerCase().includes(day.day.toLowerCase())) {
        warnings.push(`${employee.name} may be unavailable on ${day.day}.`);
      }
    });
  });
  return warnings;
}

function trainingApplies(module, employee = activeEmployee()) {
  return module.assignedTo === "All" || module.assignedTo === employee?.name || module.assignedTo === employee?.department;
}

function completionPercent(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function departmentRows() {
  const departments = [...new Set(state.employees.map((employee) => employee.department))].sort();
  return departments.map((department) => {
    const people = state.employees.filter((employee) => employee.department === department);
    const active = people.filter((employee) => employee.status === "Active").length;
    const openRequests = state.requests.filter((request) => {
      const employee = state.employees.find((person) => person.name === request.person);
      return employee?.department === department && request.status === "Open";
    }).length;
    const trainingDone = state.training.filter((module) => module.assignedTo === "All" || module.assignedTo === department).reduce((sum, module) => {
      return sum + people.filter((employee) => module.completedBy.includes(employee.id)).length;
    }, 0);
    const trainingTotal = state.training.filter((module) => module.assignedTo === "All" || module.assignedTo === department).length * people.length;
    return { department, people: people.length, active, openRequests, training: completionPercent(trainingDone, trainingTotal) };
  });
}

function managerAlerts() {
  const pendingTimesheets = state.timesheets.filter((entry) => !entry.approved).length;
  const unsignedDocs = state.documents.reduce((sum, document) => sum + Math.max(0, state.employees.length - (document.signedBy?.length || 0)), 0);
  const pendingRequests = state.requests.filter((request) => request.status === "Open").length;
  const pendingPayroll = state.payrollChecks.filter((check) => !check.done).length;
  const warnings = scheduleWarnings().length;
  return [
    ["Missing approvals", `${pendingTimesheets} time entries`, "timeclock", pendingTimesheets],
    ["Unsigned documents", `${unsignedDocs} signatures`, "documents", unsignedDocs],
    ["Open requests", `${pendingRequests} requests`, "requests", pendingRequests],
    ["Payroll issues", `${pendingPayroll} checklist items`, "payroll", pendingPayroll],
    ["Schedule warnings", `${warnings} warnings`, "schedule", warnings],
  ].filter((alert) => alert[3] > 0);
}

function timesheetDetailRows() {
  return state.employees.map((employee) => {
    const entries = state.timesheets.filter((entry) => entry.employeeId === employee.id);
    const clockIns = entries.filter((entry) => entry.type === "Clocked in").length;
    const clockOuts = entries.filter((entry) => entry.type === "Clocked out").length;
    const breaks = entries.filter((entry) => String(entry.type).includes("Break")).length;
    const approved = entries.filter((entry) => entry.approved).length;
    return { employee, entries: entries.length, clockIns, clockOuts, breaks, approved };
  }).filter((row) => isManager() || row.employee.id === state.activeEmployeeId);
}

function renderAccessControls() {
  $$("[data-role-switch]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.roleSwitch === state.currentRole);
  });

  $("#active-employee-select").innerHTML = state.employees.map((employee) => (
    `<option value="${employee.id}" ${employee.id === state.activeEmployeeId ? "selected" : ""}>${escapeHtml(employee.name)}</option>`
  )).join("");

  const managerOnly = isManager();
  $("#open-add-employee").hidden = !managerOnly;
  $("#export-data").hidden = !managerOnly;
  $("#open-shift-dialog").hidden = !managerOnly;
  $("#publish-schedule").hidden = !managerOnly;
  $("#approve-payroll").hidden = !managerOnly;
  $("#export-payroll").hidden = !managerOnly;
  $("#open-document-dialog").hidden = !managerOnly;
	  $("#open-training-dialog").hidden = !managerOnly;
	  $("#open-goal-dialog").hidden = !managerOnly;
	  $("#reset-demo-data").hidden = !managerOnly;
	  $("#save-company-settings").hidden = !managerOnly;
	  $("#import-employees").hidden = !managerOnly;
	  $("#download-template").hidden = !managerOnly;
	  $("#restore-backup").hidden = !managerOnly;
	  $("#copy-week").hidden = !managerOnly;
	  $("#approve-timesheets").hidden = !managerOnly;
	  $("#global-search").placeholder = managerOnly ? "Search team" : "Search my workspace";
	  $("#login-screen").classList.toggle("is-hidden", Boolean(state.isAuthenticated));
}

function renderMetrics() {
  const active = state.employees.filter((employee) => employee.status === "Active").length;
  const people = isManager() ? state.employees : state.employees.filter((employee) => employee.id === state.activeEmployeeId);
  const onShift = people.filter((employee) => employee.nextShift.includes("Today")).length;
  const openRequests = state.requests.filter((request) => request.status === "Open" && (isManager() || request.person === activeEmployee()?.name)).length;
  const doneChecks = state.payrollChecks.filter((check) => check.done).length;
  const progress = Math.round((doneChecks / state.payrollChecks.length) * 100);

  $("#metric-active").textContent = isManager() ? active : activeEmployee()?.status || "Ready";
  $("#metric-shift").textContent = onShift;
  $("#metric-requests").textContent = openRequests;
  $("#metric-payroll").textContent = `${progress}%`;
  $("#request-count-label").textContent = `${openRequests} open`;
	  $("#payroll-progress-copy").textContent = `${progress}%`;
	  $("#payroll-progress-bar").style.width = `${progress}%`;
	  $("#payroll-total").textContent = formatMoney(payrollRows().reduce((sum, row) => sum + row.gross, 0));
}

function renderTimeline() {
  const todayShifts = (isManager() ? state.employees : state.employees.filter((employee) => employee.id === state.activeEmployeeId))
    .filter((employee) => employee.nextShift.includes("Today"))
    .map((employee) => {
      const time = employee.nextShift.replace("Today, ", "");
      return `
        <article class="timeline-item">
          <span class="timeline-time">${escapeHtml(time)}</span>
          <div>
            <h3>${escapeHtml(employee.name)}</h3>
            <p class="muted">${escapeHtml(employee.role)}</p>
          </div>
          <span class="department-pill">${escapeHtml(employee.department)}</span>
        </article>
      `;
    })
    .join("");
  $("#dashboard-timeline").innerHTML = todayShifts || `<p class="muted">No shifts scheduled today.</p>`;

  const queueItems = isManager()
    ? [
      ["Approve payroll checklist", `${state.payrollChecks.filter((check) => !check.done).length} items left`, "payroll"],
      ["Review open employee requests", `${state.requests.filter((request) => request.status === "Open").length} open`, "requests"],
      ["Finish onboarding packet", "Lina Sun", "employees"],
    ]
    : [
      ["Clock in for shift", state.clockedIn ? "Shift already active" : activeEmployee()?.nextShift || "No shift", "timeclock"],
      ["Review documents", `${state.documents.filter((document) => !document.signedBy?.includes(state.activeEmployeeId)).length} need action`, "documents"],
      ["Submit a request", "Leave, schedule, payroll, or equipment", "requests"],
    ];

  $("#manager-queue").innerHTML = queueItems.map(([title, meta, view]) => `
    <article class="queue-item">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p class="muted">${escapeHtml(meta)}</p>
      </div>
      <button class="mini-button" type="button" data-view-link="${view}">Open</button>
    </article>
  `).join("");

  const alerts = isManager()
    ? managerAlerts()
    : [
      ["My documents", `${state.documents.filter((document) => !document.signedBy?.includes(state.activeEmployeeId)).length} to sign`, "documents", 1],
      ["My training", `${state.training.filter((module) => trainingApplies(module) && !module.completedBy.includes(state.activeEmployeeId)).length} open`, "training", 1],
      ["My time", state.clockedIn ? "Shift running" : "Ready to clock in", "timeclock", 1],
    ];
  $("#alert-count-label").textContent = `${alerts.length} alert${alerts.length === 1 ? "" : "s"}`;
  $("#manager-alerts").innerHTML = alerts.map(([title, meta, view]) => `
    <button class="alert-item" type="button" data-view-link="${view}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(meta)}</span>
    </button>
  `).join("") || `<p class="muted">No action items right now.</p>`;
}

function renderQuickActions() {
  $("#workspace-mode-title").textContent = isManager() ? "Manager mode" : "Employee mode";
  const actions = isManager()
    ? [
      ["Add employee", "Create a new staff profile", "employees", "open-add-employee"],
      ["Add shift", "Build and publish coverage", "schedule", "open-shift-dialog"],
      ["Review requests", `${state.requests.filter((request) => request.status === "Open").length} open`, "requests", ""],
      ["Export data", "Download local backup", "settings", "export-all-data"],
    ]
    : [
      ["Clock in", state.clockedIn ? "Active shift running" : "Start today’s shift", "timeclock", "clock-toggle"],
      ["New request", "Ask for time off or help", "requests", "open-request-dialog"],
      ["My profile", activeEmployee()?.name || "Employee", "employees", ""],
      ["Documents", "Sign or review policies", "documents", ""],
    ];

  $("#quick-actions").innerHTML = actions.map(([title, meta, view, actionId]) => `
    <button class="quick-action" type="button" data-view-link="${view}" ${actionId ? `data-click-target="${actionId}"` : ""}>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(meta)}</span>
    </button>
  `).join("");

  $("#announcement-list").innerHTML = state.announcements.map((announcement) => `
    <article class="activity-item">
      <h3>${escapeHtml(announcement.title)}</h3>
      <p class="muted">${escapeHtml(announcement.meta)}</p>
    </article>
  `).join("");
}

function filteredEmployees() {
  const term = searchTerm.trim().toLowerCase();
  return state.employees.filter((employee) => {
    const text = [employee.name, employee.role, employee.department, employee.location, employee.manager].join(" ").toLowerCase();
    const matchesTerm = !term || text.includes(term);
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || employee.department === departmentFilter;
    return matchesTerm && matchesStatus && matchesDepartment;
  });
}

function renderDepartmentFilter() {
  const select = $("#department-filter");
  const departments = [...new Set(state.employees.map((employee) => employee.department))].sort();
  select.innerHTML = `<option value="all">All departments</option>` + departments.map((department) => (
    `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`
  )).join("");
  select.value = departmentFilter;
}

function renderEmployeeOptions() {
  const options = state.employees.map((employee) => `<option value="${escapeHtml(employee.name)}">${escapeHtml(employee.name)}</option>`).join("");
  const idOptions = state.employees.map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`).join("");
  const active = activeEmployee();
	  $("#shift-employee-options").innerHTML = options;
	  $("#punch-employee-options").innerHTML = isManager()
	    ? idOptions
	    : `<option value="${active?.id || ""}">${escapeHtml(active?.name || "Employee")}</option>`;
  $("#request-employee-options").innerHTML = isManager()
    ? options
    : `<option value="${escapeHtml(active?.name || "")}">${escapeHtml(active?.name || "Employee")}</option>`;
  $("#training-employee-options").innerHTML = `<option>All</option><option>Operations</option><option>Support</option><option>Finance</option><option>Growth</option><option>Engineering</option>${options}`;
  $("#goal-employee-options").innerHTML = isManager()
    ? idOptions
    : `<option value="${active?.id || ""}">${escapeHtml(active?.name || "Employee")}</option>`;
}

function renderEmployees() {
  const employees = visibleEmployees();
  $("#employee-grid").innerHTML = employees.map((employee) => `
    <article class="employee-card ${employee.id === state.selectedEmployeeId ? "is-selected" : ""}" data-employee-id="${employee.id}">
      <div class="employee-head">
        <div class="avatar" aria-hidden="true">${escapeHtml(initials(employee.name))}</div>
        <div>
          <h3>${escapeHtml(employee.name)}</h3>
          <p class="muted">${escapeHtml(employee.role)}</p>
        </div>
        <span class="status-badge ${statusClass(employee.status)}">${escapeHtml(employee.status)}</span>
      </div>
      <span class="department-pill">${escapeHtml(employee.department)}</span>
      <div class="employee-meta">
        <span><strong>Location</strong><br />${escapeHtml(employee.location)}</span>
        <span><strong>Manager</strong><br />${escapeHtml(employee.manager)}</span>
        <span><strong>Next shift</strong><br />${escapeHtml(employee.nextShift)}</span>
        <span><strong>Profile</strong><br />Ready</span>
      </div>
      <div class="card-actions">
        <button class="mini-button" type="button" data-employee-select="${employee.id}">View</button>
        ${isManager() ? `<button class="mini-button" type="button" data-employee-toggle="${employee.id}">${employee.status === "Active" ? "Put on leave" : "Activate"}</button>` : ""}
      </div>
    </article>
  `).join("") || `<section class="panel"><p class="muted">No employees match this view.</p></section>`;
  renderEmployeeDetail();
}

function renderEmployeeDetail() {
  const employee = isManager()
    ? getEmployeeById(state.selectedEmployeeId) || filteredEmployees()[0] || state.employees[0]
    : activeEmployee();
  if (!employee) {
    $("#employee-detail").innerHTML = `<p class="muted">Add an employee to start building the team.</p>`;
    return;
	  }
	  state.selectedEmployeeId = employee.id;
	  const profileTabs = [
	    ["info", "Info"],
	    ["schedule", "Schedule"],
	    ["payroll", "Payroll"],
	    ["documents", "Docs"],
	    ["training", "Training"],
	    ["notes", "Notes"],
	  ];
	  const employeeDocs = state.documents.filter((document) => document.signedBy?.includes(employee.id));
	  const employeeTraining = state.training.filter((module) => trainingApplies(module, employee));
	  const employeeTime = state.timesheets.filter((entry) => entry.employeeId === employee.id);
	  const employeePayroll = payrollRows().find((row) => row.name === employee.name);
	  $("#employee-detail").innerHTML = `
	    <p class="eyebrow">Profile</p>
	    <div class="employee-detail-head">
      <div class="avatar large" aria-hidden="true">${escapeHtml(initials(employee.name))}</div>
      <div>
        <h2>${escapeHtml(employee.name)}</h2>
	        <p class="muted">${escapeHtml(employee.role)}</p>
	      </div>
	    </div>
	    <div class="profile-tabs" role="tablist" aria-label="Employee profile sections">
	      ${profileTabs.map(([tab, label]) => `
	        <button class="${employeeProfileTab === tab ? "is-selected" : ""}" type="button" data-profile-tab="${tab}">${escapeHtml(label)}</button>
	      `).join("")}
	    </div>
	    ${employeeProfileTab === "info" ? `
	      <div class="detail-list">
	        <span><strong>Department</strong>${escapeHtml(employee.department)}</span>
	        <span><strong>Location</strong>${escapeHtml(employee.location)}</span>
	        <span><strong>Manager</strong>${escapeHtml(employee.manager)}</span>
	        <span><strong>Next shift</strong>${escapeHtml(employee.nextShift)}</span>
	        <span><strong>Phone</strong>${escapeHtml(employee.phone || "Not set")}</span>
	        <span><strong>Hire date</strong>${escapeHtml(employee.hireDate || "Not set")}</span>
	      </div>
	    ` : ""}
	    ${employeeProfileTab === "schedule" ? `
	      <div class="detail-list">
	        <span><strong>Availability</strong>${escapeHtml(employee.availability || "Weekdays")}</span>
	        <span><strong>Next shift</strong>${escapeHtml(employee.nextShift)}</span>
	        <span><strong>This week</strong>${state.schedule.filter((day) => day.shifts.some((shift) => shift.employee === employee.name)).length} scheduled days</span>
	      </div>
	    ` : ""}
	    ${employeeProfileTab === "payroll" ? `
	      <div class="detail-list">
	        <span><strong>Rate</strong>${formatMoney(employee.payRate || 0)}/hr</span>
	        <span><strong>Hours</strong>${employeePayroll?.hours || 0}</span>
	        <span><strong>Overtime</strong>${employeePayroll?.overtime || 0}</span>
	        <span><strong>Gross</strong>${formatMoney(employeePayroll?.gross || 0)}</span>
	      </div>
	    ` : ""}
	    ${employeeProfileTab === "documents" ? `
	      <div class="detail-list">
	        <span><strong>Signed</strong>${employeeDocs.length}/${state.documents.length}</span>
	        <span><strong>Open</strong>${Math.max(0, state.documents.length - employeeDocs.length)}</span>
	      </div>
	      <div class="mini-list">${state.documents.map((document) => `<span>${document.signedBy?.includes(employee.id) ? "Signed" : "Open"} - ${escapeHtml(document.title)}</span>`).join("")}</div>
	    ` : ""}
	    ${employeeProfileTab === "training" ? `
	      <div class="detail-list">
	        <span><strong>Assigned</strong>${employeeTraining.length}</span>
	        <span><strong>Complete</strong>${employeeTraining.filter((module) => module.completedBy.includes(employee.id)).length}</span>
	      </div>
	      <div class="mini-list">${employeeTraining.map((module) => `<span>${module.completedBy.includes(employee.id) ? "Done" : "Open"} - ${escapeHtml(module.title)}</span>`).join("") || "<span>No training assigned</span>"}</div>
	    ` : ""}
	    ${employeeProfileTab === "notes" ? `
	      <div class="detail-list">
	        <span><strong>Emergency</strong>${escapeHtml(employee.emergencyContact || "Not set")}</span>
	        <span><strong>Time entries</strong>${employeeTime.length}</span>
	      </div>
	      <p class="muted">${escapeHtml(employee.notes || "No notes yet.")}</p>
	    ` : ""}
	    ${isManager() ? `
	      <label class="select-label detail-select">
	        Status
        <select data-employee-status="${employee.id}">
	          <option ${employee.status === "Active" ? "selected" : ""}>Active</option>
	          <option ${employee.status === "On leave" ? "selected" : ""}>On leave</option>
	          <option ${employee.status === "Pending" ? "selected" : ""}>Pending</option>
	          <option ${employee.status === "Archived" ? "selected" : ""}>Archived</option>
	        </select>
      </label>
	      <div class="detail-edit-grid">
	        <label>Name<input data-employee-field="name" data-employee-id="${employee.id}" value="${escapeHtml(employee.name)}" /></label>
	        <label>Role<input data-employee-field="role" data-employee-id="${employee.id}" value="${escapeHtml(employee.role)}" /></label>
	        <label>Department<input data-employee-field="department" data-employee-id="${employee.id}" value="${escapeHtml(employee.department)}" /></label>
	        <label>Location<input data-employee-field="location" data-employee-id="${employee.id}" value="${escapeHtml(employee.location)}" /></label>
	        <label>Manager<input data-employee-field="manager" data-employee-id="${employee.id}" value="${escapeHtml(employee.manager)}" /></label>
	        <label>Next shift<input data-employee-field="nextShift" data-employee-id="${employee.id}" value="${escapeHtml(employee.nextShift)}" /></label>
	        <label>Phone<input data-employee-field="phone" data-employee-id="${employee.id}" value="${escapeHtml(employee.phone || "")}" /></label>
	        <label>Emergency contact<input data-employee-field="emergencyContact" data-employee-id="${employee.id}" value="${escapeHtml(employee.emergencyContact || "")}" /></label>
	        <label>Availability<input data-employee-field="availability" data-employee-id="${employee.id}" value="${escapeHtml(employee.availability || "Weekdays")}" /></label>
	        <label>Hire date<input data-employee-field="hireDate" data-employee-id="${employee.id}" type="date" value="${escapeHtml(employee.hireDate || "")}" /></label>
	        <label>Pay rate<input data-employee-field="payRate" data-employee-id="${employee.id}" type="number" min="0" value="${employee.payRate || 22}" /></label>
	        <label class="form-span">Notes<textarea data-employee-field="notes" data-employee-id="${employee.id}" rows="3">${escapeHtml(employee.notes || "")}</textarea></label>
	      </div>
	      <div class="card-actions profile-actions">
	        <button class="mini-button" type="button" data-employee-archive="${employee.id}">${employee.status === "Archived" ? "Restore" : "Archive"}</button>
	        <button class="mini-button danger-button" type="button" data-employee-delete="${employee.id}">Delete</button>
	      </div>
	    ` : `
      <button class="secondary-button wide" type="button" data-view-link="requests">Submit request</button>
    `}
  `;
}

function renderSchedule() {
  const active = activeEmployee();
	  $("#schedule-week").value = state.scheduleWeek || defaultState.scheduleWeek;
	  $("#schedule-status").innerHTML = state.schedulePublished
	    ? `<span class="status-dot"></span> Published to employees`
	    : `<span class="status-dot draft-dot"></span> Draft schedule, not published`;
	  const warnings = scheduleWarnings();
	  $("#schedule-alerts").innerHTML = warnings.length
	    ? warnings.map((warning) => `<span class="status-badge pending">${escapeHtml(warning)}</span>`).join("")
	    : `<span class="status-badge">No schedule conflicts</span>`;

  $("#schedule-board").innerHTML = state.schedule.map((day) => `
    <section class="schedule-day">
      <h3>${escapeHtml(day.day)}</h3>
      ${day.shifts
        .map((shift, shiftIndex) => ({ ...shift, shiftIndex }))
        .filter((shift) => isManager() || shift.employee === active?.name)
        .map((shift) => `
        <article class="shift-card">
          <strong>${escapeHtml(shift.employee)}</strong>
          <span class="muted">${escapeHtml(shift.time)}</span>
          ${isManager() ? `<button class="mini-button tiny-button" type="button" data-remove-shift="${escapeHtml(day.day)}:${shift.shiftIndex}">Remove</button>` : ""}
        </article>
      `).join("") || `<p class="muted">No shifts</p>`}
    </section>
  `).join("");

  $("#calendar-grid").innerHTML = state.schedule.map((day) => {
    const visibleShifts = day.shifts.filter((shift) => isManager() || shift.employee === active?.name);
    return `
      <article class="calendar-day">
        <strong>${escapeHtml(day.day.slice(0, 3))}</strong>
        <span>${visibleShifts.length} shift${visibleShifts.length === 1 ? "" : "s"}</span>
        ${visibleShifts.slice(0, 2).map((shift) => `<small>${escapeHtml(shift.employee)} ${escapeHtml(shift.time)}</small>`).join("")}
      </article>
    `;
  }).join("");
}

function renderClock() {
  const active = activeEmployee();
  $("#clock-status").textContent = state.clockedIn ? "Active shift in progress" : "No active shift";
  $("#clock-toggle").innerHTML = state.clockedIn
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7V7Z" /></svg>Clock out`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5Z" /></svg>Clock in`;
  $("#break-toggle").disabled = !state.clockedIn;
  $("#break-toggle").innerHTML = state.breakActive
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5Z" /></svg>End break`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" /></svg>Start break`;

  const relevantEvents = isManager()
    ? state.timesheets
    : state.timesheets.filter((event) => event.employeeId === active?.id);

	  $("#clock-summary").innerHTML = `
	    <span><strong>${escapeHtml(active?.name || "Employee")}</strong> Active account</span>
	    <span><strong>${state.clockedIn ? "Running" : "Stopped"}</strong> Shift status</span>
	    <span><strong>${state.breakActive ? "On break" : "Available"}</strong> Break status</span>
	    <span><strong>${relevantEvents.filter((event) => event.approved).length}/${relevantEvents.length}</strong> Approved</span>
	  `;

	  $("#clock-activity").innerHTML = relevantEvents.map((event) => `
	    <article class="activity-item">
	      <div>
	        <h3>${escapeHtml(event.type || event.title)}</h3>
	        <p class="muted">${escapeHtml(event.at || event.meta)}${event.employeeId ? ` • ${escapeHtml(getEmployeeById(event.employeeId)?.name || "Employee")}` : ""}</p>
	      </div>
	      <div class="request-actions">
	        <span class="status-badge ${event.approved ? "" : "pending"}">${event.approved ? "Approved" : "Pending"}</span>
	        ${isManager() && !event.approved ? `<button class="mini-button" type="button" data-timesheet-approve="${event.id}">Approve</button>` : ""}
	      </div>
	    </article>
	  `).join("");
	  $("#timesheet-detail").innerHTML = `
	    <table class="data-table compact-table">
	      <thead>
	        <tr><th>Employee</th><th>Entries</th><th>In</th><th>Out</th><th>Breaks</th><th>Approved</th></tr>
	      </thead>
	      <tbody>
	        ${timesheetDetailRows().map((row) => `
	          <tr>
	            <td>${escapeHtml(row.employee.name)}</td>
	            <td>${row.entries}</td>
	            <td>${row.clockIns}</td>
	            <td>${row.clockOuts}</td>
	            <td>${row.breaks}</td>
	            <td>${row.approved}/${row.entries}</td>
	          </tr>
	        `).join("")}
	      </tbody>
	    </table>
	  `;
}

function renderPayroll() {
	  $("#payroll-period-filter").value = state.payrollPeriod || "Current cycle";
	  $("#payroll-checklist").innerHTML = state.payrollChecks.map((check, index) => `
    <label class="check-row">
      <span>${escapeHtml(check.label)}</span>
      <input type="checkbox" data-payroll-check="${index}" ${check.done ? "checked" : ""} ${isManager() ? "" : "disabled"} />
    </label>
  `).join("");
  $("#payroll-table").innerHTML = `
    <table class="data-table">
	      <thead>
	        <tr><th>Employee</th><th>Department</th><th>Hours</th><th>OT</th><th>Rate</th><th>Gross</th><th>Status</th></tr>
	      </thead>
      <tbody>
        ${payrollRows()
          .filter((row) => isManager() || row.name === activeEmployee()?.name)
          .map((row) => `
            <tr>
	              <td>${escapeHtml(row.name)}</td>
	              <td>${escapeHtml(row.department)}</td>
	              <td>${row.hours}</td>
	              <td>${row.overtime}</td>
	              <td>${formatMoney(row.rate)}</td>
	              <td>${formatMoney(row.gross)}</td>
              <td><span class="status-badge ${row.status === "Hold" ? "pending" : ""}">${escapeHtml(row.status)}</span></td>
            </tr>
          `).join("")}
      </tbody>
    </table>
  `;
}

function renderRequests() {
  $$("[data-request-filter]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.requestFilter === state.requestFilter);
  });

  const requests = state.requests.filter((request) => {
    const matchesRole = isManager() || request.person === activeEmployee()?.name;
    const matchesFilter = state.requestFilter === "all" || request.status === state.requestFilter;
    return matchesRole && matchesFilter;
  });

  $("#request-list").innerHTML = requests.map((request) => `
    <article class="request-item">
      <div>
        <h3>${escapeHtml(request.title)}: ${escapeHtml(request.person)}</h3>
        <p class="muted">${escapeHtml(request.detail)}</p>
        <span class="status-badge ${request.status === "Open" ? "" : statusClass(request.status)}">${escapeHtml(request.status)}</span>
      </div>
      ${request.status === "Open" && isManager() ? `
        <div class="request-actions">
          <button class="mini-button" type="button" data-request-action="Approved" data-request-id="${request.id}">Approve</button>
          <button class="mini-button" type="button" data-request-action="Declined" data-request-id="${request.id}">Decline</button>
        </div>
      ` : isManager() ? `
        <button class="mini-button" type="button" data-request-reopen="${request.id}">Reopen</button>
      ` : ""}
    </article>
  `).join("") || `<p class="muted">No employee requests yet.</p>`;
}

function renderDocuments() {
	  const active = activeEmployee();
	  const categories = [...new Set(state.documents.map((document) => document.category || "Policy"))].sort();
	  $("#document-category-filter").innerHTML = `<option value="all">All</option>` + categories.map((category) => (
	    `<option value="${escapeHtml(category)}" ${category === documentCategoryFilter ? "selected" : ""}>${escapeHtml(category)}</option>`
	  )).join("");
	  const documents = state.documents.filter((document) => documentCategoryFilter === "all" || document.category === documentCategoryFilter);
	  $("#document-list").innerHTML = documents.map((document) => {
	    const signed = document.signedBy?.includes(active?.id);
	    const signedCount = document.signedBy?.length || 0;
    return `
    <article class="document-item">
      <span class="document-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5V3Zm9 1.5V8h3.5L14 4.5ZM8 12h8v2H8v-2Zm0 4h8v2H8v-2Z" /></svg>
      </span>
      <div>
	        <h3>${escapeHtml(document.title)}</h3>
	        <p class="muted">${escapeHtml(document.meta)} • ${signedCount}/${state.employees.length} signed</p>
	        <p class="muted">${escapeHtml(document.category || "Policy")}${document.fileName ? ` • ${escapeHtml(document.fileName)}` : ""}${document.dueDate ? ` • Due ${escapeHtml(document.dueDate)}` : ""}</p>
	      </div>
	      <div class="document-actions">
	        <span class="department-pill">${escapeHtml(document.status)}</span>
        <button class="mini-button" type="button" data-document-action="${document.id}">${isManager() ? (document.status === "Complete" || document.status === "Published" ? "Open" : "Review") : (signed ? "Signed" : "Sign")}</button>
      </div>
    </article>
  `;
  }).join("");
}

function renderSettings() {
  $$("[data-setting]").forEach((input) => {
    const value = state.settings[input.dataset.setting];
    if (input.type === "checkbox") {
      input.checked = Boolean(value);
    } else {
      input.value = value ?? "";
    }
  });
  const companyName = state.settings.companyName || "ZIVO Employees";
  document.title = companyName;
  $("#local-record-count").textContent = `${state.employees.length} employee${state.employees.length === 1 ? "" : "s"}`;
  $("#connection-status").textContent = navigator.onLine ? "Online" : "Offline";
  $("#offline-status").textContent = "Ready";
  $("#app-version").textContent = "Local";
}

function renderNotifications() {
  const unread = state.notifications.filter((notification) => !notification.read).length;
  $("#notification-count").textContent = unread;
  $("#notification-count").hidden = unread === 0;
  $("#notification-list").innerHTML = state.notifications.map((notification) => `
    <button class="notification-item ${notification.read ? "" : "is-unread"}" type="button" data-notification-view="${escapeHtml(notification.view)}" data-notification-id="${notification.id}">
      <strong>${escapeHtml(notification.title)}</strong>
      <span>${escapeHtml(notification.meta)}</span>
    </button>
  `).join("") || `<p class="muted">No notifications.</p>`;
}

function renderProfileDrawer(employee = getEmployeeById(state.selectedEmployeeId) || activeEmployee()) {
  if (!employee) return;
  $("#profile-drawer-title").textContent = employee.name;
  const employeeRequests = state.requests.filter((request) => request.person === employee.name).length;
  const employeeGoals = state.goals.filter((goal) => goal.employeeId === employee.id);
  const signedDocs = state.documents.filter((document) => document.signedBy?.includes(employee.id)).length;
  $("#profile-drawer-content").innerHTML = `
    <div class="employee-detail-head">
      <div class="avatar large" aria-hidden="true">${escapeHtml(initials(employee.name))}</div>
      <div>
        <h2>${escapeHtml(employee.name)}</h2>
        <p class="muted">${escapeHtml(employee.role)}</p>
      </div>
    </div>
    <div class="detail-list">
      <span><strong>Phone</strong>${escapeHtml(employee.phone || "Not set")}</span>
      <span><strong>Department</strong>${escapeHtml(employee.department)}</span>
      <span><strong>Schedule</strong>${escapeHtml(employee.nextShift)}</span>
      <span><strong>Documents</strong>${signedDocs}/${state.documents.length} signed</span>
      <span><strong>Requests</strong>${employeeRequests} total</span>
    </div>
    <div class="goal-list">
      ${employeeGoals.map((goal) => `
        <article class="goal-card">
          <div>
            <h3>${escapeHtml(goal.title)}</h3>
            <div class="progress-bar mini-progress" aria-hidden="true"><span style="width:${Number(goal.progress || 0)}%"></span></div>
          </div>
          <strong>${Number(goal.progress || 0)}%</strong>
        </article>
      `).join("") || `<p class="muted">No goals yet.</p>`}
    </div>
  `;
}

function renderTraining() {
  const active = activeEmployee();
  const modules = state.training.filter((module) => isManager() || trainingApplies(module, active));
  $("#training-list").innerHTML = modules.map((module) => {
    const completed = module.completedBy.includes(active?.id);
    const completedCount = module.completedBy.length;
    return `
      <article class="training-card">
        <div>
          <h3>${escapeHtml(module.title)}</h3>
          <p class="muted">Assigned to ${escapeHtml(module.assignedTo)} • Due ${escapeHtml(module.due)}</p>
          <div class="progress-bar mini-progress" aria-hidden="true"><span style="width:${completionPercent(completedCount, state.employees.length)}%"></span></div>
          <p class="muted">${completedCount}/${state.employees.length} complete</p>
        </div>
        <div class="card-actions">
          ${isManager()
            ? `<button class="mini-button" type="button" data-training-complete-all="${module.id}">Complete all</button>`
            : `<button class="mini-button" type="button" data-training-complete="${module.id}">${completed ? "Completed" : "Mark complete"}</button>`}
        </div>
      </article>
    `;
  }).join("") || `<p class="muted">No training assigned.</p>`;

  const onboardingEmployee = isManager() ? state.employees.find((employee) => employee.status === "Pending") || active : active;
  $("#onboarding-list").innerHTML = state.onboarding.map((item) => {
    const done = item.doneBy.includes(onboardingEmployee?.id);
    return `
      <label class="check-row">
        <span>${escapeHtml(item.label)}<br /><small class="muted">${escapeHtml(onboardingEmployee?.name || "Employee")}</small></span>
        <input type="checkbox" data-onboarding="${item.id}" ${done ? "checked" : ""} />
      </label>
    `;
  }).join("");
}

function renderReports() {
  const activeCount = state.employees.filter((employee) => employee.status === "Active").length;
  const docsSigned = state.documents.reduce((sum, document) => sum + (document.signedBy?.length || 0), 0);
  const docsTotal = state.documents.length * state.employees.length;
  const trainingDone = state.training.reduce((sum, module) => sum + module.completedBy.length, 0);
  const trainingTotal = state.training.length * state.employees.length;
  const averageGoal = completionPercent(state.goals.reduce((sum, goal) => sum + Number(goal.progress || 0), 0), state.goals.length * 100);
  const reportCards = [
    ["Attendance", `${activeCount}/${state.employees.length}`, "active employees"],
    ["Training", `${completionPercent(trainingDone, trainingTotal)}%`, "completion"],
    ["Documents", `${completionPercent(docsSigned, docsTotal)}%`, "signed"],
    ["Goals", `${averageGoal}%`, "average progress"],
  ];

  $("#report-grid").innerHTML = reportCards.map(([title, value, meta]) => `
    <article class="metric-panel">
      <p>${escapeHtml(title)}</p>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(meta)}</span>
    </article>
  `).join("");

  const goals = state.goals.filter((goal) => isManager() || goal.employeeId === state.activeEmployeeId);
  $("#goal-list").innerHTML = goals.map((goal) => {
    const employee = getEmployeeById(goal.employeeId);
    return `
      <article class="goal-card">
        <div>
          <h3>${escapeHtml(goal.title)}</h3>
          <p class="muted">${escapeHtml(employee?.name || "Employee")}</p>
          <div class="progress-bar mini-progress" aria-hidden="true"><span style="width:${Number(goal.progress || 0)}%"></span></div>
        </div>
        <div class="goal-progress">
          <strong>${Number(goal.progress || 0)}%</strong>
          <button class="mini-button" type="button" data-goal-progress="${goal.id}">Update</button>
        </div>
      </article>
    `;
  }).join("") || `<p class="muted">No performance goals yet.</p>`;

  $("#department-report").innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th>Department</th><th>People</th><th>Active</th><th>Open requests</th><th>Training</th></tr>
      </thead>
      <tbody>
        ${departmentRows().map((row) => `
          <tr>
            <td>${escapeHtml(row.department)}</td>
            <td>${row.people}</td>
            <td>${row.active}</td>
            <td>${row.openRequests}</td>
            <td>${row.training}%</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderDate() {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
  $("#today-label").textContent = formatter.format(new Date());
}

function renderClockTime() {
  const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  $("#clock-time").textContent = formatter.format(new Date());
}

function updateStorageStatus() {
  if (!$("#storage-status")) return;
  if (!navigator.storage?.estimate) {
    $("#storage-status").textContent = "Available";
    return;
  }
  navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => {
    const usedMb = Math.max(0.1, usage / 1024 / 1024).toFixed(1);
    const quotaMb = quota ? Math.round(quota / 1024 / 1024) : 0;
    $("#storage-status").textContent = quotaMb ? `${usedMb} MB / ${quotaMb} MB` : `${usedMb} MB used`;
  }).catch(() => {
    $("#storage-status").textContent = "Available";
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.register("./sw.js").then(() => {
    $("#offline-status").textContent = "Ready";
  }).catch(() => {
    $("#offline-status").textContent = "Local only";
  });
}

function render() {
  renderAccessControls();
  renderMetrics();
  renderTimeline();
  renderQuickActions();
  renderDepartmentFilter();
  renderEmployeeOptions();
  renderEmployees();
  renderSchedule();
  renderClock();
  renderPayroll();
  renderRequests();
  renderDocuments();
  renderSettings();
  renderTraining();
  renderReports();
  renderNotifications();
  renderProfileDrawer();
  renderDate();
  updateStorageStatus();
}

function switchView(view) {
  currentView = view;
  $$(".view").forEach((element) => element.classList.toggle("is-active", element.dataset.view === view));
  $$(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.viewTarget === view));
  $("#view-title").textContent = viewTitles[view];
  window.location.hash = view;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openDialog(id) {
  const dialog = $(`#${id}`);
  if (dialog?.showModal) dialog.showModal();
}

function closeDialog(id) {
  $(`#${id}`)?.close();
}

function bindEvents() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.viewTarget));
  });

  document.addEventListener("click", (event) => {
    const viewLink = event.target.closest("[data-view-link]");
    if (viewLink) {
      switchView(viewLink.dataset.viewLink);
      if (viewLink.dataset.clickTarget) {
        setTimeout(() => $(`#${viewLink.dataset.clickTarget}`)?.click(), 120);
      }
    }

	    const closeButton = event.target.closest("[data-close-dialog]");
	    if (closeButton) closeDialog(closeButton.dataset.closeDialog);

	    const profileTab = event.target.closest("[data-profile-tab]");
	    if (profileTab) {
	      employeeProfileTab = profileTab.dataset.profileTab;
	      renderEmployeeDetail();
	    }

	    const selectEmployee = event.target.closest("[data-employee-select]");
	    if (selectEmployee) {
	      state.selectedEmployeeId = Number(selectEmployee.dataset.employeeSelect);
	      saveState();
	      renderEmployees();
	      renderProfileDrawer();
	      $("#profile-drawer").classList.remove("is-open");
	      showToast("Employee selected");
	    }

	    const toggleEmployee = event.target.closest("[data-employee-toggle]");
	    if (toggleEmployee) {
      const employee = getEmployeeById(toggleEmployee.dataset.employeeToggle);
      if (employee) {
        employee.status = employee.status === "Active" ? "On leave" : "Active";
        addNotification("Employee status changed", `${employee.name} is now ${employee.status}.`, "employees");
        saveState();
        render();
        showToast(`${employee.name} updated`);
	      }
	    }

	    const archiveEmployee = event.target.closest("[data-employee-archive]");
	    if (archiveEmployee) {
	      const employee = getEmployeeById(archiveEmployee.dataset.employeeArchive);
	      if (employee) {
	        employee.status = employee.status === "Archived" ? "Active" : "Archived";
	        addNotification("Employee profile updated", `${employee.name} is now ${employee.status}.`, "employees");
	        saveState();
	        render();
	        showToast(`${employee.name} ${employee.status.toLowerCase()}`);
	      }
	    }

	    const deleteEmployee = event.target.closest("[data-employee-delete]");
	    if (deleteEmployee) {
	      const employee = getEmployeeById(deleteEmployee.dataset.employeeDelete);
	      if (employee && requireConfirmation(`Delete ${employee.name}?`)) {
	        state.employees = state.employees.filter((person) => person.id !== employee.id);
	        state.timesheets = state.timesheets.filter((entry) => entry.employeeId !== employee.id);
	        state.goals = state.goals.filter((goal) => goal.employeeId !== employee.id);
	        state.documents = state.documents.map((documentItem) => ({
	          ...documentItem,
	          signedBy: (documentItem.signedBy || []).filter((id) => id !== employee.id),
	        }));
	        state.selectedEmployeeId = state.employees[0]?.id || null;
	        state.activeEmployeeId = state.employees[0]?.id || null;
	        addNotification("Employee deleted", `${employee.name} was removed from local records.`, "employees");
	        saveState();
	        render();
	        showToast("Employee deleted");
	      }
	    }

    const removeShift = event.target.closest("[data-remove-shift]");
    if (removeShift) {
      const [dayName, shiftIndex] = removeShift.dataset.removeShift.split(":");
      const day = state.schedule.find((item) => item.day === dayName);
      if (day) {
        day.shifts.splice(Number(shiftIndex), 1);
        state.schedulePublished = false;
        addNotification("Schedule changed", "A shift was removed from the draft schedule.", "schedule");
        saveState();
        render();
        showToast("Shift removed");
      }
    }

    const requestButton = event.target.closest("[data-request-action]");
    if (requestButton) {
      const request = state.requests.find((item) => item.id === Number(requestButton.dataset.requestId));
      if (request) {
        request.status = requestButton.dataset.requestAction;
        addNotification("Request updated", `${request.person}: ${request.status}.`, "requests");
        saveState();
        render();
        showToast(`Request ${request.status.toLowerCase()}`);
      }
    }

    const reopenButton = event.target.closest("[data-request-reopen]");
    if (reopenButton) {
      const request = state.requests.find((item) => item.id === Number(reopenButton.dataset.requestReopen));
      if (request) {
        request.status = "Open";
        addNotification("Request reopened", `${request.person}'s request is open again.`, "requests");
        saveState();
        render();
        showToast("Request reopened");
      }
    }

	    const documentButton = event.target.closest("[data-document-action]");
    if (documentButton) {
      const documentItem = state.documents.find((item) => item.id === Number(documentButton.dataset.documentAction));
      if (documentItem) {
        if (isManager()) {
          if (documentItem.status === "Draft" || documentItem.status === "Needs review") documentItem.status = "Published";
        } else if (!documentItem.signedBy.includes(state.activeEmployeeId)) {
          documentItem.signedBy.push(state.activeEmployeeId);
          addNotification("Document signed", `${activeEmployee()?.name || "Employee"} signed ${documentItem.title}.`, "documents");
        }
        saveState();
        renderDocuments();
        showToast(isManager() ? `${documentItem.title} opened` : `${documentItem.title} signed`);
	      }
	    }

	    const approveTimesheet = event.target.closest("[data-timesheet-approve]");
	    if (approveTimesheet) {
	      const entry = state.timesheets.find((item) => item.id === Number(approveTimesheet.dataset.timesheetApprove));
	      if (entry) {
	        entry.approved = true;
	        addNotification("Timesheet approved", `${getEmployeeById(entry.employeeId)?.name || "Employee"} timesheet entry approved.`, "timeclock");
	        saveState();
	        render();
	        showToast("Timesheet approved");
	      }
	    }

    const notificationItem = event.target.closest("[data-notification-view]");
    if (notificationItem) {
      const notification = state.notifications.find((item) => item.id === Number(notificationItem.dataset.notificationId));
      if (notification) notification.read = true;
      saveState();
      renderNotifications();
      $("#notification-drawer").classList.remove("is-open");
      switchView(notificationItem.dataset.notificationView);
    }
  });

	  $("#login-form").addEventListener("submit", (event) => {
	    event.preventDefault();
	    const formData = new FormData(event.currentTarget);
	    const role = formData.get("role");
	    const pin = formData.get("pin");
	    if ((role === "manager" && pin === state.settings.managerPin) || (role === "employee" && pin === state.settings.employeePin)) {
	      state.isAuthenticated = true;
	      state.currentRole = role;
      if (role === "employee") state.selectedEmployeeId = state.activeEmployeeId;
      saveState();
      render();
      showToast("Workspace unlocked");
    } else {
      showToast("PIN not accepted");
    }
  });

  $("#demo-unlock").addEventListener("click", () => {
    state.isAuthenticated = true;
    state.currentRole = "manager";
    saveState();
    render();
    showToast("Demo access unlocked");
  });

  $("#lock-app").addEventListener("click", () => {
    state.isAuthenticated = false;
    saveState();
    render();
    showToast("Workspace locked");
  });

  $("#notification-toggle").addEventListener("click", () => {
    $("#notification-drawer").classList.toggle("is-open");
  });

  $("#close-notifications").addEventListener("click", () => {
    $("#notification-drawer").classList.remove("is-open");
  });

  $("#mark-notifications-read").addEventListener("click", () => {
    state.notifications = state.notifications.map((notification) => ({ ...notification, read: true }));
    saveState();
    renderNotifications();
    $("#notification-drawer").classList.remove("is-open");
    showToast("Notifications cleared");
  });

  $("#close-profile").addEventListener("click", () => {
    $("#profile-drawer").classList.remove("is-open");
  });

  $$("[data-role-switch]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentRole = button.dataset.roleSwitch;
      if (!isManager()) state.selectedEmployeeId = state.activeEmployeeId;
      saveState();
      render();
      showToast(`${state.currentRole === "manager" ? "Manager" : "Employee"} mode active`);
    });
  });

  $("#active-employee-select").addEventListener("change", (event) => {
    state.activeEmployeeId = Number(event.target.value);
    if (!isManager()) state.selectedEmployeeId = state.activeEmployeeId;
    saveState();
    render();
    showToast("Active account changed");
  });

  $("#global-search").addEventListener("input", (event) => {
    searchTerm = event.target.value;
    renderEmployees();
    if (currentView !== "employees") switchView("employees");
  });

  $("[data-status-filter='all']").parentElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status-filter]");
    if (!button) return;
    statusFilter = button.dataset.statusFilter;
    $$("[data-status-filter]").forEach((item) => item.classList.toggle("is-selected", item === button));
    renderEmployees();
  });

  $("#department-filter").addEventListener("change", (event) => {
    departmentFilter = event.target.value;
    renderEmployees();
  });

  $("#clear-employee-filters").addEventListener("click", () => {
    searchTerm = "";
    statusFilter = "all";
    departmentFilter = "all";
    $("#global-search").value = "";
    $$("[data-status-filter]").forEach((item) => item.classList.toggle("is-selected", item.dataset.statusFilter === "all"));
    renderDepartmentFilter();
    renderEmployees();
    showToast("Filters cleared");
  });

  $("#theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("zivo-employees-theme", document.body.classList.contains("dark") ? "dark" : "light");
  });

  $("#open-add-employee").addEventListener("click", () => openDialog("employee-dialog"));
  $("#close-dialog").addEventListener("click", () => closeDialog("employee-dialog"));
	  $("#open-shift-dialog").addEventListener("click", () => openDialog("shift-dialog"));
	  $("#open-missed-punch-dialog").addEventListener("click", () => openDialog("missed-punch-dialog"));
	  $("#open-request-dialog").addEventListener("click", () => openDialog("request-dialog"));
  $("#open-document-dialog").addEventListener("click", () => openDialog("document-dialog"));
  $("#open-training-dialog").addEventListener("click", () => openDialog("training-dialog"));
  $("#open-goal-dialog").addEventListener("click", () => openDialog("goal-dialog"));

  $("#employee-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const employee = {
      id: nextId(state.employees),
      name: formData.get("name").trim(),
      role: formData.get("role").trim(),
      department: formData.get("department"),
      location: formData.get("location").trim() || "Remote",
      status: "Pending",
      manager: formData.get("manager").trim() || "Unassigned",
	      nextShift: formData.get("nextShift").trim() || "Onboarding pending",
	      payRate: Number(formData.get("payRate") || 20),
	      phone: formData.get("phone").trim(),
	      hireDate: formData.get("hireDate"),
	      emergencyContact: "",
	      availability: "Weekdays",
	      notes: "",
	    };
    state.employees.unshift(employee);
    state.selectedEmployeeId = employee.id;
    event.currentTarget.reset();
    closeDialog("employee-dialog");
    saveState();
    render();
    switchView("employees");
    showToast("Employee profile created");
	  });

	  $("#missed-punch-form").addEventListener("submit", (event) => {
	    event.preventDefault();
	    const formData = new FormData(event.currentTarget);
	    const employeeId = Number(formData.get("employeeId"));
	    const date = formData.get("date");
	    const time = formData.get("time");
	    const formatted = `${date} ${time}`;
	    state.timesheets.unshift({
	      id: nextId(state.timesheets),
	      employeeId,
	      type: formData.get("type"),
	      at: formatted,
	      approved: false,
	    });
	    addNotification("Missed punch added", `${getEmployeeById(employeeId)?.name || "Employee"} has a pending timesheet entry.`, "timeclock");
	    event.currentTarget.reset();
	    closeDialog("missed-punch-dialog");
	    saveState();
	    render();
	    switchView("timeclock");
	    showToast("Missed punch added");
	  });

  $("#shift-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const day = state.schedule.find((item) => item.day === formData.get("day"));
    if (day) {
      day.shifts.push({
        employee: formData.get("employee"),
        time: `${formData.get("start").trim()} - ${formData.get("end").trim()}`,
      });
      state.schedulePublished = false;
      addNotification("Shift added", `${formData.get("employee")} was added to ${formData.get("day")}.`, "schedule");
      event.currentTarget.reset();
      closeDialog("shift-dialog");
      saveState();
      renderSchedule();
      showToast("Shift added");
    }
  });

  $("#request-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    state.requests.unshift({
      id: nextId(state.requests),
      person: formData.get("person"),
      title: formData.get("title"),
      detail: formData.get("detail").trim(),
      status: "Open",
    });
    addNotification("New request", `${formData.get("person")} submitted ${formData.get("title")}.`, "requests");
    event.currentTarget.reset();
    closeDialog("request-dialog");
    saveState();
    render();
    switchView("requests");
    showToast("Request created");
  });

	  $("#document-form").addEventListener("submit", (event) => {
	    event.preventDefault();
	    const formData = new FormData(event.currentTarget);
	    const localFile = formData.get("localFile");
	    const fileName = localFile?.name || formData.get("fileName").trim();
	    state.documents.unshift({
	      id: nextId(state.documents),
	      title: formData.get("title").trim(),
	      status: formData.get("status"),
	      category: formData.get("category"),
	      dueDate: formData.get("dueDate"),
	      fileName,
	      fileType: localFile?.type || "",
	      meta: formData.get("meta").trim(),
	      signedBy: [],
	    });
    addNotification("Document added", `${formData.get("title")} is ready for review.`, "documents");
    event.currentTarget.reset();
    closeDialog("document-dialog");
    saveState();
    renderDocuments();
    switchView("documents");
    showToast("Document added");
  });

  $("#training-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    state.training.unshift({
      id: nextId(state.training),
      title: formData.get("title").trim(),
      assignedTo: formData.get("assignedTo"),
      due: formData.get("due").trim(),
      completedBy: [],
    });
    addNotification("Training added", `${formData.get("title")} is now assigned.`, "training");
    event.currentTarget.reset();
    closeDialog("training-dialog");
    saveState();
    renderTraining();
    switchView("training");
    showToast("Training module added");
  });

  $("#goal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    state.goals.unshift({
      id: nextId(state.goals),
      employeeId: Number(formData.get("employeeId")),
      title: formData.get("title").trim(),
      progress: Math.max(0, Math.min(100, Number(formData.get("progress") || 0))),
    });
    addNotification("Goal added", `${formData.get("title")} was added.`, "reports");
    event.currentTarget.reset();
    closeDialog("goal-dialog");
    saveState();
    renderReports();
    switchView("reports");
    showToast("Goal added");
  });

  $("#clock-toggle").addEventListener("click", () => {
    state.clockedIn = !state.clockedIn;
    if (!state.clockedIn) state.breakActive = false;
    state.clockStartedAt = state.clockedIn ? new Date().toISOString() : null;
    const action = state.clockedIn ? "Clocked in" : "Clocked out";
    const meta = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date());
    state.clockEvents.unshift({ title: `${action}: You`, meta });
    state.timesheets.unshift({ id: nextId(state.timesheets), employeeId: state.activeEmployeeId, type: action, at: meta });
    addNotification(action, `${activeEmployee()?.name || "Employee"} ${action.toLowerCase()}.`, "timeclock");
    state.clockEvents = state.clockEvents.slice(0, 6);
    saveState();
    renderClock();
    showToast(action);
  });

  $("#break-toggle").addEventListener("click", () => {
    if (!state.clockedIn) return;
    state.breakActive = !state.breakActive;
    state.breakStartedAt = state.breakActive ? new Date().toISOString() : null;
    const action = state.breakActive ? "Break started" : "Break ended";
    const meta = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date());
    state.timesheets.unshift({ id: nextId(state.timesheets), employeeId: state.activeEmployeeId, type: action, at: meta });
    addNotification(action, `${activeEmployee()?.name || "Employee"} ${action.toLowerCase()}.`, "timeclock");
    saveState();
    renderClock();
    showToast(action);
  });

  $("#payroll-checklist").addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-payroll-check]");
    if (!checkbox) return;
    state.payrollChecks[Number(checkbox.dataset.payrollCheck)].done = checkbox.checked;
    saveState();
    renderMetrics();
    showToast("Payroll checklist updated");
  });

  $("#employee-detail").addEventListener("change", (event) => {
    const select = event.target.closest("[data-employee-status]");
    const field = event.target.closest("[data-employee-field]");
    if (!select && !field) return;
    const employee = getEmployeeById(select?.dataset.employeeStatus || field?.dataset.employeeId);
    if (employee) {
      if (select) employee.status = select.value;
      if (field) {
        const key = field.dataset.employeeField;
        employee[key] = key === "payRate" ? Number(field.value || 0) : field.value;
      }
      saveState();
      render();
      showToast("Employee profile saved");
    }
  });

  $$(".request-filter [data-request-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.requestFilter = button.dataset.requestFilter;
      saveState();
      renderRequests();
    });
  });

  $$("[data-setting]").forEach((input) => {
    const saveSetting = () => {
      state.settings[input.dataset.setting] = input.type === "checkbox" ? input.checked : input.value.trim();
      saveState();
      renderSettings();
    };
    input.addEventListener(input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input", saveSetting);
  });

  $("#save-company-settings").addEventListener("click", () => {
    saveState();
    renderSettings();
    showToast("Company settings saved");
  });

  $("#training-list").addEventListener("click", (event) => {
    const completeButton = event.target.closest("[data-training-complete]");
    const completeAllButton = event.target.closest("[data-training-complete-all]");
    if (!completeButton && !completeAllButton) return;
    const module = state.training.find((item) => item.id === Number(completeButton?.dataset.trainingComplete || completeAllButton?.dataset.trainingCompleteAll));
    if (!module) return;
    if (completeAllButton) {
      module.completedBy = state.employees.map((employee) => employee.id);
      addNotification("Training complete", `${module.title} was completed for all.`, "training");
      showToast("Training completed for all");
    } else if (!module.completedBy.includes(state.activeEmployeeId)) {
      module.completedBy.push(state.activeEmployeeId);
      addNotification("Training complete", `${activeEmployee()?.name || "Employee"} completed ${module.title}.`, "training");
      showToast("Training marked complete");
    }
    saveState();
    renderTraining();
    renderReports();
  });

  $("#onboarding-list").addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-onboarding]");
    if (!checkbox) return;
    const item = state.onboarding.find((entry) => entry.id === Number(checkbox.dataset.onboarding));
    const employeeId = isManager()
      ? (state.employees.find((employee) => employee.status === "Pending") || activeEmployee())?.id
      : state.activeEmployeeId;
    if (!item || !employeeId) return;
    item.doneBy = checkbox.checked
      ? [...new Set([...item.doneBy, employeeId])]
      : item.doneBy.filter((id) => id !== employeeId);
    saveState();
    renderTraining();
    showToast("Onboarding updated");
  });

  $("#goal-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-goal-progress]");
    if (!button) return;
    const goal = state.goals.find((item) => item.id === Number(button.dataset.goalProgress));
    if (!goal) return;
    goal.progress = Math.min(100, Number(goal.progress || 0) + 10);
    addNotification("Goal updated", `${goal.title} moved to ${goal.progress}%.`, "reports");
    saveState();
    renderReports();
    showToast("Goal progress updated");
  });

	  $("#publish-schedule").addEventListener("click", () => {
	    state.schedulePublished = true;
	    addNotification("Schedule published", "The latest schedule is now visible to employees.", "schedule");
	    saveState();
	    renderSchedule();
	    showToast("Schedule published for employees");
	  });

	  $("#copy-week").addEventListener("click", () => {
	    state.schedule = clone(state.schedule);
	    state.schedulePublished = false;
	    addNotification("Schedule copied", "This week's schedule was copied into a new draft.", "schedule");
	    saveState();
	    renderSchedule();
	    showToast("Schedule copied to draft");
	  });

	  $("#schedule-week").addEventListener("change", (event) => {
	    state.scheduleWeek = event.target.value || defaultState.scheduleWeek;
	    state.schedulePublished = false;
	    addNotification("Schedule week changed", `Draft week set to ${state.scheduleWeek}.`, "schedule");
	    saveState();
	    renderSchedule();
	    showToast("Schedule week updated");
	  });

	  $("#approve-timesheets").addEventListener("click", () => {
	    const visibleEmployeeIds = new Set((isManager() ? state.employees : [activeEmployee()]).map((employee) => employee?.id));
	    state.timesheets = state.timesheets.map((entry) => visibleEmployeeIds.has(entry.employeeId) ? { ...entry, approved: true } : entry);
	    addNotification("Timesheets approved", "Visible timesheet entries are approved.", "timeclock");
	    saveState();
	    render();
	    showToast("Timesheets approved");
	  });

	  $("#approve-payroll").addEventListener("click", () => {
    state.payrollChecks = state.payrollChecks.map((check) => ({ ...check, done: true }));
    addNotification("Payroll approved", "The current payroll checklist is complete.", "payroll");
    saveState();
    render();
    showToast("Payroll approved");
	  });

	  $("#payroll-period-filter").addEventListener("change", (event) => {
	    state.payrollPeriod = event.target.value;
	    saveState();
	    renderMetrics();
	    renderPayroll();
	    showToast("Pay period changed");
	  });

	  $("#export-payroll").addEventListener("click", () => {
	    const rows = payrollRows();
	    const csv = [
	      "Employee,Department,Hours,Overtime,Rate,Gross,Status",
	      ...rows.map((row) => [row.name, row.department, row.hours, row.overtime, row.rate, row.gross, row.status].join(",")),
	    ].join("\n");
	    downloadText("zivo-payroll.csv", csv, "text/csv");
	    showToast("Payroll CSV exported");
	  });

	  $("#document-category-filter").addEventListener("change", (event) => {
	    documentCategoryFilter = event.target.value;
	    renderDocuments();
	  });

  $("#export-data").addEventListener("click", () => {
    exportWorkspaceData();
  });

  $("#export-all-data").addEventListener("click", () => {
    exportWorkspaceData();
  });

  $("#download-template").addEventListener("click", () => {
    const csv = [
      "name,role,department,location,manager,nextShift,payRate,phone,status",
      ["Sokha Chen", "Operations lead", "Operations", "Phnom Penh", "Nita", "Monday, 9 AM - 5 PM", "24", "+855 12 000 200", "Pending"].map(csvCell).join(","),
    ].join("\n");
    downloadText("zivo-employees-template.csv", csv, "text/csv");
    showToast("CSV template downloaded");
  });

	  $("#import-employees").addEventListener("click", () => {
    const imported = parseEmployeesCsv($("#employee-csv").value);
    if (!imported.length) {
      $("#import-result").textContent = "No valid employees found in CSV.";
      showToast("Import needs employee rows");
      return;
    }
    state.employees = [...imported, ...state.employees];
    state.selectedEmployeeId = imported[0].id;
    state.activeEmployeeId = imported[0].id;
    $("#employee-csv").value = "";
    $("#import-result").textContent = `${imported.length} employee${imported.length === 1 ? "" : "s"} imported.`;
    addNotification("Employees imported", `${imported.length} local employee record${imported.length === 1 ? "" : "s"} added.`, "employees");
    saveState();
    render();
    switchView("employees");
	    showToast("Employees imported");
	  });

	  $("#restore-backup").addEventListener("click", () => {
	    try {
	      restoreWorkspaceData($("#backup-json").value);
	      $("#backup-json").value = "";
	      $("#import-result").textContent = "Backup restored into local app.";
	      render();
	      switchView("dashboard");
	      showToast("Backup restored");
	    } catch (error) {
	      $("#import-result").textContent = "Backup JSON was not valid.";
	      showToast("Restore failed");
	    }
	  });

  $("#reset-demo-data").addEventListener("click", () => {
    if (!requireConfirmation("Reset all local demo data?")) return;
    state = normalizeState({});
    state.isAuthenticated = true;
    saveState();
    render();
    switchView("dashboard");
    showToast("Demo data reset");
  });

  $("#print-payroll").addEventListener("click", () => {
    printableWindow("ZIVO payroll preview", $("#payroll-table").innerHTML);
  });

  $("#export-report").addEventListener("click", () => {
    const csv = [
      "Department,People,Active,Open Requests,Training",
      ...departmentRows().map((row) => [row.department, row.people, row.active, row.openRequests, `${row.training}%`].join(",")),
    ].join("\n");
    downloadText("zivo-team-report.csv", csv, "text/csv");
    showToast("Team report exported");
  });

  window.addEventListener("hashchange", () => {
    const view = window.location.hash.replace("#", "");
    if (viewTitles[view] && view !== currentView) switchView(view);
  });
}

function init() {
  const savedTheme = localStorage.getItem("zivo-employees-theme");
  if (savedTheme === "dark") document.body.classList.add("dark");
  bindEvents();
  render();
  registerServiceWorker();
  renderClockTime();
  setInterval(renderClockTime, 1000);
  window.addEventListener("online", renderSettings);
  window.addEventListener("offline", renderSettings);

  const initialView = window.location.hash.replace("#", "");
  if (viewTitles[initialView]) switchView(initialView);
}

init();
