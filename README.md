# Warranty For QA Kim

김혜연 QA/QE 포트폴리오. 메인은 Pipeline Dashboard (`index.html`)입니다.

## 로컬에서 보기

폴더에서 `index.html`을 브라우저로 열거나, VS Code / Cursor Live Preview를 쓰면 됩니다.

## 꼭 바꿀 내용

`index.html`에서 아래를 본인 정보로 교체하세요.

- `YOUR_NAME`
- `you@example.com`
- `YOUR_GITHUB`
- `YOUR_LINKEDIN`
- `#cases` 샘플 케이스 4개 (수치, 기간, 증거 링크)

스킬 목록과 `mission.txt` 문장도 본인 톤에 맞게 고치면 됩니다.

## GitHub Pages에 올리기

1. 이 폴더를 Git 저장소로 만듭니다. (이 PC에 Git이 없으면 먼저 설치)
2. GitHub에 새 저장소를 만들고 푸시합니다.
3. 저장소 **Settings → Pages**
4. Source: **Deploy from a branch**
5. Branch: `main` / folder: `/ (root)`
6. 저장 후 `https://<username>.github.io/<repo>/` 로 열립니다.

프로젝트 페이지라면 CSS/JS 경로는 이미 상대경로(`./css/styles.css`)라 그대로 동작합니다.

## 디자인 버전

`versions.html`에서 네 가지를 비교할 수 있습니다.

- `index.html` — Pipeline Dashboard (메인, 실제 내용)
- `lab-dark.html` / `evidence-light.html` / `terminal.html` — 디자인 샘플

각 페이지 상단 바로 다른 버전으로 이동할 수 있습니다. Terminal Mono는 `t` 키 또는 `phosphor` 버튼으로 green / amber를 바꿉니다.
