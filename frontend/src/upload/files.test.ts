import { describe, expect, it } from 'vitest'
import { mergeUploadFiles, removeUploadFile } from './files'

function file(name: string, type: string, lastModified = 1) {
  return new File(['sample'], name, { type, lastModified })
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
    expect(result.rejected.map((item) => item.name)).toEqual(['notes.txt'])
  })

  it('removes only the selected file identity', () => {
    const contract = file('contract.pdf', 'application/pdf', 10)
    const payslip = file('payslip.pdf', 'application/pdf', 20)

    expect(removeUploadFile([contract, payslip], contract)).toEqual([payslip])
  })
})
