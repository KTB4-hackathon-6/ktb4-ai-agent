const acceptedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf'])
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_SELECTED_FILES_BYTES = 11 * 1024 * 1024
export const MAX_PROCESSED_UPLOAD_BYTES = MAX_FILE_BYTES

export type UploadRejectionReason = 'unsupported_type' | 'file_too_large' | 'request_too_large'

export type RejectedUploadFile = {
  file: File
  reason: UploadRejectionReason
}

function sameFile(left: File, right: File) {
  return left.name === right.name
    && left.size === right.size
    && left.lastModified === right.lastModified
}

export function mergeUploadFiles(existing: File[], incoming: File[]) {
  const files = [...existing]
  const rejected: RejectedUploadFile[] = []
  let totalBytes = files.reduce((sum, file) => sum + file.size, 0)

  incoming.forEach((file) => {
    if (!acceptedTypes.has(file.type)) {
      rejected.push({ file, reason: 'unsupported_type' })
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      rejected.push({ file, reason: 'file_too_large' })
      return
    }
    if (files.some((current) => sameFile(current, file))) return
    if (totalBytes + file.size > MAX_SELECTED_FILES_BYTES) {
      rejected.push({ file, reason: 'request_too_large' })
      return
    }
    files.push(file)
    totalBytes += file.size
  })

  return { files, rejected }
}

export function removeUploadFile(files: File[], target: File): File[] {
  return files.filter((file) => !sameFile(file, target))
}
