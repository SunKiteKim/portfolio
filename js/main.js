(() => {
  // GA4 Measurement ID (예: G-XXXXXXXXXX). 비우면 GA4를 로드하지 않습니다.
  const GA_MEASUREMENT_ID = "G-C3CJB3KE4C";
  // footer visitor 카운터 키 (고유해야 함)
  const VISITOR_COUNTER_KEY = "sunkitekim-portfolio-visits";

  const ids = ["main", "projects", "more-info"];
  const links = [...document.querySelectorAll(".console-bar nav a")];
  const header = document.querySelector(".console-bar");
  const topBtn = document.querySelector(".top-btn");
  const rail = document.querySelector(".page-rail");
  const ticksBox = document.getElementById("page-ticks");
  const tickCount = 24;

  if (ticksBox) {
    ticksBox.innerHTML = Array.from({ length: tickCount }, () => "<i></i>").join("");
  }
  const ticks = [...document.querySelectorAll(".page-rail__ticks i")];

  const setActive = (id) => {
    links.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
    });
  };

  const progress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    const index = Math.round(value * (tickCount - 1));
    ticks.forEach((tick, i) => {
      tick.classList.toggle("is-active", i === index);
    });
  };

  const sync = () => {
    const offset = 96;
    const y = window.scrollY + offset;
    let current = "main";
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= y) current = id;
    });
    setActive(current);
    header?.classList.toggle("is-revealed", current !== "main");
    const floated = window.scrollY > 240;
    topBtn?.classList.toggle("is-visible", floated);
    rail?.classList.toggle("is-visible", floated);
    progress();
  };

  const initGA4 = (measurementId) => {
    if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.gtag("js", new Date());
    window.gtag("config", measurementId);
  };

  const loadVisitorCount = async () => {
    const el = document.getElementById("visitor-count");
    if (!el) return;

    try {
      const res = await fetch(
        `https://countapi.mileshilliard.com/api/v1/hit/${encodeURIComponent(VISITOR_COUNTER_KEY)}`
      );
      if (!res.ok) throw new Error("counter unavailable");
      const data = await res.json();
      const value = Number(data.value);
      el.textContent = Number.isFinite(value) ? value.toLocaleString("en-US") : "—";
    } catch {
      el.textContent = "—";
    }
  };

  initGA4(GA_MEASUREMENT_ID);
  loadVisitorCount();

  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  window.addEventListener("load", sync);
  sync();
})();
