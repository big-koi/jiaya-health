export type FamilyRole = 'owner' | 'manager' | 'member'

export type FamilyMembershipDTO = {
  id: string
  familyId: string
  userId: string
  role: FamilyRole
  status: 'active' | 'inactive'
  createdAt: string
}

export type FamilySummaryDTO = {
  id: string
  name: string
  avatar: string | null
  ownerUserId: string
  memberCount: number
}

export type FamilyDTO = FamilySummaryDTO & {
  createdAt: string
  updatedAt: string
}

export type CreateFamilyRequest = {
  name: string
  avatar?: string | null
}
