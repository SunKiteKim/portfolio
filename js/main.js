(() => {
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

  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  window.addEventListener("load", sync);
  sync();
})();
