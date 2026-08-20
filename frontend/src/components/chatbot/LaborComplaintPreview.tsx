import { useTranslation } from 'react-i18next'
import type { LaborComplaintFormData } from '../../api/contracts'
import { complaintPreviewGroups } from '../../complaint/presentation'

type LaborComplaintPreviewProps = {
  data: LaborComplaintFormData
  compact?: boolean
}

type PreviewRow = ReturnType<typeof complaintPreviewGroups>[number]['rows'][number]

function LaborComplaintPreview({ data, compact = false }: LaborComplaintPreviewProps) {
  const { t } = useTranslation()
  const groups = complaintPreviewGroups(data)
  const rows = new Map(groups.flatMap((group) => group.rows).map((row) => [row.fieldId, row]))
  const recipient = data.submission.recipientLaborOfficeName

  const row = (fieldId: string): PreviewRow => rows.get(fieldId) ?? { fieldId, label: '', value: null }

  const cell = (fieldId: string, options?: { valueColumns?: number; tall?: boolean }) => {
    const item = row(fieldId)
    return (
      <>
        <th scope="row">{item.label}</th>
        <td className={options?.tall ? 'document-long-field' : undefined} colSpan={options?.valueColumns ?? 1}>
          {item.value || '\u00a0'}
        </td>
      </>
    )
  }

  return (
    <div className={`hwpx-preview${compact ? ' compact' : ''}`} aria-label={t('complaint.previewAria')}>
      <p className="hwpx-preview-notice">{t('complaint.previewNotice')}</p>
      <article className="hwpx-preview-page">
        <header className="hwpx-preview-header">
          <h3>{t('draftReady.title')}</h3>
        </header>

        <section className="hwpx-preview-section">
          <h4>1. {t('complaintPreview.group.complainant')}</h4>
          <table>
            <tbody>
              <tr>
                {cell('complainant.fullName')}
                <th scope="row">{t('complaintPreview.residentRegistrationNumber')}</th>
                <td>{data.complainant.residentRegistrationNumber || '\u00a0'}</td>
              </tr>
              <tr>{cell('complainant.address', { valueColumns: 3 })}</tr>
              <tr>
                {cell('complainant.telephone')}
                {cell('complainant.mobilePhone')}
              </tr>
              <tr>{cell('complainant.email', { valueColumns: 3 })}</tr>
              <tr>
                {cell('complainant.receiveStatusUpdates')}
                {cell('complainant.notifyViaLaborPortal')}
              </tr>
            </tbody>
          </table>
        </section>

        <section className="hwpx-preview-section">
          <h4>2. {t('complaintPreview.group.respondent')}</h4>
          <table>
            <tbody>
              <tr>
                {cell('respondent.fullName')}
                {cell('respondent.contact')}
              </tr>
              <tr>{cell('respondent.address', { valueColumns: 3 })}</tr>
              <tr>{cell('respondent.workplaceType', { valueColumns: 3 })}</tr>
              <tr>{cell('respondent.workplaceName', { valueColumns: 3 })}</tr>
              <tr>{cell('respondent.actualWorkplaceAddress', { valueColumns: 3 })}</tr>
              <tr>
                {cell('respondent.workplaceTelephone')}
                {cell('respondent.employeeCount')}
              </tr>
            </tbody>
          </table>
        </section>

        <section className="hwpx-preview-section">
          <h4>3. {t('complaintPreview.group.complaint')}</h4>
          <table>
            <tbody>
              <tr>
                {cell('complaint.employmentStartDate')}
                {cell('complaint.employmentEndDate')}
              </tr>
              <tr>
                {cell('complaint.unpaidWagesTotal')}
                {cell('complaint.employmentStatus')}
              </tr>
              <tr>
                {cell('complaint.unpaidSeverancePay')}
                {cell('complaint.otherUnpaidAmount')}
              </tr>
              <tr>{cell('complaint.jobDescription', { valueColumns: 3 })}</tr>
              <tr>
                {cell('complaint.payday')}
                {cell('complaint.contractMethod')}
              </tr>
              <tr>{cell('complaint.details', { valueColumns: 3, tall: true })}</tr>
              <tr>{cell('complaint.attachmentFileNames', { valueColumns: 3 })}</tr>
            </tbody>
          </table>
        </section>

        <footer className="hwpx-preview-footer">
          <strong>({recipient || t('complaintPreview.recipientPlaceholder')})</strong>
          <span>{t('complaintPreview.submissionRecipient')}</span>
        </footer>
      </article>
    </div>
  )
}

export default LaborComplaintPreview
