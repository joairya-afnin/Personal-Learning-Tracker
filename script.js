const TASKS = [
  { id: 1, short: "University topic", key: "task1" },
  { id: 2, short: "Digital discipline", key: "task2" },
  { id: 3, short: "Focused reading", key: "task3" }
];

const STORAGE_KEY = "myFocusTracker_v1";

const $ = id => document.getElementById(id);

const today = new Date();
const todayKey = dateKey(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
);

let displayedYear = today.getFullYear();
let displayedMonth = today.getMonth();
let selectedDate = todayKey;
let trackerData = loadData();

const monthPicker = $("monthPicker");


// =============================================
// DATE HELPERS
// =============================================

function dateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, monthIndex: month - 1, day };
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function prettyDate(key, options = {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric"
}) {
  const { year, monthIndex, day } = parseKey(key);
  return new Date(year, monthIndex, day).toLocaleDateString(
    undefined,
    options
  );
}

function currentMonthValue() {
  return `${displayedYear}-${String(displayedMonth + 1).padStart(2, "0")}`;
}


// =============================================
// SAVE AND LOAD
// =============================================

function loadData() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );

    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
      return {};
    }

    // Validate saved dates and task arrays.
    const clean = {};

    for (const [key, values] of Object.entries(saved)) {
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(key) &&
        Array.isArray(values) &&
        values.length === 3
      ) {
        const date = parseKey(key);
        const validDate = new Date(
          date.year, date.monthIndex, date.day
        );

        if (
          validDate.getFullYear() === date.year &&
          validDate.getMonth() === date.monthIndex &&
          validDate.getDate() === date.day
        ) {
          clean[key] = values.map(value => value === true);
        }
      }
    }

    return clean;
  } catch (error) {
    console.warn("Could not load saved tracker data.", error);
    return {};
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trackerData));
  } catch (error) {
    console.warn("Could not save tracker data.", error);
  }
}


// =============================================
// TASK STATUS
// =============================================

function statusFor(key) {
  const values = trackerData[key];

  return Array.isArray(values) && values.length === 3
    ? values
    : [false, false, false];
}

function completedFor(key) {
  return statusFor(key).filter(Boolean).length;
}

function monthKeys(year = displayedYear, month = displayedMonth) {
  return Array.from(
    { length: daysInMonth(year, month) },
    (_, index) => dateKey(year, month, index + 1)
  );
}


// =============================================
// MONTHLY STATISTICS
// =============================================

function monthStats() {
  const keys = monthKeys();
  const totals = [0, 0, 0];
  let completed = 0;

  keys.forEach(key => {
    statusFor(key).forEach((done, index) => {
      if (done) {
        totals[index]++;
        completed++;
      }
    });
  });

  const percentages = totals.map(total =>
    Math.round((total / keys.length) * 100)
  );

  // Average of the three individual task percentages.
  const average = Math.round(
    percentages.reduce((sum, value) => sum + value, 0) / 3
  );

  return {
    keys,
    totals,
    completed,
    percentages,
    average,
    possible: keys.length * 3
  };
}


// =============================================
// MONTH NAVIGATION
// =============================================

function setMonth(year, month) {
  const newDate = new Date(year, month, 1);

  displayedYear = newDate.getFullYear();
  displayedMonth = newDate.getMonth();

  const selected = parseKey(selectedDate);
  const day = Math.min(
    selected.day,
    daysInMonth(displayedYear, displayedMonth)
  );

  selectedDate = dateKey(displayedYear, displayedMonth, day);

  renderAll();
}

$("prevMonth").addEventListener("click", () => {
  setMonth(displayedYear, displayedMonth - 1);
});

$("nextMonth").addEventListener("click", () => {
  setMonth(displayedYear, displayedMonth + 1);
});

monthPicker.addEventListener("change", () => {
  if (!monthPicker.value) return;

  const [year, month] = monthPicker.value.split("-").map(Number);
  setMonth(year, month - 1);
});


// =============================================
// CALENDAR
// =============================================

function renderCalendar() {
  const grid = $("calendarGrid");
  grid.innerHTML = "";

  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(day => {
    const label = document.createElement("div");
    label.className = "calendar-weekday";
    label.textContent = day;
    grid.appendChild(label);
  });

  const firstDay = new Date(
    displayedYear, displayedMonth, 1
  ).getDay();

  const mondayOffset = (firstDay + 6) % 7;

  for (let i = 0; i < mondayOffset; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-day blank-day";
    blank.setAttribute("aria-hidden", "true");
    grid.appendChild(blank);
  }

  const totalDays = daysInMonth(displayedYear, displayedMonth);

  for (let day = 1; day <= totalDays; day++) {
    const key = dateKey(displayedYear, displayedMonth, day);
    const done = completedFor(key);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.innerHTML = `<span>${day}</span><i class="day-status"></i>`;

    if (key === selectedDate) button.classList.add("selected");
    if (key === todayKey) button.classList.add("today");

    if (done === 3) {
      button.classList.add("status-done");
    } else if (done > 0) {
      button.classList.add("status-partial");
    }

    button.setAttribute(
      "aria-label",
      `${prettyDate(key)}, ${done} of 3 tasks completed`
    );

    button.setAttribute("aria-pressed", String(key === selectedDate));

    button.addEventListener("click", () => {
      selectedDate = key;
      renderAll();
    });

    grid.appendChild(button);
  }

  $("selectedDateLabel").textContent = prettyDate(selectedDate);

  const done = completedFor(selectedDate);

  $("selectedDateHint").textContent = done === 3
    ? "All three habits are complete — wonderful!"
    : `${done} of 3 habits completed. Keep going at your own pace.`;
}


// =============================================
// DAILY CHECKLIST
// =============================================

function renderDaily() {
  const statuses = statusFor(selectedDate);
  let done = 0;

  TASKS.forEach((task, index) => {
    const checkbox = $(task.key);
    checkbox.checked = Boolean(statuses[index]);

    if (checkbox.checked) done++;
  });

  $("dailyCountBadge").textContent = `${done} of 3`;

  const percent = Math.round((done / 3) * 100);

  $("dailyPercent").textContent = `${percent}%`;
  $("dailyProgressBar").style.width = `${percent}%`;

  $("successMessage").hidden = done !== 3;
}

function toggleTask(key, index) {
  const statuses = [...statusFor(key)];
  statuses[index] = !statuses[index];

  trackerData[key] = statuses;
  selectedDate = key;

  saveData();
  renderAll();
}

TASKS.forEach((task, index) => {
  $(task.key).addEventListener("change", event => {
    const statuses = [...statusFor(selectedDate)];
    statuses[index] = event.target.checked;

    trackerData[selectedDate] = statuses;

    saveData();
    renderAll();
  });
});


// =============================================
// MONTHLY TRACKER TABLE
// =============================================

function renderTable(stats) {
  const body = $("trackerBody");
  body.innerHTML = "";

  stats.keys.forEach(key => {
    const statuses = statusFor(key);
    const done = statuses.filter(Boolean).length;

    const row = document.createElement("tr");

    if (key === selectedDate) {
      row.classList.add("selected-row");
    }

    // Date button
    const dateCell = document.createElement("th");
    dateCell.scope = "row";

    const dateButton = document.createElement("button");
    dateButton.type = "button";
    dateButton.className = "date-button";

    dateButton.textContent = prettyDate(key, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

    dateButton.title = "Select this day";

    dateButton.addEventListener("click", () => {
      selectedDate = key;
      renderAll();
    });

    dateCell.appendChild(dateButton);
    row.appendChild(dateCell);

    // Task buttons: ✓ means completed; × means incomplete.
    statuses.forEach((isDone, index) => {
      const cell = document.createElement("td");
      const button = document.createElement("button");

      button.type = "button";
      button.className = `task-toggle${isDone ? " complete" : ""}`;
      button.textContent = isDone ? "✓" : "×";

      button.setAttribute(
        "aria-label",
        `${TASKS[index].short}, ${prettyDate(key, {
          month: "short", day: "numeric"
        })}: ${isDone ? "completed" : "not completed"}. Click to toggle.`
      );

      button.setAttribute("aria-pressed", String(isDone));

      button.addEventListener("click", () => toggleTask(key, index));

      cell.appendChild(button);
      row.appendChild(cell);
    });

    // Daily completion total
    const totalCell = document.createElement("td");
    const total = document.createElement("span");

    total.className = "daily-total";
    total.textContent = `${done}/3 · ${Math.round(done / 3 * 100)}%`;

    totalCell.appendChild(total);
    row.appendChild(totalCell);

    body.appendChild(row);
  });

  stats.percentages.forEach((percent, index) => {
    $(`taskPercent${index + 1}`).textContent = `${percent}%`;
  });

  $("tableAverage").textContent = `${stats.average}% avg.`;
}


// =============================================
// PROGRESS BAR CHART
// =============================================

function renderChart(stats) {
  const chart = $("habitChart");
  chart.innerHTML = "";

  TASKS.forEach((task, index) => {
    const percent = stats.percentages[index];

    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("div");
    label.className = "chart-label";
    label.textContent = task.short;

    const track = document.createElement("div");
    track.className = "chart-track";
    track.setAttribute("role", "img");
    track.setAttribute(
      "aria-label",
      `${task.short}: ${percent}% completed; target 90%`
    );

    const fill = document.createElement("div");
    fill.className = "chart-fill";
    fill.style.width = `${percent}%`;

    track.appendChild(fill);

    const value = document.createElement("div");
    value.className = "chart-value";
    value.textContent = `${percent}%`;

    row.append(label, track, value);
    chart.appendChild(row);
  });
}


// =============================================
// MOTIVATIONAL PERFORMANCE RATINGS
// =============================================

function ratingFor(percent) {
  if (percent >= 90) {
    return {
      label: "Excellent!",
      title: "You're building real consistency!",
      message:
        "Wonderful work! You're meeting your target. Keep protecting your focus and maintaining these habits."
    };
  }

  if (percent >= 80) {
    return {
      label: "Very good!",
      title: "You're doing very well!",
      message:
        "You're close to your target. A little more consistency with your habits can take you even further."
    };
  }

  if (percent >= 70) {
    return {
      label: "Good progress",
      title: "Good progress so far.",
      message:
        "Your effort is adding up. Notice which habit needs attention and make a small plan for tomorrow."
    };
  }

  if (percent >= 60) {
    return {
      label: "Keep improving",
      title: "You're moving forward.",
      message:
        "You have a foundation to build on. Focus on making your next study session distraction-free."
    };
  }

  if (percent >= 50) {
    return {
      label: "Getting there",
      title: "Every effort matters.",
      message:
        "You have started, and that matters. Choose one habit to strengthen this week; consistency grows step by step."
    };
  }

  return {
    label: "Your fresh start",
    title: "You can begin again today.",
    message:
      "A low score is feedback, not failure. Pick just one small action for today—study one topic, put your phone away, or read for 20 minutes. You can do this!"
  };
}


// =============================================
// SUMMARY CARDS & MONTHLY RATING
// =============================================

function renderSummary(stats) {
  $("completedCount").innerHTML =
    `${stats.completed}<span>/${stats.possible}</span>`;

  $("averagePercent").textContent = `${stats.average}%`;

  const overallPercent = Math.round(
    (stats.completed / stats.possible) * 100
  );

  $("overallMiniBar").style.width = `${overallPercent}%`;
  $("averageMiniBar").style.width = `${stats.average}%`;

  $("benchmarkText").textContent = stats.average >= 90
    ? "Target achieved — amazing!"
    : `${90 - stats.average}% below target`;

  $("ratingPercent").textContent = `${stats.average}%`;

  const degrees = stats.average * 3.6;

  $("ratingRing").style.background = `
    conic-gradient(
      #e965b8 0deg,
      #a66add ${degrees}deg,
      #f5eaf5 ${degrees}deg,
      #f5eaf5 360deg
    )
  `;

  const rating = ratingFor(stats.average);

  $("ratingTitle").textContent = rating.title;
  $("ratingLabel").textContent = rating.label;
  $("ratingMessage").textContent = rating.message;

  $("targetDifference").textContent = stats.average >= 90
    ? `${stats.average - 90}% above target`
    : `${90 - stats.average}% to go`;
}


// =============================================
// ACTIVE NAVIGATION
// Highlights the section currently being viewed.
// =============================================


function setupNavigation() {
  const links = [...document.querySelectorAll(".nav-link")];

  const sections = links
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  function setActiveLink(id) {
    links.forEach(link => {
      const active = link.getAttribute("href") === `#${id}`;

      link.classList.toggle("active", active);

      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  // Highlight the clicked link immediately.
  links.forEach(link => {
    link.addEventListener("click", () => {
      setActiveLink(link.getAttribute("href").slice(1));
    });
  });

  // Update the highlight as the user scrolls.
  function updateActiveSection() {
    const headerOffset = 160;
    let current = sections[0]?.id || "overview";

    for (const section of sections) {
      if (section.getBoundingClientRect().top <= headerOffset) {
        current = section.id;
      }
    }

    setActiveLink(current);
  }

  window.addEventListener("scroll", updateActiveSection, {
    passive: true
  });

  window.addEventListener("resize", updateActiveSection);
}


// =============================================
// RENDER EVERYTHING
// =============================================

function renderAll() {
  monthPicker.value = currentMonthValue();

  $("todayLabel").textContent = prettyDate(todayKey, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const stats = monthStats();

  renderCalendar();
  renderDaily();
  renderTable(stats);
  renderChart(stats);
  renderSummary(stats);
}


// =============================================
// START THE TRACKER
// =============================================

setupNavigation();
renderAll();
