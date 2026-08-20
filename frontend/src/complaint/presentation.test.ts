import { describe, expect, it } from 'vitest'
import type { LaborComplaintFormData } from '../api/contracts'
import { complaintPreviewGroups, requiredFieldProgress } from './presentation'

const emptyData: LaborComplaintFormData = {
  complainant: {
    fullName: null,
    residentRegistrationNumber: null,
    address: null,
    telephone: null,
    mobilePhone: null,
    email: null,
    receiveStatusUpdates: null,
    notifyViaLaborPortal: null,
  },
  respondent: {
    fullName: null,
    contact: null,
    address: null,
    workplaceType: null,
    workplaceName: null,
    actualWorkplaceAddress: null,
    workplaceTelephone: null,
    employeeCount: null,
  },
  complaint: {
    employmentStartDate: null,
    employmentEndDate: null,
    unpaidWagesTotal: null,
    employmentStatus: null,
    unpaidSeverancePay: null,
    otherUnpaidAmount: null,
    jobDescription: null,
    payday: null,
    contractMethod: null,
    details: null,
    attachmentFileNames: [],
  },
  submission: { recipientLaborOfficeName: null },
}

describe('complaint presentation', () => {
  it('uses the backend form structure instead of mock field values', () => {
    const data = structuredClone(emptyData)
    data.respondent.workplaceType = 'CONSTRUCTION_SITE'
    data.complaint.unpaidWagesTotal = 250000

    const rows = complaintPreviewGroups(data).flatMap((group) => group.rows)
    expect(rows.find((row) => row.fieldId === 'respondent.workplaceType')?.value).toBe('공사현장')
    expect(rows.find((row) => row.fieldId === 'complaint.unpaidWagesTotal')?.value).toBe('250,000원')
  })

  it('counts only required backend fields as completed', () => {
    const data = structuredClone(emptyData)
    data.complainant.fullName = 'TEST WORKER'
    data.complainant.email = 'optional@example.com'

    expect(requiredFieldProgress(data)).toEqual({ completed: 1, total: 12 })
  })
})
