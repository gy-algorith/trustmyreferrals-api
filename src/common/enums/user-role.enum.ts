export enum UserRole {
  REFERRER = 'referrer',
  CANDIDATE = 'candidate'
}

export enum UserStatus {
  PENDING = 'pending',      // 가입 신청 후 승인 대기
  ACTIVE = 'active',        // 활성 상태
  SUSPENDED = 'suspended',  // 정지 상태
  INACTIVE = 'inactive',    // 비활성 상태
}
