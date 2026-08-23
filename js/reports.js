(() => {
  const board = document.getElementById("report-board");
  const meta = document.getElementById("board-meta");
  if (!board) return;

  const DATA_URL = "./data/cart-reports.json";

  const formatWhen = (iso) => {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const renderEmpty = (message) => {
    board.innerHTML = `<p class="board-empty">${escapeHtml(message)}</p>`;
  };

  const renderPosts = (data) => {
    const posts = [...(data.posts || [])].sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    if (data.updatedAt) {
      meta.textContent = `last update · ${formatWhen(data.updatedAt)} · ${posts.length} posts`;
    } else {
      meta.textContent = posts.length ? `${posts.length} posts` : "no posts yet";
    }

    if (!posts.length) {
      renderEmpty("아직 게시된 테스트 결과가 없습니다. CI가 끝나면 여기에 자동으로 올라옵니다.");
      return;
    }

    const rows = posts
      .map((post, index) => {
        const status = post.status === "fail" || Number(post.failed) > 0 ? "fail" : "pass";
        const title = escapeHtml(post.title || "Cart E2E");
        const href = post.reportUrl || post.runUrl;
        const titleHtml = href
          ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${title}</a>`
          : title;
        const passed = Number(post.passed) || 0;
        const failed = Number(post.failed) || 0;

        return `<tr>
          <td class="num">${posts.length - index}</td>
          <td><span class="pill ${status}">${status.toUpperCase()}</span></td>
          <td class="title">${titleHtml}</td>
          <td class="result">${passed} passed / ${failed} failed</td>
          <td class="when">${escapeHtml(formatWhen(post.createdAt))}</td>
        </tr>`;
      })
      .join("");

    board.innerHTML = `<table class="board">
      <thead>
        <tr>
          <th>No</th>
          <th>Status</th>
          <th>Title</th>
          <th>Result</th>
          <th>Run at</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  fetch(DATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error("report data unavailable");
      return res.json();
    })
    .then(renderPosts)
    .catch(() => {
      meta.textContent = "";
      renderEmpty("리포트 데이터를 불러오지 못했습니다.");
    });
})();
