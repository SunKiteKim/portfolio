# Kim's Warranty · things test runner

## 로컬 실행

Node.js 22 이상이 필요합니다.

```sh
npm ci
npx playwright install chromium
npm start
```

http://localhost:3000/project-cart.html 에서 **Trigger**를 누릅니다.
실제 things 사이트를 별도 Chromium 세션으로 테스트하며 우측에 진행 로그,
완료 후 하단에 단계별 결과·오류 상세·JSON 다운로드를 제공합니다.
새로고침하면 현재 실행에 다시 연결됩니다. Report 버튼은 완료된 결과로 이동합니다.

테스트 범위: 상품 목록 → 재고 2개 이상 상품 상세 → 장바구니 담기 → 수량 2개 및
합계 검증 → 새로고침 유지 → 삭제 및 빈 장바구니. 실제 주문이나 결제는 생성하지 않습니다.
선행 단계가 실패하면 후속 단계는 SKIPPED로 기록합니다.

## 배포

### Vercel + GitHub Actions (권장)

`vercel.json`, `api/`, `.github/workflows/things-e2e.yml`이 포함되어 있습니다.
Vercel은 실행 요청과 조회만 처리하고 Playwright는 GitHub runner에서 실행합니다.
진행 로그와 결과는 `test-reports` 브랜치에 저장하며 별도의 유료 디스크가 필요하지 않습니다.
계정 연결과 환경 변수 설정은 [Vercel 배포 안내](docs/vercel-deployment.md)를 참고하세요.
기존 Things Vercel 프로젝트와 분리하여 portfolio 저장소를 가져옵니다.

### 기존 Node.js 서버 배포

GitHub Pages 같은 정적 호스팅만으로는 Playwright를 실행할 수 없습니다.
Node.js와 Chromium을 실행할 서버에 이 프로젝트를 배포하세요.
Linux 서버에서는 `npx playwright install --with-deps chromium`으로 브라우저 의존성도 설치합니다.
`HOST=0.0.0.0`, `PORT=3000`, `ALLOWED_ORIGINS=https://포트폴리오주소`를 설정하고 HTTPS 역방향 프록시를 사용합니다.
포트폴리오와 API를 분리한다면 project-cart.html의 `test-api-base` 메타 태그에
API HTTPS 주소를 넣고, 서버의 ALLOWED_ORIGINS에 포트폴리오 origin을 등록합니다.
인증 토큰을 프런트엔드에 넣지 않습니다.

실행은 서버당 1개, 최소 실행 간격 30초, 최대 실행 시간 3분으로 제한합니다.
공개 배포 시 프록시에서 요청 제한을 추가하세요. 최근 20개 실행만 메모리에 보관하며
완료 결과는 `storage/runs`에 실행별 JSON 파일로 자동 저장합니다. History 버튼으로
최신순 게시판(20개씩)을 열고 각 실행의 상세 리포트를 다시 볼 수 있습니다.
서버를 재시작해도 완료 결과는 유지됩니다. 배포 서버에서는 `RUN_HISTORY_DIR`을
영구 볼륨 경로로 설정하세요. 저장 실패 시 터미널과 리포트에 안내가 표시됩니다.
서버 연결 실패를 테스트 통과로 표시하지 않습니다.

```sh
npm test
```
