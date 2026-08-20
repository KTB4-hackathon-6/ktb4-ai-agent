const acceptedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf'])

function sameFile(left: File, right: File) {
  return left.name === right.name
    && left.size === right.size
    && left.lastModified === right.lastModified
}

export function mergeUploadFiles(existing: File[], incoming: File[]) {
  const files = [...existing]
  const rejected: File[] = []

  incoming.forEach((file) => {
    if (!acceptedTypes.has(file.type)) {
      rejected.push(file)
      return
    }
    if (!files.some((current) => sameFile(current, file))) files.push(file)
  })

  return { files, rejected }
}

export function removeUploadFile(files: File[], target: File): File[] {
  return files.filter((file) => !sameFile(file, target))
}
