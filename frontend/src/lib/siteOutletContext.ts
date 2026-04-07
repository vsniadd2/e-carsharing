export type MapUiState = {
  mapQuery: string
  setMapQuery: (q: string) => void
  mapFilterOpen: boolean
  setMapFilterOpen: (v: boolean | ((b: boolean) => boolean)) => void
  mapOnlyAvailable: boolean
  setMapOnlyAvailable: (v: boolean) => void
}

export type SiteOutletContext = {
  mapUi?: MapUiState
}
