# Trust United API

## 프로젝트 개요

Trust United는 추천인(Referrer)과 후보자(Candidate)를 연결하는 플랫폼입니다. 추천인은 채용 담당자, 헤드헌터 등이며, 후보자는 구직자입니다.

## 핵심 기능

### 사용자 역할

#### Referrer (추천인)
- 채용 담당자, 헤드헌터 등
- 어드민 승인 후 가입 가능
- 후보자 추천 및 관리

#### Candidate (후보자)
- 구직자
- 추천인의 추천링크를 통해 가입
- 이력서 작성 및 관리

### 주요 기능

#### 후보자 기능
- 내 Referrers 보기
- 추천인과 채팅
- 이력서 작성, 수정, 조회
- 내 상태 업데이트
- 구독 및 결제

#### 추천인 기능
- 내 deck (추천한 후보자 또는 검색해서 등록한 후보자들)
- Invitation Link 생성
- Requirements 등록 (title, overview, require skills, location 등)
- 내 Requirements 조회 및 종료
- 다른 Requirements 조회 및 제안 (후보자, 헤드라인, 스킬, 이유, 첨부파일, 가격)
- 구독 및 결제 (Stripe)
- Stripe 기능: add funds, connect(onboarding), withdraw
- 활동 기록

## 기술 스택

- **Backend Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT + Passport
- **Documentation**: Swagger
- **Payment**: Stripe
- **Cloud**: AWS (S3, SES)
- **Caching**: Redis (로컬 메모리로 시작, 추후 Redis로 전환 가능)

## 아키텍처 설계

### 인증 시스템
- 단일 인증 + 다중 역할 (RBAC)
- 역할별 Profile 분리
- JWT 기반 인증 (세션 고려 중)
- 역할별 가드 (Referrer, Candidate)
- 구독별 가드

### 데이터베이스 설계
- 사용자 테이블 (공통)
- 역할별 프로필 테이블
- 구독 정보 테이블
- Requirements 테이블
- 제안 테이블
- 채팅 테이블

## 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- PostgreSQL 14+
- AWS CLI

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env

# 데이터베이스 마이그레이션
npm run migration:run

# 개발 서버 실행
npm run start:dev
```

## API 문서

Swagger UI를 통해 API 문서를 확인할 수 있습니다:
- 개발 환경: http://localhost:3000/api
- 프로덕션: https://your-domain.com/api

## 프로젝트 구조

```
src/
├── auth/           # 인증 관련 모듈
├── users/          # 사용자 관리
├── profiles/       # 프로필 관리
├── subscriptions/  # 구독 관리
├── requirements/   # 요구사항 관리
├── proposals/      # 제안 관리
├── chat/           # 채팅 기능
├── payments/       # 결제 관련
├── common/         # 공통 모듈
└── config/         # 설정 파일
```

## 개발 가이드라인

### 코드 스타일
- ESLint + Prettier 사용
- TypeScript strict mode
- NestJS 컨벤션 준수

### 테스트
- 필요시에만 테스트 코드 작성
- Jest 기반 테스트 환경

### 마이그레이션
- TypeORM 마이그레이션 사용
- 데이터베이스 스키마 변경 시 마이그레이션 파일 생성

## 배포

### AWS 배포
- AWS CLI를 통한 배포
- S3, SES, RDS 등 AWS 서비스 활용

### 환경별 설정
- 개발, 스테이징, 프로덕션 환경 분리
- 환경별 환경 변수 관리

## 라이센스

UNLICENSED
