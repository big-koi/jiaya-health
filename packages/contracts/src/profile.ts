export type Gender = 'male' | 'female' | 'other'

export type HealthProfileSummary = {
  id: string
  familyId: string
  name: string
  avatar: string | null
  elderMode: boolean
}

export type HealthProfileDTO = HealthProfileSummary & {
  familyId: string
  linkedUserId: string | null
  gender: Gender | null
  birthday: string | null
  relationship: string | null
  status: 'active' | 'inactive'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type ProfilePermissionDTO = {
  profileId: string
  userId: string
  canView: boolean
  canRecord: boolean
  canManageReminder: boolean
  canManageProfile: boolean
  canReceiveAttention: boolean
}

export type CreateHealthProfileRequest = {
  familyId: string
  name: string
  avatar?: string | null
  gender?: Gender | null
  birthday?: string | null
  relationship?: string | null
  elderMode?: boolean
}

export type UpdateHealthProfileRequest = Partial<
  Omit<CreateHealthProfileRequest, 'familyId'>
>

export type UpdateProfilePermissionRequest = Omit<
  ProfilePermissionDTO,
  'profileId' | 'userId'
>

export type SetProfilePermissionRequest = UpdateProfilePermissionRequest & {
  userId: string
}
