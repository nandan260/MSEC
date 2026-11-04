/* Keep route controls in view while records scroll within their own workspace. */
let overviewSection = 'today';

function scrollRegion(element: HTMLElement, label: string): void {
  element.tabIndex = 0;
  if (!element.hasAttribute('role')) element.setAttribute('role', 'region');
  if (!element.hasAttribute('aria-label')) element.setAttribute('aria-label', label);
}

export function layoutWorkspace(main: HTMLElement, route: string, title: string): void {
  if (route === 'overview') {
    layoutOverview(main);
  } else {
    const workspace = document.createElement('div');
    workspace.className = 'workspace-content';
    for (const child of Array.from(main.children)) {
      if (child.matches('.page-heading, .toolbar, .stats, .tabs, .info, .footer')) continue;
      workspace.append(child);
    }
    const footer = main.querySelector('.footer');
    main.insertBefore(workspace, footer);
    scrollRegion(workspace, `${title} content`);
  }
  main.querySelectorAll<HTMLElement>('.panel, .card-grid, .table-wrap, .performance-board').forEach((element) => {
    scrollRegion(element, `${title} records`);
  });
}

function layoutOverview(main: HTMLElement): void {
  const groups = [
    { id: 'today', label: 'Today', selectors: ['.performance-board', '.schedule-panel', '.overview-tasks'] },
    { id: 'insights', label: 'Insights', selectors: ['.attendance-goal', '.health-card', '.subject-breakdown', '.teaching-tip'] },
    { id: 'workspace', label: 'Workspace', selectors: ['.teacher-panel'] }
  ];
  const tabs = document.createElement('div');
  tabs.className = 'workspace-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Overview sections');
  const body = document.createElement('div');
  body.className = 'overview-workspace';
  for (const group of groups) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `overview-tab-${group.id}`;
    tab.textContent = group.label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `overview-panel-${group.id}`);
    const panel = document.createElement('div');
    panel.id = `overview-panel-${group.id}`;
    panel.className = `overview-section overview-group-${group.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    for (const selector of group.selectors) {
      const element = main.querySelector(selector);
      if (element) panel.append(element);
    }
    tab.addEventListener('click', () => select(group.id));
    tabs.append(tab);
    body.append(panel);
  }
  function select(id: string): void {
    overviewSection = id;
    groups.forEach((group) => {
      const tab = tabs.querySelector<HTMLButtonElement>(`#overview-tab-${group.id}`)!;
      const selected = group.id === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      body.querySelector<HTMLElement>(`#overview-panel-${group.id}`)!.hidden = !selected;
    });
  }
  tabs.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = groups.findIndex((group) => group.id === overviewSection);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? groups.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length;
    select(groups[index].id);
    tabs.querySelector<HTMLButtonElement>(`#overview-tab-${overviewSection}`)!.focus();
  });
  main.querySelector('.finance-grid')?.remove();
  main.querySelector('.desk-section-heading')?.remove();
  const footer = main.querySelector('.footer');
  main.insertBefore(tabs, footer);
  main.insertBefore(body, footer);
  select(overviewSection);
}
