export type NormalizedBox = {
  x: number
  y: number
  width: number
  height: number
}

export type RedactionRegion = {
  id: string
  box: NormalizedBox
}

export type RedactionPage = {
  id: string
  sourceIndex: number
  pageIndex: number
  width: number
  height: number
  imageBlob: Blob
  previewUrl: string
  regions: RedactionRegion[]
  confirmed: boolean
}

export type RedactionPreparationProgress = {
  completedPages: number
  totalPages: number | null
}
