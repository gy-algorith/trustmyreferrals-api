# Auth API Test Page

이 페이지는 Trust United API의 다양한 엔드포인트를 테스트할 수 있는 웹 인터페이스입니다.

## 파일 구조

```
web_test/
├── index.html              # 메인 HTML 파일
├── styles.css              # CSS 스타일
├── js/
│   ├── tab-manager.js      # 탭 관리 기능
│   ├── auth-functions.js   # 인증 관련 함수들
│   ├── resume-functions.js # 이력서 관련 함수들
│   ├── requirements-functions.js # 요구사항 관련 함수들
│   ├── payment-functions.js # 결제 관련 함수들
│   └── main.js            # 메인 JavaScript 파일
├── tabs/                   # 탭별 HTML 콘텐츠
│   ├── referrer.html      # Referrer 등록
│   ├── candidate.html     # Candidate 등록
│   ├── login.html         # 로그인
│   ├── password.html      # 비밀번호 재설정
│   ├── user-updates.html  # 사용자 업데이트
│   ├── resume.html        # 이력서 관리
│   ├── deck.html          # 덱 관리
│   ├── requirements.html  # 요구사항 관리
│   ├── payment.html       # 결제 관리
│   └── test.html          # 테스트 API
└── README.md              # 이 파일
```

## 주요 기능

### 1. 인증 (Authentication)
- **Referrer 등록**: 이메일 인증을 통한 추천인 등록
- **Candidate 등록**: 추천인 코드를 통한 후보자 등록
- **로그인**: 역할별 로그인 (Referrer, Candidate, Admin)
- **비밀번호 재설정**: 이메일을 통한 비밀번호 재설정

### 2. 이력서 관리 (Resume Management)
- **이력서 섹션 관리**: 전문 요약, 경력, 교육, 스킬, 수상 내역
- **PDF 파싱**: AI 기반 PDF 이력서 자동 파싱
- **검증**: 추천인을 통한 이력서 검증 및 피드백

### 3. 요구사항 관리 (Requirements Management)
- **구인 요구사항 작성**: 직무 설명, 필요 스킬, 위치 등
- **요구사항 검색**: 스킬, 위치, 근무 방식별 검색
- **응답 관리**: 후보자 제안 및 승인/거절

### 4. 결제 관리 (Payment Management)
- **Stripe Connect**: 결제 수령을 위한 계정 연동
- **자금 추가**: 계정에 자금 추가
- **잔액 확인**: 현재 계정 잔액 및 대기 중인 금액
- **자금 인출**: 은행 계좌로 자금 인출

### 5. 덱 관리 (Deck Management)
- **내 덱 보기**: 초대한 후보자 목록 확인
- **페이지네이션**: 대량의 후보자 데이터 처리

## 사용 방법

1. **브라우저에서 `index.html` 열기**
2. **원하는 탭 선택**
3. **API 테스트 실행**

## API 엔드포인트

### 인증
- `/api/v1/auth/email/send-verification` - 이메일 인증 코드 발송
- `/api/v1/auth/email/verify` - 인증 코드 확인
- `/api/v1/auth/register/referrer` - 추천인 등록
- `/api/v1/auth/register/candidate` - 후보자 등록
- `/api/v1/auth/login` - 로그인
- `/api/v1/auth/forgot-password` - 비밀번호 재설정 요청
- `/api/v1/auth/reset-password` - 비밀번호 재설정

### 이력서
- `/api/v1/resume-sections/*` - 이력서 섹션 관리
- `/api/v1/resume/parse-pdf` - PDF 이력서 파싱
- `/api/v1/resume/section/*/validation` - 이력서 검증

### 요구사항
- `/api/v1/requirements` - 구인 요구사항 CRUD
- `/api/v1/requirements/*/respond` - 요구사항에 응답
- `/api/v1/requirements/*/responses` - 응답 목록 조회

### 결제
- `/api/v1/payment/connect-link` - Stripe Connect 링크 생성
- `/api/v1/payment/add-fund` - 자금 추가
- `/api/v1/payment/balance` - 잔액 확인
- `/api/v1/payment/withdraw` - 자금 인출

## 주의사항

- 모든 API 호출은 CORS 정책을 준수해야 합니다
- 인증이 필요한 API는 JWT 토큰을 Authorization 헤더에 포함해야 합니다
- 파일 업로드는 10MB 이하의 PDF 파일만 지원합니다
- 결제 관련 API는 Stripe 계정 연동이 필요합니다

## 개발자 정보

이 테스트 페이지는 jQuery를 사용하여 작성되었으며, 모던 브라우저에서 최적의 성능을 제공합니다
