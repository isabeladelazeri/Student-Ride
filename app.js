"use strict";

const STORAGE = {
  rides: "studentRide.rides",
  points: "studentRide.points",
  profile: "studentRide.profile"
};

const sampleRides = [
  { id: "sample-1", departure: "North Campus", destination: "Downtown Station", date: futureDate(1), time: "09:15", seats: 3, price: 4.50, driver: "Maya R.", rating: "4.9", own: false },
  { id: "sample-2", departure: "West Hall", destination: "City Airport", date: futureDate(2), time: "14:30", seats: 2, price: 12, driver: "Jordan K.", rating: "5.0", own: false },
  { id: "sample-3", departure: "East Campus", destination: "Central Library", date: futureDate(1), time: "17:00", seats: 1, price: 2, driver: "Alex T.", rating: "4.8", own: false },
  { id: "sample-4", departure: "North Campus", destination: "Riverside Mall", date: futureDate(3), time: "11:45", seats: 3, price: 3.50, driver: "Sam P.", rating: "4.9", own: false }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

let userRides = getStored(STORAGE.rides, []);
let points = Number(getStored(STORAGE.points, 0)) || 0;
let profile = getStored(STORAGE.profile, null);
let pendingRideId = null;
let toastTimer;

function notify(message) {
  const status = $("#statusMessage");
  status.textContent = message;
  status.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => status.classList.remove("visible"), 4200);
}

function saveRides() {
  localStorage.setItem(STORAGE.rides, JSON.stringify(userRides));
}

function formatDate(dateString) {
  if (!dateString) return "Date flexible";
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric"
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function allRides() {
  return [...userRides, ...sampleRides];
}

function rideCard(ride) {
  const driver = escapeHTML(ride.driver || "Student driver");
  const departure = escapeHTML(ride.departure);
  const destination = escapeHTML(ride.destination);

  return `
    <article class="ride-card">
      <div class="ride-route">
        <span>${departure}</span>
        <span aria-hidden="true">→</span>
        <span>${destination}</span>
      </div>
      <div class="ride-meta">
        <span class="pill">${formatDate(ride.date)}</span>
        <span class="pill">${escapeHTML(ride.time || "Time flexible")}</span>
      </div>
      <div class="driver-row">
        <span class="avatar" aria-hidden="true">${driver.charAt(0)}</span>
        <span>
          <strong>${driver}</strong>
          <small>★ ${escapeHTML(ride.rating || "New")} · Student profile</small>
        </span>
      </div>
      <div class="ride-meta">
        <span>💺 ${Number(ride.seats)} seat${Number(ride.seats) === 1 ? "" : "s"}</span>
        <strong>$${Number(ride.price).toFixed(2)} / passenger</strong>
      </div>
      <button class="button button-primary book-button" type="button"
        data-ride-id="${escapeHTML(ride.id)}"
        ${Number(ride.seats) < 1 ? "disabled" : ""}>
        ${Number(ride.seats) < 1 ? "Full" : "Request to book"}
      </button>
    </article>`;
}

function renderRides(list = allRides()) {
  $("#rideResults").innerHTML = list.map(rideCard).join("");
  $("#rideCount").textContent =
    `${list.length} ride${list.length === 1 ? "" : "s"} found`;
  $("#noRides").hidden = list.length > 0;
}

function renderMyRides() {
  const area = $("#myRidesArea");

  if (!userRides.length) {
    area.innerHTML = "";
    return;
  }

  area.innerHTML = `
    <h3>Your published demo rides</h3>
    <div class="card-grid three">
      ${userRides.map(ride => `
        <article class="ride-card">
          <div class="ride-route">
            ${escapeHTML(ride.departure)}
            <span aria-hidden="true">→</span>
            ${escapeHTML(ride.destination)}
          </div>
          <p>${formatDate(ride.date)} · ${escapeHTML(ride.time)} · ${Number(ride.seats)} seat(s)</p>
          <p>$${Number(ride.price).toFixed(2)} per passenger · ${ride.completed ? "Completed" : "Published demo listing"}</p>
          ${ride.completed
            ? '<span class="pill">100 points earned</span>'
            : `<button class="button button-outline complete-ride" type="button" data-ride-id="${escapeHTML(ride.id)}">Mark demo ride complete</button>`
          }
        </article>
      `).join("")}
    </div>`;
}

function updateRewards() {
  $("#pointsBalance").textContent = points;

  const progress = Math.min(points % 500, 500);
  const percent = Math.min((progress / 500) * 100, 100);

  $("#progressBar").style.width = `${percent}%`;

  $(".progress-track").setAttribute(
    "aria-valuenow",
    String(progress)
  );

  $("#progressText").textContent = `${Math.round(percent)}%`;

  $("#rewardsMessage").textContent = points >= 500
    ? "Nice work! You reached an example reward milestone."
    : "Complete a ride you publish to earn 100 points.";
}

function renderProfile() {
  const panel = $("#profilePanel");

  if (!profile) {
    panel.innerHTML = "";
    return;
  }

  panel.innerHTML = `
    <div class="profile-card">
      <strong>Demo profile: ${escapeHTML(profile.name)}</strong>
      <div>${escapeHTML(profile.email)}</div>
      <small>Student status: not verified · Profile stored in this browser</small>
    </div>`;
}

function getRide(id) {
  return allRides().find(ride => ride.id === id);
}

// Search rides

$("#searchForm").addEventListener("submit", event => {
  event.preventDefault();

  const data = new FormData(event.currentTarget);

  const departure = String(data.get("departure")).trim().toLowerCase();
  const destination = String(data.get("destination")).trim().toLowerCase();
  const date = String(data.get("date"));
  const seats = Number(data.get("seats")) || 1;

  const matches = allRides().filter(ride =>
    (!departure || ride.departure.toLowerCase().includes(departure)) &&
    (!destination || ride.destination.toLowerCase().includes(destination)) &&
    (!date || ride.date === date) &&
    Number(ride.seats) >= seats
  );

  renderRides(matches);

  notify(
    `${matches.length} matching ride${matches.length === 1 ? "" : "s"} found.`
  );
});

$("#clearSearch").addEventListener("click", () => {
  $("#searchForm").reset();
  renderRides();
  notify("Ride filters cleared.");
});

// Offer a ride

$("#offerForm").addEventListener("submit", event => {
  event.preventDefault();

  const data = new FormData(event.currentTarget);

  const ride = {
    id: `own-${Date.now()}`,
    departure: String(data.get("departure")).trim(),
    destination: String(data.get("destination")).trim(),
    date: String(data.get("date")),
    time: String(data.get("time")),
    seats: Number(data.get("seats")),
    price: Number(data.get("price")),
    driver: profile?.name || "You",
    rating: "New",
    own: true,
    completed: false
  };

  userRides.unshift(ride);

  saveRides();

  event.currentTarget.reset();

  renderMyRides();
  renderRides();

  notify("Your demo ride has been published in this browser.");
});

// Booking and rewards

document.addEventListener("click", event => {
  const bookButton = event.target.closest(".book-button");

  if (bookButton) {
    const ride = getRide(bookButton.dataset.rideId);

    if (!ride || Number(ride.seats) < 1) return;

    pendingRideId = ride.id;

    $("#bookingDetails").textContent =
      `Your demo request is for ${ride.departure} to ${ride.destination} on ${formatDate(ride.date)} at ${ride.time}.`;

    $("#bookingDialog").showModal();
  }

  const completeButton = event.target.closest(".complete-ride");

  if (completeButton) {
    const ride = userRides.find(
      item => item.id === completeButton.dataset.rideId
    );

    if (!ride || ride.completed) return;

    ride.completed = true;
    points += 100;

    localStorage.setItem(
      STORAGE.points,
      JSON.stringify(points)
    );

    saveRides();

    renderMyRides();
    renderRides();
    updateRewards();

    notify("Demo ride completed. 100 points added to your rewards balance.");
  }
});

$("#closeDialog").addEventListener("click", () => {
  $("#bookingDialog").close();
});

$("#confirmBooking").addEventListener("click", () => {
  const ride = getRide(pendingRideId);

  if (ride && !ride.own && Number(ride.seats) > 0) {
    ride.seats -= 1;
    renderRides();
  }

  $("#bookingDialog").close();

  notify("Demo booking confirmation shown. No real booking was made.");
});

// Demo account

$("#signupForm").addEventListener("submit", event => {
  event.preventDefault();

  const data = new FormData(event.currentTarget);

  profile = {
    name: String(data.get("name")).trim(),
    email: String(data.get("email")).trim()
  };

  localStorage.setItem(
    STORAGE.profile,
    JSON.stringify(profile)
  );

  event.currentTarget.reset();

  renderProfile();

  notify("Demo profile created and saved in this browser. No real account was made.");
});

$("#loginForm").addEventListener("submit", event => {
  event.preventDefault();

  const data = new FormData(event.currentTarget);

  const email = String(data.get("email")).trim().toLowerCase();

  if (profile && profile.email.toLowerCase() === email) {
    notify(`Welcome back, ${profile.name}. This is a local demo login.`);
  } else {
    notify("No matching demo profile found. Create a demo profile first.");
  }
});

$("#logoutButton").addEventListener("click", () => {
  notify("Demo session ended. Your locally stored profile remains saved.");
});

$("#verifyButton").addEventListener("click", () =>
  notify("Demo only: student identity and enrollment have not been verified.")
);

// Contact form

$("#contactForm").addEventListener("submit", event => {
  event.preventDefault();
  event.currentTarget.reset();

  notify("Thanks! This demo message was not sent to a support team.");
});

// Mobile navigation

$("#menuToggle").addEventListener("click", () => {
  const nav = $("#primaryNav");
  const isOpen = nav.classList.toggle("open");

  $("#menuToggle").setAttribute(
    "aria-expanded",
    String(isOpen)
  );
});

$("#primaryNav").addEventListener("click", event => {
  if (event.target.closest("a")) {
    $("#primaryNav").classList.remove("open");

    $("#menuToggle").setAttribute(
      "aria-expanded",
      "false"
    );
  }
});

// Active navigation section

const sectionLinks = $$('.primary-nav a');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      sectionLinks.forEach(link => {
        if (link.getAttribute("href") === `#${entry.target.id}`) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }
  });
}, {
  rootMargin: "-25% 0px -65% 0px"
});

$$("main section[id]").forEach(section => {
  observer.observe(section);
});

// Text size

$("#textSizeButton").addEventListener("click", event => {
  const enabled = document.body.classList.toggle("large-text");

  event.currentTarget.setAttribute(
    "aria-pressed",
    String(enabled)
  );

  event.currentTarget.textContent = enabled
    ? "Reset text size"
    : "Increase text size";
});

// Voice navigation

$("#voiceButton").addEventListener("click", () => {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    $("#voiceStatus").textContent =
      "Voice recognition is not available in this browser. Use the navigation links instead.";

    notify("Voice navigation is not supported by this browser.");

    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = document.documentElement.lang || "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  $("#voiceStatus").textContent =
    "Listening… say a section name, such as “find a ride.”";

  recognition.onresult = event => {
    const spoken = event.results[0][0].transcript.toLowerCase();

    const routes = [
      ["find", "find"],
      ["search", "find"],
      ["offer", "offer"],
      ["publish", "offer"],
      ["how", "how"],
      ["reward", "rewards"],
      ["access", "accessibility"],
      ["safety", "safety"],
      ["about", "about"],
      ["login", "account"],
      ["sign up", "account"],
      ["contact", "contact"],
      ["home", "home"]
    ];

    if (spoken.includes("read page")) {
      const title = $(
        "main section:not([hidden]) h1, main section:not([hidden]) h2"
      );

      if (title && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();

        window.speechSynthesis.speak(
          new SpeechSynthesisUtterance(title.textContent)
        );
      }

      $("#voiceStatus").textContent =
        "Reading the current section heading.";

      return;
    }

    const match = routes.find(([phrase]) =>
      spoken.includes(phrase)
    );

    if (match) {
      location.hash = `#${match[1]}`;

      $("#voiceStatus").textContent =
        `Navigated to ${match[1]}.`;
    } else {
      $("#voiceStatus").textContent =
        `I heard “${spoken}”. Try saying a section name.`;
    }
  };

  recognition.onerror = () => {
    $("#voiceStatus").textContent =
      "Voice navigation stopped or microphone access was unavailable.";
  };

  recognition.onend = () => {
    if ($("#voiceStatus").textContent.startsWith("Listening")) {
      $("#voiceStatus").textContent =
        "Voice navigation ended.";
    }
  };

  try {
    recognition.start();
  } catch {
    $("#voiceStatus").textContent =
      "Voice recognition is already active. Try again in a moment.";
  }
});

// Initial rendering

renderRides();
renderMyRides();
updateRewards();
renderProfile();
