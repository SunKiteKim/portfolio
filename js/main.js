(() => {
  const clock = document.getElementById("clock");
  const themeBtn = document.getElementById("theme-toggle");
  const statusTheme = document.getElementById("status-theme");
  const bootLine = document.getElementById("boot-line");
  const jumps = ["#home", "#about", "#skills", "#cases", "#process", "#contact"];

  const tick = () => {
    const now = new Date();
    const text = now.toTimeString().slice(0, 8);
    if (clock) {
      clock.textContent = text;
      clock.dateTime = now.toISOString();
    }
  };

  tick();
  setInterval(tick, 1000);

  const applyTheme = (name) => {
    document.documentElement.dataset.phosphor = name;
    localStorage.setItem("phosphor", name);
    if (themeBtn) themeBtn.textContent = `phosphor: ${name}`;
    if (statusTheme) statusTheme.textContent = name;
  };

  applyTheme(localStorage.getItem("phosphor") === "amber" ? "amber" : "green");

  themeBtn?.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.phosphor === "amber" ? "green" : "amber");
  });

  const bootText = bootLine?.textContent ?? "";
  if (bootLine && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bootLine.textContent = "";
    let i = 0;
    const type = () => {
      bootLine.textContent = bootText.slice(0, i);
      i += 1;
      if (i <= bootText.length) window.setTimeout(type, 18);
    };
    type();
  }

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === "t") {
      themeBtn?.click();
      return;
    }
    if (event.key === "g") {
      window.location.hash = "#home";
      return;
    }
    const index = Number(event.key);
    if (index >= 1 && index <= 5) {
      window.location.hash = jumps[index];
    }
  });
})();
