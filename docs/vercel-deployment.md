# Vercel + GitHub Actions 배포

Things 서비스는 변경하지 않습니다. `SunKiteKim/portfolio` 저장소를 별도 Vercel 프로젝트로 가져옵니다.
포트폴리오 페이지와 `/api/runs`가 같은 프로젝트에서 제공되므로 기본 설정에서는 API 주소를 따로 입력할 필요가 없습니다.

## 1. GitHub 설정

GitHub 저장소의 Actions에서 `things E2E` 워크플로가 보이는지 확인합니다.
먼저 Run workflow를 실행하면 `test-reports` 브랜치가 자동 생성됩니다.
조직 정책에서 워크플로의 Contents 쓰기를 허용해야 합니다.
실패/성공 결과와 약 3초 간격의 진행 스냅샷은 이 브랜치에 저장됩니다.
워크플로가 시작도 못했거나 취소되면 API가 GitHub 실행 상태를 조회해 오류로 표시합니다.

GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens에서
이 저장소만 선택하고 다음 권한으로 토큰을 만듭니다.

- Actions: Read and write (실행 요청·실행 상태 조회)
- Contents: Read-only (진행 로그·완료 리포트 조회)

토큰은 Vercel 환경 변수에만 입력하세요. 채팅, 코드, Git 저장소에 넣지 않습니다.
GitHub Actions 내부의 결과 저장에는 별도의 자동 발급 `GITHUB_TOKEN`을 사용합니다.

## 2. Vercel 프로젝트 가져오기

Vercel → Add New → Project → GitHub `SunKiteKim/portfolio` Import.

- Framework Preset: Other
- Root Directory: 저장소 루트
- Build Command: `npm run build:vercel`
- Output Directory: `public`
- Node.js: 22.x
- Production Branch: main

`vercel.json`에 빌드 설정이 포함되어 있습니다. 서버 코드를 static output으로 복사하지 않습니다.
`test-reports` 브랜치는 자동 배포하지 않도록 설정되어 있습니다.

환경 변수:

- `GH_ACTIONS_TOKEN`: 위에서 만든 토큰 (Sensitive로 등록)
- `GH_REPOSITORY`: `SunKiteKim/portfolio`
- `ALLOWED_ORIGINS`: 포트폴리오의 HTTPS origin (예: `https://내프로젝트.vercel.app`)

기본 Vercel Production URL은 `VERCEL_PROJECT_PRODUCTION_URL`에서 자동 허용합니다.
커스텀 도메인이나 기존 GitHub Pages에서 접근한다면 해당 origin을 쉼표로 추가하세요.
외부 Pages를 유지한다면 두 HTML의 `test-api-base`를 실제 배포된 Vercel 주소로 설정하고 다시 푸시합니다.

## 3. 확인

배포된 `/project-cart.html` → Trigger → QUEUED → RUNNING → 리포트 → History.
GitHub API 부하를 줄이기 위해 실행 중 로그는 10초 간격으로 조회합니다.
Github의 runner 준비와 저장소 전파 때문에 표시가 몇 초 늦을 수 있습니다.
History에서는 최근 1,000개 저장 요약을 제공하며 개별 결과 파일은 브랜치에 남습니다.
기존 로컬 `storage/runs` 기록은 자동 업로드하지 않습니다.

## 무료 범위와 실행 제한

유료 디스크/DB/상시 서버를 생성하지 않습니다. Vercel과 GitHub 무료 사용 조건과 사용량 한도는 계정에서 확인하세요.
Vercel API는 1분 간격·UTC 일일 30회 제한을 GitHub 실행 목록으로 확인합니다.
동시 요청 경합을 완전히 막는 원자적 제한은 아니므로 공개 트래픽이 많아지면 Vercel 방화벽의 요청 제한도 설정하세요.
워크플로 concurrency로 테스트는 한 번에 하나만 실행하고, 각 job은 최대 10분으로 제한합니다.
테스트 자체는 3분 제한이며 실제 주문·결제는 생성하지 않습니다.

토큰 만료/권한 부족은 화면에 연결 오류로 표시합니다. 토큰 갱신 후 Vercel에서 재배포하세요.
