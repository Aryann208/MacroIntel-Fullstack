# MacroIntel Domain Model

## Core concepts

MacroSeries- Reoccuring Economic events like CPI , NFP , FOMC .
MacroObservation- The published data for each event seperately

## Time semantics

observedAt - tells about the month/day the event is based on
vintageAt- tells about the datetime , the release happened
ingestedAt- tells when the data was ingested

## Access patterns

| ID  | Operation                                               | Equality fields | Range fields | Sort fields | Why needed |
| --- | ------------------------------------------------------- | --------------- | ------------ | ----------- | ---------- |
| AP1 | Find a provider series by external identifier           |                 |              |             |            |
| AP2 | List active series by country and category              |                 |              |             |            |
| AP3 | Fetch observations for one series over a date range     |                 |              |             |            |
| AP4 | Fetch the latest vintage for an observation date        |                 |              |             |            |
| AP5 | List events between two UTC timestamps                  |                 |              |             |            |
| AP6 | Filter events by country and importance, sorted by time |                 |              |             |            |
