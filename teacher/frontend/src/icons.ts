const paths: Record<string, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  book: 'M3 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H3z M21 4h-6a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h5z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  check: 'M20 6 9 17l-5-5',
  clipboard: 'M9 4H5v17h14V4h-4 M9 2h6v5H9z M8 12h8 M8 16h5',
  file: 'M14 2H4v20h16V8z M14 2v6h6 M8 13h8 M8 17h5',
  chart: 'M4 19h16 M7 15V9 M12 15V4 M17 15v-4',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z M20 2v4 M18 4h4',
  folder: 'M3 7V4h6l2 3h10v13H3z',
  calendar: 'M4 5h16v16H4z M16 3v4 M8 3v4 M4 11h16',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  trend: 'm3 17 6-6 4 4 8-10 M15 5h6v6',
  message: 'M21 3H3v14h5l4 4 4-4h5z M7 8h10 M7 12h6',
  mail: 'M3 5h18v14H3z m0 0 9 7 9-7',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 6v6l4 2',
  download: 'M12 3v12 m-5-5 5 5 5-5 M4 17v4h16v-4',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
  search: 'M21 21l-5-5 M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
  arrow: 'M5 12h14 m-5-5 5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  plus: 'M12 5v14 M5 12h14',
  close: 'm6 6 12 12 M6 18 18 6',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  logout: 'M9 3H3v18h6 M10 12h11 m-4-4 4 4-4 4',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0 M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  upload: 'M12 16V3 m-5 5 5-5 5 5 M4 17v4h16v-4',
  cap: 'm2 9 10-6 10 6-10 6z M6 12v6c4 3 8 3 12 0v-6 M22 9v8',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17h.01',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01'
};

export const icon = (name: string, cls = ''): string =>
  `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(paths[name] || paths.book)
    .split(' M')
    .map((p, i) => `<path d="${i ? 'M' : ''}${p}"/>`)
    .join('')}</svg>`;
