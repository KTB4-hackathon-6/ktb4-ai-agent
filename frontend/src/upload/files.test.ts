import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_BYTES,
  MAX_SELECTED_FILES_BYTES,
  mergeUploadFiles,
  removeUploadFile,
} from './files'

function file(name: string, type: string, lastModified = 1, size = 6) {
  return new File([new Uint8Array(size)], name, { type, lastModified })
}

describe('mergeUploadFiles', () => {
  it('accepts JPG, PNG and PDF files from either picker or drop', () => {
    const result = mergeUploadFiles([], [
      file('contract.jpg', 'image/jpeg'),
      file('payslip.png', 'image/png'),
      file('statement.pdf', 'application/pdf'),
    ])

    expect(result.files.map((item) => item.name)).toEqual(['contract.jpg', 'payslip.png', 'statement.pdf'])
    expect(result.rejected).toEqual([])
  })

  it('rejects unsupported files and removes exact duplicates', () => {
    const contract = file('contract.pdf', 'application/pdf', 10)
    const result = mergeUploadFiles([contract], [contract, file('notes.txt', 'text/plain')])

    expect(result.files).toEqual([contract])
    expect(result.rejected).toEqual([{
      file: expect.objectContaining({ name: 'notes.txt' }),
      reason: 'unsupported_type',
    }])
  })

  it('rejects a file larger than the backend per-file limit', () => {
    const oversized = file('large.jpg', 'image/jpeg', 1, MAX_FILE_BYTES + 1)

    const result = mergeUploadFiles([], [oversized])

    expect(result.files).toEqual([])
    expect(result.rejected).toEqual([{ file: oversized, reason: 'file_too_large' }])
  })

  it('accepts files at the backend request-size boundary', () => {
    const first = file('front.jpg', 'image/jpeg', 1, 6 * 1024 * 1024)
    const second = file(
      'back.jpg',
      'image/jpeg',
      2,
      MAX_SELECTED_FILES_BYTES - first.size,
    )

    const result = mergeUploadFiles([], [first, second])

    expect(result.files).toEqual([first, second])
    expect(result.rejected).toEqual([])
  })

  it('rejects files that would exceed the backend request limit', () => {
    const first = file('front.jpg', 'image/jpeg', 1, 6 * 1024 * 1024)
    const second = file(
      'back.jpg',
      'image/jpeg',
      2,
      MAX_SELECTED_FILES_BYTES - first.size + 1,
    )

    const result = mergeUploadFiles([first], [second])

    expect(result.files).toEqual([first])
    expect(result.rejected).toEqual([{ file: second, reason: 'request_too_large' }])
  })

  it('removes only the selected file identity', () => {
    const contract = file('contract.pdf', 'application/pdf', 10)
    const payslip = file('payslip.pdf', 'application/pdf', 20)

    expect(removeUploadFile([contract, payslip], contract)).toEqual([payslip])
  })
})
