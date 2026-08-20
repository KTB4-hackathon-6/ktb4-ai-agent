import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import i18n from '../i18n'
import { MAX_PROCESSED_UPLOAD_BYTES } from '../upload/files'
import { toPixelBox } from './geometry'
import type { RedactionPage, RedactionPreparationProgress } from './types'

const MAX_LONG_EDGE = 2500
const JPEG_QUALITY = 0.92

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = JPEG_QUALITY) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error(i18n.t('redaction.error.image')))
    }, type, quality)
  })
}

async function renderImage(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error(i18n.t('redaction.error.display'))
    context.drawImage(bitmap, 0, 0, width, height)
    return { blob: await canvasToBlob(canvas), width, height }
  } finally {
    bitmap.close()
  }
}

async function renderPdf(file: File) {
  const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  const bytes = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data: bytes }).promise
  const pages: Array<{ blob: Blob; width: number; height: number }> = []

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = Math.min(3, MAX_LONG_EDGE / Math.max(baseViewport.width, baseViewport.height))
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.floor(viewport.width))
      canvas.height = Math.max(1, Math.floor(viewport.height))
      const context = canvas.getContext('2d')
      if (!context) throw new Error(i18n.t('redaction.error.displayPdf'))
      await page.render({ canvas, canvasContext: context, viewport }).promise
      pages.push({
        blob: await canvasToBlob(canvas),
        width: canvas.width,
        height: canvas.height,
      })
      page.cleanup()
    }
  } finally {
    await pdf.destroy()
  }

  return pages
}

export async function prepareRedactionPages(
  files: File[],
  onProgress?: (progress: RedactionPreparationProgress) => void,
): Promise<RedactionPage[]> {
  const pages: RedactionPage[] = []
  let completedPages = 0

  try {
    for (const [sourceIndex, file] of files.entries()) {
      const renderedPages = file.type === 'application/pdf'
        ? await renderPdf(file)
        : [await renderImage(file)]

      for (const [pageIndex, rendered] of renderedPages.entries()) {
        completedPages += 1
        const previewUrl = URL.createObjectURL(rendered.blob)
        pages.push({
          id: `document-${sourceIndex + 1}-page-${pageIndex + 1}`,
          sourceIndex,
          pageIndex,
          width: rendered.width,
          height: rendered.height,
          imageBlob: rendered.blob,
          previewUrl,
          regions: [],
          confirmed: false,
        })
        onProgress?.({ completedPages, totalPages: null })
      }
    }
  } catch (error) {
    releaseRedactionPages(pages)
    throw error
  }

  if (pages.length === 0) throw new Error(i18n.t('redaction.error.noPages'))
  return pages
}

export function releaseRedactionPages(pages: RedactionPage[]) {
  pages.forEach((page) => URL.revokeObjectURL(page.previewUrl))
}

export async function exportRedactedFiles(pages: RedactionPage[]) {
  const files: File[] = []
  let totalBytes = 0

  for (const [index, page] of pages.entries()) {
    const bitmap = await createImageBitmap(page.imageBlob)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = page.width
      canvas.height = page.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error(i18n.t('redaction.error.maskImage'))
      context.drawImage(bitmap, 0, 0, page.width, page.height)
      context.fillStyle = '#000000'
      page.regions.forEach((region) => {
        const box = toPixelBox(region.box, page.width, page.height)
        const margin = 2
        context.fillRect(
          Math.max(0, box.x - margin),
          Math.max(0, box.y - margin),
          Math.min(page.width - box.x + margin, box.width + margin * 2),
          Math.min(page.height - box.y + margin, box.height + margin * 2),
        )
      })
      const blob = await canvasToBlob(canvas)
      totalBytes += blob.size
      if (totalBytes > MAX_PROCESSED_UPLOAD_BYTES) {
        throw new Error(i18n.t('redaction.error.tooLarge'))
      }
      files.push(new File([blob], `document-page-${index + 1}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }))
    } finally {
      bitmap.close()
    }
  }

  return files
}
