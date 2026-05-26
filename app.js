const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#primary-nav");
const navLinks = document.querySelectorAll(".primary-nav a");
const heroImage = document.querySelector(".hero-image");
const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const enrollmentForm = document.querySelector("#enrollment-form");
const enrollmentStatus = document.querySelector("#enrollment-status");
const year = document.querySelector("#year");
const ENROLLMENT_STORAGE_KEY = "better-tomorrow.enrollments.v1";

const quotes = [
  "Every child can learn, lead, and shine.",
  "Strong roots today. Brighter wings tomorrow.",
  "Discipline, curiosity, kindness, excellence.",
];

year.textContent = new Date().getFullYear();

decorateHero();
bindNavigation();
revealOnScroll();
activateScrollEffects();
bindEnrollmentForm();
bindContactForm();

function decorateHero() {
  const heroContent = document.querySelector(".hero-content");
  if (!heroContent) return;

  const quote = document.createElement("div");
  quote.className = "hero-quote reveal";
  quote.setAttribute("aria-live", "polite");
  quote.innerHTML = `
    <span>Quote of the day</span>
    <strong>${quotes[0]}</strong>
  `;
  heroContent.appendChild(quote);

  let quoteIndex = 0;
  window.setInterval(() => {
    quoteIndex = (quoteIndex + 1) % quotes.length;
    quote.classList.add("is-changing");
    window.setTimeout(() => {
      quote.querySelector("strong").textContent = quotes[quoteIndex];
      quote.classList.remove("is-changing");
    }, 220);
  }, 4200);
}

function bindNavigation() {
  menuToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      header.classList.remove("nav-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      header.classList.remove("nav-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

function revealOnScroll() {
  const revealTargets = document.querySelectorAll(
    ".quick-facts article, .section-copy, .section-heading, .values-grid article, .program-card, .feature-image-wrap, .feature-copy, .admission-steps article, .form-intro, .enrollment-form fieldset, .news-grid article, .contact-copy, .contact-form, .hero-quote"
  );

  revealTargets.forEach((target, index) => {
    target.classList.add("reveal");
    target.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealTargets.forEach((target) => observer.observe(target));
}

function activateScrollEffects() {
  const sections = [...document.querySelectorAll("main section[id]")];

  const setScrolledState = () => {
    const scrollY = window.scrollY;
    header.classList.toggle("is-scrolled", scrollY > 24);

    if (heroImage && scrollY < window.innerHeight) {
      heroImage.style.transform = `scale(1.04) translateY(${scrollY * 0.04}px)`;
    }
  };

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: "-35% 0px -55% 0px" }
  );

  sections.forEach((section) => sectionObserver.observe(section));
  setScrolledState();
  window.addEventListener("scroll", setScrolledState, { passive: true });
}

function bindEnrollmentForm() {
  if (!enrollmentForm) return;

  enrollmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = enrollmentForm.querySelector("button[type='submit']");
    const enrollment = buildEnrollmentRecord(new FormData(enrollmentForm));

    submitButton.disabled = true;
    enrollmentStatus.textContent = "Submitting registration...";

    try {
      await saveEnrollment(enrollment);
      enrollmentStatus.textContent = `Registration submitted. Reference: ${enrollment.reference}. The admissions team will contact ${enrollment.guardianName}.`;
      enrollmentForm.reset();
    } catch {
      saveEnrollmentLocally(enrollment);
      enrollmentStatus.textContent = `Registration saved in this browser. Reference: ${enrollment.reference}.`;
    } finally {
      submitButton.disabled = false;
    }
  });
}

function buildEnrollmentRecord(data) {
  return {
    reference: `BT-${Date.now().toString(36).toUpperCase()}`,
    submittedAt: new Date().toISOString(),
    visit: {
      guardianName: clean(data.get("guardianName")),
      phone: clean(data.get("phone")),
      email: clean(data.get("email")),
      visitDate: clean(data.get("visitDate")),
    },
    apply: {
      childName: clean(data.get("childName")),
      birthDate: clean(data.get("birthDate")),
      classLevel: clean(data.get("classLevel")),
      previousSchool: clean(data.get("previousSchool")),
    },
    assess: {
      assessmentDate: clean(data.get("assessmentDate")),
      learningSupport: clean(data.get("learningSupport")),
      academicNotes: clean(data.get("academicNotes")),
    },
    enrollment: {
      startTerm: clean(data.get("startTerm")),
      emergencyContact: clean(data.get("emergencyContact")),
      address: clean(data.get("address")),
      referral: clean(data.get("referral")),
      consent: data.get("consent") === "on",
    },
    guardianName: clean(data.get("guardianName")),
  };
}

async function saveEnrollment(enrollment) {
  if (!["http:", "https:"].includes(window.location.protocol)) {
    throw new Error("Local file mode.");
  }

  const response = await fetch("/api/enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enrollment),
  });

  if (!response.ok) {
    throw new Error("Enrollment request failed.");
  }
}

function saveEnrollmentLocally(enrollment) {
  const existing = JSON.parse(localStorage.getItem(ENROLLMENT_STORAGE_KEY) || "[]");
  existing.push(enrollment);
  localStorage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(existing));
}

function clean(value) {
  return String(value || "").trim();
}

function bindContactForm() {
  if (!contactForm) return;

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get("name") || "there").trim();

    formStatus.textContent = `Thank you, ${name}. Your enquiry is ready for the admissions team.`;
    contactForm.reset();

    window.setTimeout(() => {
      formStatus.textContent = "";
    }, 6000);
  });
}
