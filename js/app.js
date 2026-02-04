import * as storage from './storage.js';

// State management
let currentView = 'projects';
const DEFAULT_VIEW = 'projects';
const VIEW_HASH_MAP = {
  projects: '#initiatives',
  tasks: '#tasks',
  capacity: '#capacity',
  progress: '#progress',
  requirements: '#requirements',
  settings: '#settings',
};
const HASH_VIEW_MAP = Object.fromEntries(
  Object.entries(VIEW_HASH_MAP).map(([view, hash]) => [hash.toLowerCase(), view])
);
// Redirect legacy hashes to initiatives
HASH_VIEW_MAP['#projects'] = 'projects';
HASH_VIEW_MAP['#milestones'] = 'projects';
const state = {
  projects: [],
  expandedProjects: new Set(),
  editingProjects: new Set(),
  editingMilestones: new Set(),
  editingTasks: new Set(),
  editingRequirements: new Set(),
  editingFunctionalRequirements: new Set(),
  showAddMilestone: new Map(),
  showAddTask: new Map(),
  editingMetadata: new Map(), // For editing metadata items in settings
  taskSearch: '',
  taskFilterStatus: '',
  taskFilterProject: '',
  taskFilterResource: '',
  capacityFilterProject: '',
  capacityFilterMilestone: '',
  capacityFilterRequirement: '',
  capacityFilterFunctionalRequirement: '',
  capacityFilterStatus: '',
  progressFilterProject: '',
  progressFilterMilestone: '',
  progressFilterStartDate: '',
  progressFilterEndDate: '',
  milestoneSearch: '',
  milestoneFilterProject: '',
  milestoneSortColumn: '',
  milestoneSortDirection: 'asc',
  requirementSearch: '',
  requirementFilterProject: '',
  requirementFilterType: '',
  requirementFilterPriority: '',
  requirementFilterMilestone: '',
  requirementSortColumn: '',
  requirementSortDirection: 'asc',
  functionalRequirementSearch: '',
  functionalRequirementFilterProject: '',
  functionalRequirementSortColumn: '',
  functionalRequirementSortDirection: 'asc',
  taskSortColumn: '',
  taskSortDirection: 'asc',
  projectSearch: '',
  projectSortColumn: '',
  projectSortDirection: 'asc',
  activeRequirementLinkId: null,
  activeFunctionalRequirementId: null,
  activeMilestoneId: null,
};

let isUpdatingRequirementProjectFilter = false;
let isUpdatingFunctionalRequirementProjectFilter = false;
let isUpdatingRequirementPriorityFilter = false;
let isUpdatingRequirementMilestoneFilter = false;

// DOM elements
const elements = {
  loading: document.getElementById('loading'),
  projectsView: document.getElementById('projects-view'),
  milestonesView: document.getElementById('milestones-view'),
  tasksView: document.getElementById('tasks-view'),
  requirementsView: document.getElementById('requirements-view'),
  functionalRequirementsView: document.getElementById('functional-requirements-view'),
  settingsView: document.getElementById('settings-view'),
  projectsList: document.getElementById('projects-list'),
  milestonesList: document.getElementById('milestones-list'),
  tasksList: document.getElementById('tasks-list'),
  requirementsList: document.getElementById('requirements-list'),
  functionalRequirementsList: document.getElementById('functional-requirements-list'),
  requirementsProgressView: document.getElementById('requirements-progress-view'),
  functionalRequirementsProgressView: document.getElementById('functional-requirements-progress-view'),
  capacityView: document.getElementById('capacity-view'),
  capacityList: document.getElementById('capacity-list'),
  capacityFilterStatus: document.getElementById('capacity-filter-status'),
  capacityFilterProject: document.getElementById('capacity-filter-project'),
  capacityFilterMilestone: document.getElementById('capacity-filter-milestone'),
  capacityFilterRequirement: document.getElementById('capacity-filter-requirement'),
  capacityFilterFunctionalRequirement: document.getElementById('capacity-filter-functional-requirement'),
  progressView: document.getElementById('progress-view'),
  progressFilterProject: document.getElementById('progress-filter-project'),
  progressFilterMilestone: document.getElementById('progress-filter-milestone'),
  progressFilterStartDate: document.getElementById('progress-filter-start-date'),
  progressFilterEndDate: document.getElementById('progress-filter-end-date'),
  progressTasksChart: document.getElementById('progress-tasks-chart'),
  progressEffortChart: document.getElementById('progress-effort-chart'),
  progressEffortLegend: document.getElementById('progress-effort-legend'),
  progressBurndownChart: document.getElementById('progress-burndown-chart'),
  progressTotalEffort: document.getElementById('progress-total-effort'),
  progressEffortLeft: document.getElementById('progress-effort-left'),
  newProjectBtn: document.getElementById('new-project-btn'),
  newProjectForm: document.getElementById('new-project-form'),
  newMilestoneBtn: document.getElementById('new-milestone-btn'),
  newMilestoneForm: document.getElementById('new-milestone-form'),
  newTaskBtn: document.getElementById('new-task-btn'),
  newTaskForm: document.getElementById('new-task-form'),
  newRequirementBtn: document.getElementById('new-requirement-btn'),
  newRequirementForm: document.getElementById('new-requirement-form'),
  newFunctionalRequirementBtn: document.getElementById('new-functional-requirement-btn'),
  newFunctionalRequirementForm: document.getElementById('new-functional-requirement-form'),
  // Settings elements
  usersList: document.getElementById('users-list'),
  stakeholdersList: document.getElementById('stakeholders-list'),
  prioritiesList: document.getElementById('priorities-list'),
  statusesList: document.getElementById('statuses-list'),
  effortLevelsList: document.getElementById('effort-levels-list'),
  workspaceTitle: document.getElementById('workspace-title'),
  workspaceNameInput: document.getElementById('workspace-name-input'),
  workspaceNameForm: document.getElementById('workspace-name-form'),
};

const progressDatePickers = { start: null, end: null };

const csvTemplates = {
  milestones: {
    headers: ['Initiative Title', 'Milestone Title', 'Description', 'Target Date (YYYY-MM-DD)'],
    sampleRow: ['Plan-E Platform', 'Platform Launch', 'Deliver MVP functionality', '2025-12-31'],
  },
  requirements: {
    headers: ['Initiative Title', 'Tracking ID', 'Objective Name', 'Type', 'Requirement Title', 'Acceptance Criteria', 'Risk'],
    sampleRow: ['Plan-E Platform', 'REQ-101', 'Improve security', 'user', 'Users can sign in', 'Allow secure authentication before showing dashboards', 'high'],
  },
  functionalRequirements: {
    headers: ['Initiative Title', 'Requirement Title', 'Description', 'Type'],
    sampleRow: ['Plan-E Platform', 'User authentication API', 'Implement OAuth flow for sign-in', 'system'],
  },
  tasks: {
    headers: ['Initiative Title', 'Milestone Title', 'Requirement Title', 'Task Title', 'Description', 'Effort Level', 'Assigned Resource', 'Due Date (YYYY-MM-DD)', 'Status'],
    sampleRow: ['Plan-E Platform', 'Platform Launch', 'User authentication API', 'Create sign-in endpoint', 'Build endpoint to validate credentials', 'Medium', 'Jane Doe', '2025-12-15', 'In Progress'],
  },
};

const milestoneExportHeaders = ['Initiative Title', 'Milestone Title', 'Description', 'Target Date (YYYY-MM-DD)', 'Tasks Completed', 'Total Tasks', 'Progress (%)'];
const requirementExportHeaders = ['Initiative Title', 'Tracking ID', 'Objective', 'Type', 'Requirement Title', 'Acceptance Criteria', 'Risk', 'Linked Tasks', 'Effort (pts)'];
const functionalRequirementExportHeaders = ['Initiative Title', 'Requirement Title', 'Description', 'Type', 'Linked Tasks', 'Progress (%)'];
const taskExportHeaders = ['Initiative Title', 'Milestone Title', 'Requirement Title', 'Task Title', 'Description', 'Effort', 'Assigned Resource', 'Due Date (YYYY-MM-DD)', 'Status'];

function escapeCsvValue(value) {
  const stringValue = value === undefined || value === null ? '' : String(value);
  if (/["\r\n,]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function formatDateForExport(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().split('T')[0];
}

function downloadCsv(fileName, headers, rows) {
  const lines = [headers, ...rows].map(row => row.map(escapeCsvValue).join(','));
  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function parseCsv(csvText) {
  const sanitized = csvText.replace(/^\uFEFF/, '').replace(/\r/g, '\n');
  const lines = sanitized.split('\n').map(line => line.trim()).filter(line => line !== '');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = parseCsvLine(lines[0]).map(header => header.trim());
  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      const key = header.toLowerCase().trim();
      row[key] = values[index] !== undefined ? values[index].trim() : '';
    });
    return row;
  }).filter(row => Object.values(row).some(value => value !== ''));
  return { headers, rows };
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function getRowValue(row, aliases) {
  if (!row || !Array.isArray(aliases)) return '';
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().trim();
    if (!normalizedAlias) continue;
    if (Object.prototype.hasOwnProperty.call(row, normalizedAlias)) {
      return row[normalizedAlias];
    }
  }
  return '';
}

function findProjectByTitle(title) {
  if (!title) return null;
  const normalizedTitle = title.trim().toLowerCase();
  return storage.getAllProjects().find(project => (project.title || '').trim().toLowerCase() === normalizedTitle) || null;
}

function findMilestoneByTitle(projectId, title) {
  if (!projectId || !title) return null;
  const project = storage.getProject(projectId);
  if (!project || !project.milestones) return null;
  const normalizedTitle = title.trim().toLowerCase();
  return project.milestones.find(m => (m.title || '').trim().toLowerCase() === normalizedTitle) || null;
}

function findRequirementByTitle(projectId, title) {
  if (!projectId || !title) return null;
  const normalizedTitle = title.trim().toLowerCase();
  return storage.getAllRequirements().find(req => req.projectId === projectId && (req.title || '').trim().toLowerCase() === normalizedTitle) || null;
}

function findFunctionalRequirementByTitle(projectId, title) {
  if (!projectId || !title) return null;
  const normalizedTitle = title.trim().toLowerCase();
  return storage.getAllFunctionalRequirements().find(fr => fr.projectId === projectId && (fr.title || '').trim().toLowerCase() === normalizedTitle) || null;
}

function resolvePriorityId(value) {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  const match = storage.getPriorities().find(p => p.id.toLowerCase() === normalized || p.label.toLowerCase() === normalized);
  return match ? match.id : '';
}

function resolveStatusId(value) {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  const match = storage.getStatuses().find(s => s.id.toLowerCase() === normalized || s.label.toLowerCase() === normalized);
  return match ? match.id : '';
}

function resolveEffortLevelId(value) {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  const match = storage.getEffortLevels().find(e => e.id.toLowerCase() === normalized || e.label.toLowerCase() === normalized);
  return match ? match.id : '';
}

function reportCsvImportResult(label, imported, errors) {
  if (!imported && errors.length === 0) {
    alert(`No rows were imported for ${label}.`);
    return;
  }

  let message = `${label} import complete. Imported ${imported} row${imported === 1 ? '' : 's'}.`;
  if (errors.length > 0) {
    console.warn(`[Plan-E CSV Import] ${label} errors:`, errors);
    message += ` ${errors.length} row${errors.length === 1 ? '' : 's'} could not be imported. Check console for details.`;
  }
  alert(message);
}

const PAGE_TITLE_SUFFIX = ' - Project Planning Tool';

// Initialize app
function init() {
  try {
    loadProjects();
    setupEventListeners();
    updateAllSelects(); // Initialize all selects with metadata
    updateWorkspaceTitle();
    initializeViewFromHash(); // Sync view with URL hash state
  } catch (error) {
    console.error('Error during initialization:', error);
  } finally {
    hideLoading(); // Always hide loading, even if there's an error
  }
}

function hideLoading() {
  if (elements.loading) {
    elements.loading.style.display = 'none';
  }
}

function updateWorkspaceTitle() {
  const workspaceName = storage.getWorkspaceName();
  if (elements.workspaceTitle) {
    elements.workspaceTitle.textContent = workspaceName;
  }

  if (typeof document !== 'undefined') {
    document.title = `${workspaceName}${PAGE_TITLE_SUFFIX}`;
  }
}

function loadProjects() {
  try {
    refreshProjectsState();
    renderProjects();
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

function refreshProjectsState() {
  state.projects = storage.getAllProjects();
}

function normalizeHashValue(hash) {
  if (!hash) return '';
  const trimmed = String(hash).trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function getViewFromHash(hash) {
  const normalized = normalizeHashValue(hash);
  if (!normalized) return null;
  return HASH_VIEW_MAP[normalized] || null;
}

function getHashForView(viewName) {
  return VIEW_HASH_MAP[viewName] ?? VIEW_HASH_MAP[DEFAULT_VIEW];
}

function updateHashForView(viewName, { replace = false } = {}) {
  if (typeof window === 'undefined' || !window.location) return false;
  const targetHash = normalizeHashValue(getHashForView(viewName));
  if (!targetHash) return false;
  const baseUrl = `${window.location.pathname}${window.location.search}`;
  const targetUrl = `${baseUrl}${targetHash}`;
  const currentHash = normalizeHashValue(window.location.hash);
  if (replace) {
    if (window.history && typeof window.history.replaceState === 'function') {
      window.history.replaceState(null, '', targetUrl);
    } else {
      window.location.hash = targetHash;
    }
    return true;
  }
  if (currentHash === targetHash) {
    return false;
  }
  window.location.hash = targetHash;
  return true;
}

function handleHashChange() {
  if (typeof window === 'undefined') return;
  const viewFromHash = getViewFromHash(window.location.hash);
  const viewName = viewFromHash || DEFAULT_VIEW;
  if (viewName === currentView) {
    return;
  }
  showView(viewName);
}

function initializeViewFromHash() {
  if (typeof window === 'undefined') {
    showView(DEFAULT_VIEW);
    return;
  }
  const viewFromHash = getViewFromHash(window.location.hash);
  const initialView = viewFromHash || DEFAULT_VIEW;
  showView(initialView);
  const desiredHash = normalizeHashValue(getHashForView(initialView));
  const currentHash = normalizeHashValue(window.location.hash);
  if (currentHash !== desiredHash) {
    updateHashForView(initialView, { replace: true });
  }
}

// View switching
function showView(viewName) {
  currentView = viewName;
  if (elements.projectsView) elements.projectsView.style.display = viewName === 'projects' ? 'block' : 'none';
  if (elements.milestonesView) elements.milestonesView.style.display = 'none';
  if (elements.tasksView) elements.tasksView.style.display = viewName === 'tasks' ? 'block' : 'none';
  if (elements.capacityView) elements.capacityView.style.display = viewName === 'capacity' ? 'block' : 'none';
  if (elements.progressView) elements.progressView.style.display = viewName === 'progress' ? 'block' : 'none';
  if (elements.requirementsView) elements.requirementsView.style.display = viewName === 'requirements' ? 'block' : 'none';
  if (elements.functionalRequirementsView) elements.functionalRequirementsView.style.display = 'none';
  if (elements.settingsView) elements.settingsView.style.display = viewName === 'settings' ? 'block' : 'none';
  
  if (viewName === 'projects') {
    renderProjects();
  } else if (viewName === 'tasks') {
    renderTasks();
    renderCapacity();
  } else if (viewName === 'capacity') {
    renderCapacity();
  } else if (viewName === 'progress') {
    renderProgress();
  } else if (viewName === 'requirements') {
    renderRequirements();
  } else if (viewName === 'settings') {
    renderSettings();
  }
}

function closeNavDropdowns() {
  document.querySelectorAll('.nav-dropdown.is-open').forEach((dropdown) => {
    dropdown.classList.remove('is-open');
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Event listeners setup
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      const targetView = getViewFromHash(href);
      if (targetView) {
        const hashChanged = updateHashForView(targetView);
        if (!hashChanged) {
          showView(targetView);
        }
      }
      closeNavDropdowns();
    });
  });

  window.addEventListener('hashchange', handleHashChange);

  const reportsToggle = document.querySelector('.nav-dropdown-toggle');
  reportsToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    const dropdown = reportsToggle.closest('.nav-dropdown');
    if (!dropdown) return;
    const isOpen = dropdown.classList.toggle('is-open');
    reportsToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('.nav-dropdown')) {
      return;
    }
    closeNavDropdowns();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNavDropdowns();
    }
  });

  document.querySelectorAll('.back-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const hashChanged = updateHashForView('projects');
      if (!hashChanged) {
        showView('projects');
      }
    });
  });

  elements.progressFilterProject?.addEventListener('change', (event) => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    state.progressFilterProject = select.value;
    state.progressFilterMilestone = '';
    updateProgressMilestoneFilterOptions();
    renderProgress();
  });

  elements.progressFilterMilestone?.addEventListener('change', (event) => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    state.progressFilterMilestone = select.value;
    renderProgress();
  });

  elements.progressFilterStartDate?.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    state.progressFilterStartDate = input.value;
    renderProgress();
  });

  elements.progressFilterEndDate?.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    state.progressFilterEndDate = input.value;
    renderProgress();
  });

  // Initiative (project) form
  elements.newProjectBtn?.addEventListener('click', () => {
    populateUserSelect('project-owner');
    populateUserSelect('project-dev-lead');
    populateUserSelect('project-qa-lead');
    populateStakeholderMultiSelect('project-stakeholders');
    elements.newProjectForm.style.display = 'block';
    elements.newProjectBtn.style.display = 'none';
    document.getElementById('project-title').focus();
  });

  document.getElementById('cancel-project-btn')?.addEventListener('click', () => {
    elements.newProjectForm.style.display = 'none';
    elements.newProjectBtn.style.display = 'block';
    document.getElementById('project-title').value = '';
    document.getElementById('project-description').value = '';
    const problemEl = document.getElementById('project-problem');
    const strategyEl = document.getElementById('project-strategy');
    if (problemEl) problemEl.value = '';
    if (strategyEl) strategyEl.value = '';
    const container = document.getElementById('project-objectives-container');
    if (container) container.innerHTML = '';
  });

  document.getElementById('add-project-objective-btn')?.addEventListener('click', () => {
    const container = document.getElementById('project-objectives-container');
    if (!container) return;
    const priorityOpts = getObjectivePriorityOptionsHtml('');
    container.insertAdjacentHTML('beforeend', getObjectiveRowHtml(priorityOpts, '', ''));
  });

  document.getElementById('project-objectives-container')?.addEventListener('click', (e) => {
    if (e.target?.classList?.contains('remove-objective-row')) {
      const row = e.target.closest('.objective-row');
      if (row) row.remove();
    }
  });

  elements.newProjectForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-description').value.trim();
    const problemStatement = document.getElementById('project-problem')?.value?.trim() || '';
    const strategy = document.getElementById('project-strategy')?.value?.trim() || '';
    const owner = document.getElementById('project-owner')?.value || undefined;
    const devLead = document.getElementById('project-dev-lead')?.value || undefined;
    const qaLead = document.getElementById('project-qa-lead')?.value || undefined;
    const stakeholdersEl = document.getElementById('project-stakeholders');
    const stakeholders = stakeholdersEl ? Array.from(stakeholdersEl.selectedOptions).map(o => o.value).filter(Boolean) : [];
    if (!title) return;
    try {
      const newProject = storage.createProject({
        title,
        description: description || undefined,
        problemStatement,
        strategy,
        owner,
        devLead,
        qaLead,
        stakeholders,
      });
      const container = document.getElementById('project-objectives-container');
      if (container) {
        container.querySelectorAll('.objective-row').forEach((row) => {
          const name = row.querySelector('.objective-name')?.value?.trim();
          const priority = row.querySelector('.objective-priority')?.value || undefined;
          if (name) storage.createObjective(newProject.id, { name, priority });
        });
      }
      document.getElementById('project-title').value = '';
      document.getElementById('project-description').value = '';
      if (document.getElementById('project-problem')) document.getElementById('project-problem').value = '';
      if (document.getElementById('project-strategy')) document.getElementById('project-strategy').value = '';
      const objContainer = document.getElementById('project-objectives-container');
      if (objContainer) objContainer.innerHTML = '';
      elements.newProjectForm.style.display = 'none';
      elements.newProjectBtn.style.display = 'block';
      loadProjects();
    } catch (error) {
      console.error('Failed to create initiative:', error);
      alert('Failed to create initiative');
    }
  });

  // Edit initiative form (same fields as New)
  document.getElementById('cancel-edit-project-btn')?.addEventListener('click', () => {
    document.getElementById('edit-project-form').style.display = 'none';
  });

  document.getElementById('edit-project-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-project-id').value;
    if (!id) return;
    const title = document.getElementById('edit-project-title').value.trim();
    const description = document.getElementById('edit-project-description').value.trim();
    const problemStatement = document.getElementById('edit-project-problem')?.value?.trim() || '';
    const strategy = document.getElementById('edit-project-strategy')?.value?.trim() || '';
    const owner = document.getElementById('edit-project-owner')?.value || undefined;
    const devLead = document.getElementById('edit-project-dev-lead')?.value || undefined;
    const qaLead = document.getElementById('edit-project-qa-lead')?.value || undefined;
    const stakeholdersEl = document.getElementById('edit-project-stakeholders');
    const stakeholders = stakeholdersEl ? Array.from(stakeholdersEl.selectedOptions).map(o => o.value).filter(Boolean) : [];
    if (!title) return;
    try {
      storage.updateProject(id, {
        title,
        description: description || undefined,
        problemStatement,
        strategy,
        owner,
        devLead,
        qaLead,
        stakeholders,
      });
      const container = document.getElementById('edit-project-objectives-container');
      if (container) {
        const rows = container.querySelectorAll('.objective-row');
        const keptIds = [];
        rows.forEach((row) => {
          const objectiveId = row.getAttribute('data-objective-id');
          const name = row.querySelector('.objective-name')?.value?.trim() || '';
          const priority = row.querySelector('.objective-priority')?.value || undefined;
          if (objectiveId) {
            storage.updateObjective(id, objectiveId, { name, priority });
            keptIds.push(objectiveId);
          } else if (name) {
            const created = storage.createObjective(id, { name, priority });
            keptIds.push(created.id);
          }
        });
        const project = storage.getProject(id);
        (project?.objectives || []).forEach((o) => {
          if (!keptIds.includes(o.id)) storage.deleteObjective(id, o.id);
        });
      }
      document.getElementById('edit-project-form').style.display = 'none';
      loadProjects();
    } catch (error) {
      console.error('Failed to update initiative:', error);
      alert('Failed to update initiative');
    }
  });

  document.getElementById('add-edit-project-objective-btn')?.addEventListener('click', () => {
    const container = document.getElementById('edit-project-objectives-container');
    if (!container) return;
    const priorityOpts = getObjectivePriorityOptionsHtml('');
    container.insertAdjacentHTML('beforeend', getObjectiveRowHtml(priorityOpts, '', ''));
  });

  document.getElementById('edit-project-form')?.addEventListener('click', (e) => {
    if (e.target?.classList?.contains('remove-objective-row')) {
      const row = e.target.closest('.objective-row');
      if (row) row.remove();
    }
  });

  window.openEditProjectModal = function(project) {
    const form = document.getElementById('edit-project-form');
    if (!form || !project) return;
    document.getElementById('edit-project-id').value = project.id;
    document.getElementById('edit-project-title').value = project.title || '';
    document.getElementById('edit-project-description').value = project.description || '';
    document.getElementById('edit-project-problem').value = project.problemStatement || '';
    document.getElementById('edit-project-strategy').value = project.strategy || '';
    populateUserSelect('edit-project-owner');
    populateUserSelect('edit-project-dev-lead');
    populateUserSelect('edit-project-qa-lead');
    populateStakeholderMultiSelect('edit-project-stakeholders');
    const objContainer = document.getElementById('edit-project-objectives-container');
    if (objContainer) {
      const objectives = project.objectives || [];
      let html = '';
      objectives.forEach((o) => {
        const priorityOpts = getObjectivePriorityOptionsHtml(o.priority || '');
        html += `<div class="objective-row" data-objective-id="${escapeHtml(o.id)}" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
          <input type="text" class="objective-name" placeholder="Objective name" value="${escapeHtml(o.name || '')}" style="flex: 1; min-width: 0;">
          <select class="objective-priority" style="min-width: 120px;">${priorityOpts}</select>
          <button type="button" class="btn btn-secondary btn-sm remove-objective-row">Remove</button>
        </div>`;
      });
      objContainer.innerHTML = html;
    }
    setTimeout(() => {
      const o = document.getElementById('edit-project-owner');
      const d = document.getElementById('edit-project-dev-lead');
      const q = document.getElementById('edit-project-qa-lead');
      const s = document.getElementById('edit-project-stakeholders');
      if (o) o.value = project.owner || '';
      if (d) d.value = project.devLead || '';
      if (q) q.value = project.qaLead || '';
      if (s && project.stakeholders?.length) {
        Array.from(s.options).forEach(opt => {
          opt.selected = project.stakeholders.includes(opt.value);
        });
      }
    }, 0);
    form.style.display = 'block';
    document.getElementById('edit-project-title').focus();
  };

  // Initiative search
  document.getElementById('project-search')?.addEventListener('input', (e) => {
    state.projectSearch = (e.target && e.target.value) ? String(e.target.value).trim() : '';
    if (currentView === 'projects') renderProjects();
  });

  // Milestone form
  elements.newMilestoneBtn?.addEventListener('click', () => {
    populateProjectSelect('milestone-project');
    elements.newMilestoneForm.style.display = 'block';
    elements.newMilestoneBtn.style.display = 'none';
    document.getElementById('milestone-title').focus();
    // Initialize date picker for milestone target date
    setTimeout(() => {
      if (!window.milestoneTargetDatePicker) {
        const dateInput = document.getElementById('milestone-target-date');
        if (dateInput) {
          window.milestoneTargetDatePicker = flatpickr(dateInput, {
            dateFormat: 'Y-m-d',
            clickOpens: true,
            allowInput: false,
          });
          // Ensure calendar opens on focus
          dateInput.addEventListener('focus', () => {
            window.milestoneTargetDatePicker.open();
          });
        }
      }
    }, 100);
  });

  document.getElementById('cancel-milestone-btn')?.addEventListener('click', () => {
    elements.newMilestoneForm.style.display = 'none';
    elements.newMilestoneBtn.style.display = 'block';
    document.getElementById('milestone-title').value = '';
    document.getElementById('milestone-description').value = '';
    document.getElementById('milestone-target-date').value = '';
  });

  elements.newMilestoneForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('milestone-project').value;
    const title = document.getElementById('milestone-title').value.trim();
    const description = document.getElementById('milestone-description').value.trim();
    const targetDateInput = document.getElementById('milestone-target-date');
    let targetDate = '';
    if (targetDateInput) {
      if (targetDateInput.flatpickr) {
        // Get value from flatpickr instance
        const selectedDates = targetDateInput.flatpickr.selectedDates;
        if (selectedDates && selectedDates.length > 0) {
          targetDate = targetDateInput.flatpickr.formatDate(selectedDates[0], 'Y-m-d');
        } else if (targetDateInput.flatpickr.input && targetDateInput.flatpickr.input.value) {
          targetDate = targetDateInput.flatpickr.input.value;
        } else {
          targetDate = targetDateInput.value;
        }
      } else {
        targetDate = targetDateInput.value;
      }
    }
    
    // Check form validity before proceeding
    if (!elements.newMilestoneForm.checkValidity()) {
      elements.newMilestoneForm.reportValidity();
      return;
    }
    
    if (!title || !projectId) {
      alert('Please fill in all required fields.');
      return;
    }
    
    try {
      storage.createMilestone(projectId, { 
        title, 
        description: description || undefined,
        targetDate: targetDate || undefined
      });
      document.getElementById('milestone-title').value = '';
      document.getElementById('milestone-description').value = '';
      document.getElementById('milestone-target-date').value = '';
      elements.newMilestoneForm.style.display = 'none';
      elements.newMilestoneBtn.style.display = 'block';
      renderMilestones();
    } catch (error) {
      console.error('Failed to create milestone:', error);
      alert('Failed to create milestone: ' + error.message);
    }
  });

  // Requirement form
  elements.newRequirementBtn?.addEventListener('click', () => {
    populateProjectSelect('requirement-project');
    updateAllSelects(); // Populate risk and other selects
    populateRiskSelect('requirement-risk');
    clearRiskAssessmentForm('requirement-');
    elements.newRequirementForm.style.display = 'block';
    elements.newRequirementBtn.style.display = 'none';
    document.getElementById('requirement-title').focus();
  });

  // Handle project change to populate objectives
  document.getElementById('requirement-project')?.addEventListener('change', (e) => {
    populateObjectiveSelect('requirement-objective', e.target.value);
  });

  document.getElementById('cancel-requirement-btn')?.addEventListener('click', () => {
    elements.newRequirementForm.style.display = 'none';
    elements.newRequirementBtn.style.display = 'block';
    document.getElementById('requirement-tracking-id').value = '';
    document.getElementById('requirement-title').value = '';
    document.getElementById('requirement-description').value = '';
    document.getElementById('requirement-type').value = 'user';
    document.getElementById('requirement-risk').value = '';
    clearRiskAssessmentForm('requirement-');
    const objectiveSelect = document.getElementById('requirement-objective');
    if (objectiveSelect) objectiveSelect.innerHTML = '<option value="">None</option>';
  });
  elements.newRequirementForm?.addEventListener('change', (e) => {
    if (e.target.classList.contains('risk-factor-select')) updateRiskValueDisplay('requirement-');
  });

  elements.newRequirementForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('requirement-project').value;
    const objectiveId = document.getElementById('requirement-objective').value || undefined;
    const type = document.getElementById('requirement-type').value || 'user';
    const risk = document.getElementById('requirement-risk').value || undefined;
    const trackingId = document.getElementById('requirement-tracking-id').value.trim();
    const title = document.getElementById('requirement-title').value.trim();
    const description = document.getElementById('requirement-description').value.trim();
    const riskAssessment = getRiskAssessmentFromFormIds('requirement-');
    
    if (!title || !projectId) return;
    
    try {
      storage.createRequirement(projectId, { 
        trackingId: trackingId || undefined,
        title, 
        description: description || undefined,
        objectiveId,
        type,
        risk,
        riskAssessment: riskAssessment || undefined
      });
      document.getElementById('requirement-tracking-id').value = '';
      document.getElementById('requirement-title').value = '';
      document.getElementById('requirement-description').value = '';
      document.getElementById('requirement-objective').value = '';
      document.getElementById('requirement-type').value = 'user';
      document.getElementById('requirement-risk').value = '';
      const objectiveSelect = document.getElementById('requirement-objective');
      if (objectiveSelect) objectiveSelect.innerHTML = '<option value="">None</option>';
      clearRiskAssessmentForm('requirement-');
      elements.newRequirementForm.style.display = 'none';
      elements.newRequirementBtn.style.display = 'block';
      renderRequirements();
    } catch (error) {
      console.error('Failed to create requirement:', error);
      alert('Failed to create requirement');
    }
  });

  // Functional Requirement form
  elements.newFunctionalRequirementBtn?.addEventListener('click', () => {
    populateProjectSelect('functional-requirement-project');
    elements.newFunctionalRequirementForm.style.display = 'block';
    elements.newFunctionalRequirementBtn.style.display = 'none';
    document.getElementById('functional-requirement-title').focus();
  });

  // Handle project change to populate user requirements
  document.getElementById('functional-requirement-project')?.addEventListener('change', (e) => {
    populateUserRequirementsSelect('functional-requirement-linked-user-requirements', e.target.value);
  });

  document.getElementById('cancel-functional-requirement-btn')?.addEventListener('click', () => {
    elements.newFunctionalRequirementForm.style.display = 'none';
    elements.newFunctionalRequirementBtn.style.display = 'block';
    document.getElementById('functional-requirement-title').value = '';
    document.getElementById('functional-requirement-description').value = '';
    document.getElementById('functional-requirement-project').value = '';
    const userReqsSelect = document.getElementById('functional-requirement-linked-user-requirements');
    if (userReqsSelect) {
      userReqsSelect.innerHTML = '';
    }
  });

  elements.newFunctionalRequirementForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('functional-requirement-project').value;
    const title = document.getElementById('functional-requirement-title').value.trim();
    const description = document.getElementById('functional-requirement-description').value.trim();
    const linkedUserReqsSelect = document.getElementById('functional-requirement-linked-user-requirements');
    const linkedUserRequirements = Array.from(linkedUserReqsSelect.selectedOptions).map(opt => opt.value);
    
    if (!title || !projectId) return;
    
    try {
      storage.createRequirement(projectId, {
        title,
        description: description || undefined,
        type: 'system'
      });
      document.getElementById('functional-requirement-title').value = '';
      document.getElementById('functional-requirement-description').value = '';
      document.getElementById('functional-requirement-project').value = '';
      if (linkedUserReqsSelect) {
        linkedUserReqsSelect.innerHTML = '';
        Array.from(linkedUserReqsSelect.options).forEach(opt => opt.selected = false);
      }
      elements.newFunctionalRequirementForm.style.display = 'none';
      elements.newFunctionalRequirementBtn.style.display = 'block';
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to create requirement:', error);
      alert('Failed to create requirement');
    }
  });

  // Task form
  const newTaskBtn = document.getElementById('new-task-btn');
  const newTaskForm = document.getElementById('new-task-form');
  if (newTaskBtn && newTaskForm) {
    newTaskBtn.addEventListener('click', () => {
      populateProjectSelect('task-project');
      updateAllSelects(); // Populate effort and resource selects
      // Clear and reset functional requirement select
      const functionalReqSelect = document.getElementById('task-requirement');
      if (functionalReqSelect) {
        functionalReqSelect.innerHTML = '<option value="">Select a project first</option>';
        functionalReqSelect.value = '';
      }
      // Reset project select
      const projectSelect = document.getElementById('task-project');
      if (projectSelect) {
        projectSelect.value = '';
      }
      newTaskForm.style.display = 'block';
      newTaskBtn.style.display = 'none';
      const titleInput = document.getElementById('task-title');
      if (titleInput) {
        titleInput.focus();
      }
      // Initialize date picker for task due date
      setTimeout(() => {
        if (!window.taskDueDatePicker) {
          const dateInput = document.getElementById('task-due-date');
          if (dateInput) {
            window.taskDueDatePicker = flatpickr(dateInput, {
              dateFormat: 'Y-m-d',
              clickOpens: true,
              allowInput: false,
            });
            dateInput.addEventListener('focus', () => {
              window.taskDueDatePicker.open();
            });
          }
        }
      }, 100);
    });
  } else {
    console.error('new-task-btn or new-task-form element not found');
  }

  document.getElementById('task-project')?.addEventListener('change', (e) => {
    const projectId = e.target.value;
    populateMilestoneSelect('task-milestone', projectId);
    populateRequirementSelect('task-requirement', projectId);
  });

  const cancelTaskBtn = document.getElementById('cancel-task-btn');
  if (cancelTaskBtn) {
    cancelTaskBtn.addEventListener('click', () => {
      const taskForm = document.getElementById('new-task-form');
      const taskBtn = document.getElementById('new-task-btn');
      if (taskForm) taskForm.style.display = 'none';
      if (taskBtn) taskBtn.style.display = 'block';
      const titleInput = document.getElementById('task-title');
      if (titleInput) titleInput.value = '';
      const descInput = document.getElementById('task-description');
      if (descInput) descInput.value = '';
      const dueDateInput = document.getElementById('task-due-date');
      if (dueDateInput) dueDateInput.value = '';
      // Reset project select
      const projectSelect = document.getElementById('task-project');
      if (projectSelect) {
        projectSelect.value = '';
      }
      const reqSelect = document.getElementById('task-requirement');
      if (reqSelect) { reqSelect.innerHTML = '<option value="">Select an initiative first</option>'; reqSelect.value = ''; }
      const milestoneSelect = document.getElementById('task-milestone');
      if (milestoneSelect) { milestoneSelect.innerHTML = '<option value="">Select an initiative first</option>'; milestoneSelect.value = ''; }
      // Reset other selects
      const effortSelect = document.getElementById('task-effort');
      if (effortSelect) effortSelect.value = '';
      const resourceSelect = document.getElementById('task-resource');
      if (resourceSelect) resourceSelect.value = '';
      if (window.taskDueDatePicker) {
        window.taskDueDatePicker.clear();
      }
    });
  }

  // Edit task form
  const editTaskForm = document.getElementById('edit-task-form');
  const cancelEditTaskBtn = document.getElementById('cancel-edit-task-btn');
  
  cancelEditTaskBtn?.addEventListener('click', () => {
    editTaskForm.style.display = 'none';
    // Clear date picker if it exists
    const editDueDateInput = document.getElementById('edit-task-due-date');
    if (editDueDateInput && editDueDateInput.flatpickr) {
      editDueDateInput.flatpickr.clear();
    }
  });

  // Function to open edit task modal and populate it
  window.openEditTaskModal = function(task) {
    const editTaskForm = document.getElementById('edit-task-form');
    if (!editTaskForm) return;

    // Populate form fields
    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-project-id').value = task.projectId;
    document.getElementById('edit-task-milestone-id').value = task.milestoneId;
    document.getElementById('edit-task-title').value = task.title || '';
    document.getElementById('edit-task-description').value = task.description || '';
    
    // Populate selects
    populateProjectSelect('edit-task-project');
    document.getElementById('edit-task-project').value = task.projectId;
    populateMilestoneSelect('edit-task-milestone', task.projectId);
    const editMilestoneSelect = document.getElementById('edit-task-milestone');
    if (editMilestoneSelect) editMilestoneSelect.value = task.milestoneId || '';
    populateRequirementSelect('edit-task-requirement', task.projectId, task.requirementId || '');
    
    updateAllSelects(); // Populate effort and resource selects
    setTimeout(() => {
      const statusSelect = document.getElementById('edit-task-status');
      const effortSelect = document.getElementById('edit-task-effort');
      const resourceSelect = document.getElementById('edit-task-resource');
      
      if (statusSelect) statusSelect.value = task.status || '';
      if (effortSelect) effortSelect.value = task.effortLevel || '';
      if (resourceSelect) resourceSelect.value = task.assignedResource || '';
      
      // Set due date
      const editDueDateInput = document.getElementById('edit-task-due-date');
      if (editDueDateInput && task.dueDate) {
        const dueDateValue = new Date(task.dueDate).toISOString().split('T')[0];
        editDueDateInput.value = dueDateValue;
      }
      
      // Initialize date picker for edit task form
      if (editDueDateInput && !editDueDateInput.flatpickr) {
        const fp = flatpickr(editDueDateInput, {
          dateFormat: 'Y-m-d',
          clickOpens: true,
          allowInput: false,
        });
        editDueDateInput.addEventListener('focus', () => {
          fp.open();
        });
      } else if (editDueDateInput && editDueDateInput.flatpickr && task.dueDate) {
        editDueDateInput.flatpickr.setDate(task.dueDate);
      }
    }, 150);
    
    // Show modal
    editTaskForm.style.display = 'block';
  };

  // Function to open edit milestone modal and populate it
  window.openEditMilestoneModal = function(milestone) {
    const editMilestoneForm = document.getElementById('edit-milestone-form');
    if (!editMilestoneForm) return;

    // Populate form fields
    document.getElementById('edit-milestone-id').value = milestone.id;
    document.getElementById('edit-milestone-project-id').value = milestone.projectId;
    document.getElementById('edit-milestone-title').value = milestone.title || '';
    document.getElementById('edit-milestone-description').value = milestone.description || '';
    
    // Populate project select
    populateProjectSelect('edit-milestone-project');
    document.getElementById('edit-milestone-project').value = milestone.projectId;
    
    // Set target date and initialize date picker
    const targetDateInput = document.getElementById('edit-milestone-target-date');
    if (targetDateInput) {
      // Destroy existing flatpickr instance if it exists
      if (targetDateInput.flatpickr && typeof targetDateInput.flatpickr.destroy === 'function') {
        targetDateInput.flatpickr.destroy();
      }
      
      // Set the date value if it exists
      if (milestone.targetDate) {
        const targetDateValue = new Date(milestone.targetDate).toISOString().split('T')[0];
        targetDateInput.value = targetDateValue;
      } else {
        targetDateInput.value = '';
      }
      
      // Initialize date picker - same as add new form
      setTimeout(() => {
        // Make sure we don't have a stale instance
        if (targetDateInput.flatpickr && typeof targetDateInput.flatpickr.destroy === 'function') {
          targetDateInput.flatpickr.destroy();
        }
        
        window.editMilestoneTargetDatePicker = flatpickr(targetDateInput, {
          dateFormat: 'Y-m-d',
          clickOpens: true,
          allowInput: false,
        });
        // Ensure calendar opens on focus
        targetDateInput.addEventListener('focus', () => {
          if (window.editMilestoneTargetDatePicker) {
            window.editMilestoneTargetDatePicker.open();
          }
        });
        // Also open on click
        targetDateInput.addEventListener('click', () => {
          if (window.editMilestoneTargetDatePicker) {
            window.editMilestoneTargetDatePicker.open();
          }
        });
      }, 100);
    }
    
    // Show form
    editMilestoneForm.style.display = 'block';
  };

  // Function to open edit requirement modal and populate it
  window.openEditRequirementModal = function(requirement) {
    const editRequirementForm = document.getElementById('edit-requirement-form');
    if (!editRequirementForm) return;

    // Populate form fields
    document.getElementById('edit-requirement-id').value = requirement.id;
    document.getElementById('edit-requirement-project-id').value = requirement.projectId;
    document.getElementById('edit-requirement-tracking-id').value = requirement.trackingId || '';
    document.getElementById('edit-requirement-title').value = requirement.title || '';
    document.getElementById('edit-requirement-description').value = requirement.description || '';
    document.getElementById('edit-requirement-type').value = requirement.type || 'user';
    
    // Populate project select
    populateProjectSelect('edit-requirement-project');
    document.getElementById('edit-requirement-project').value = requirement.projectId;
    
    // Populate objective and risk
    populateObjectiveSelect('edit-requirement-objective', requirement.projectId, requirement.objectiveId);
    populateRiskSelect('edit-requirement-risk');
    const editRiskSelect = document.getElementById('edit-requirement-risk');
    if (editRiskSelect && requirement.risk) editRiskSelect.value = requirement.risk;
    
    // Show form
    editRequirementForm.style.display = 'block';
  };

  // Function to open edit functional requirement modal and populate it
  window.openEditFunctionalRequirementModal = function(functionalRequirement) {
    const editFunctionalRequirementForm = document.getElementById('edit-functional-requirement-form');
    if (!editFunctionalRequirementForm) return;

    // Populate form fields
    document.getElementById('edit-functional-requirement-id').value = functionalRequirement.id;
    document.getElementById('edit-functional-requirement-project-id').value = functionalRequirement.projectId;
    document.getElementById('edit-functional-requirement-title').value = functionalRequirement.title || '';
    document.getElementById('edit-functional-requirement-description').value = functionalRequirement.description || '';
    
    // Populate project select
    populateProjectSelect('edit-functional-requirement-project');
    document.getElementById('edit-functional-requirement-project').value = functionalRequirement.projectId;
    
    // Populate user requirements select
    populateUserRequirementsSelect('edit-functional-requirement-linked-user-requirements', functionalRequirement.projectId);
    setTimeout(() => {
      const userReqsSelect = document.getElementById('edit-functional-requirement-linked-user-requirements');
      if (userReqsSelect) {
        const selectedUserReqs = functionalRequirement.linkedUserRequirements || [];
        selectedUserReqs.forEach(urId => {
          const option = userReqsSelect.querySelector(`option[value="${urId}"]`);
          if (option) option.selected = true;
        });
      }
    }, 100);
    
    // Handle project change to update user requirements
    document.getElementById('edit-functional-requirement-project')?.addEventListener('change', (e) => {
      populateUserRequirementsSelect('edit-functional-requirement-linked-user-requirements', e.target.value);
    });
    
    // Show form
    editFunctionalRequirementForm.style.display = 'block';
  };

  editTaskForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const taskIdInput = document.getElementById('edit-task-id');
    const projectIdInput = document.getElementById('edit-task-project-id');
    const milestoneIdInput = document.getElementById('edit-task-milestone-id');
    const titleInput = document.getElementById('edit-task-title');
    const descriptionInput = document.getElementById('edit-task-description');
    const statusSelect = document.getElementById('edit-task-status');
    const effortSelect = document.getElementById('edit-task-effort');
    const resourceSelect = document.getElementById('edit-task-resource');
    const editDueDateInput = document.getElementById('edit-task-due-date');
    const milestoneSelect = document.getElementById('edit-task-milestone');
    const requirementSelect = document.getElementById('edit-task-requirement');
    const taskId = taskIdInput ? taskIdInput.value : '';
    const projectId = projectIdInput ? projectIdInput.value : '';
    const milestoneId = milestoneSelect ? milestoneSelect.value : (milestoneIdInput ? milestoneIdInput.value : '');
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const status = statusSelect ? statusSelect.value : '';
    const effort = effortSelect ? effortSelect.value : '';
    const resource = resourceSelect ? resourceSelect.value : '';
    const requirementId = requirementSelect ? requirementSelect.value : '';
    let dueDate = '';
    if (editDueDateInput) {
      if (editDueDateInput.flatpickr && editDueDateInput.flatpickr.input) {
        dueDate = editDueDateInput.flatpickr.input.value;
      } else {
        dueDate = editDueDateInput.value || '';
      }
    }
    if (!title || !projectId || !milestoneId) return;
    try {
      storage.updateTask(projectId, milestoneId, taskId, {
        title,
        description: description || undefined,
        status,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
        dueDate: dueDate || undefined,
        requirementId: requirementId || undefined,
      });
      editTaskForm.style.display = 'none';
      renderTasks();
      renderRequirements();
      if (currentView === 'projects') renderProjects();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  });

  document.getElementById('edit-task-project')?.addEventListener('change', (e) => {
    if (e && e.target && e.target.value !== undefined) {
      populateMilestoneSelect('edit-task-milestone', e.target.value);
    populateRequirementSelect('edit-task-requirement', e.target.value);
    }
  });

  // Edit Milestone Form handlers
  const editMilestoneForm = document.getElementById('edit-milestone-form');
  const cancelEditMilestoneBtn = document.getElementById('cancel-edit-milestone-btn');
  
  cancelEditMilestoneBtn?.addEventListener('click', () => {
    if (editMilestoneForm) editMilestoneForm.style.display = 'none';
    // Clear date picker if it exists
    const targetDateInput = document.getElementById('edit-milestone-target-date');
    if (targetDateInput && targetDateInput.flatpickr) {
      targetDateInput.flatpickr.clear();
    }
  });

  editMilestoneForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const milestoneIdInput = document.getElementById('edit-milestone-id');
    const projectIdInput = document.getElementById('edit-milestone-project-id');
    const titleInput = document.getElementById('edit-milestone-title');
    const descriptionInput = document.getElementById('edit-milestone-description');
    const projectSelect = document.getElementById('edit-milestone-project');
    const targetDateInput = document.getElementById('edit-milestone-target-date');
    
    const milestoneId = milestoneIdInput ? milestoneIdInput.value : '';
    const projectId = projectIdInput ? projectIdInput.value : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const newProjectId = projectSelect ? projectSelect.value : projectId;
    let targetDate = '';
    if (targetDateInput) {
      if (targetDateInput.flatpickr) {
        // Get value from flatpickr instance - same as add new form
        const selectedDates = targetDateInput.flatpickr.selectedDates;
        if (selectedDates && selectedDates.length > 0) {
          targetDate = targetDateInput.flatpickr.formatDate(selectedDates[0], 'Y-m-d');
        } else if (targetDateInput.flatpickr.input && targetDateInput.flatpickr.input.value) {
          targetDate = targetDateInput.flatpickr.input.value;
        } else {
          targetDate = targetDateInput.value;
        }
      } else {
        targetDate = targetDateInput.value || '';
      }
    }
    
    if (!title || !newProjectId || !milestoneId) return;
    
    try {
      storage.updateMilestone(newProjectId, milestoneId, {
        title,
        description: description || undefined,
        targetDate: targetDate || undefined
      });
      if (editMilestoneForm) editMilestoneForm.style.display = 'none';
      renderMilestones();
      renderProjects();
    } catch (error) {
      console.error('Failed to update milestone:', error);
      alert('Failed to update milestone');
    }
  });

  // Edit Requirement Form handlers
  const editRequirementForm = document.getElementById('edit-requirement-form');
  const cancelEditRequirementBtn = document.getElementById('cancel-edit-requirement-btn');
  
  cancelEditRequirementBtn?.addEventListener('click', () => {
    if (editRequirementForm) editRequirementForm.style.display = 'none';
  });

  editRequirementForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const requirementIdInput = document.getElementById('edit-requirement-id');
    const projectIdInput = document.getElementById('edit-requirement-project-id');
    const trackingIdInput = document.getElementById('edit-requirement-tracking-id');
    const titleInput = document.getElementById('edit-requirement-title');
    const descriptionInput = document.getElementById('edit-requirement-description');
    const projectSelect = document.getElementById('edit-requirement-project');
    const objectiveSelect = document.getElementById('edit-requirement-objective');
    const typeSelect = document.getElementById('edit-requirement-type');
    const riskSelect = document.getElementById('edit-requirement-risk');
    
    const requirementId = requirementIdInput ? requirementIdInput.value : '';
    const projectId = projectIdInput ? projectIdInput.value : '';
    const trackingId = trackingIdInput ? trackingIdInput.value.trim() : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const newProjectId = projectSelect ? projectSelect.value : projectId;
    const objectiveId = objectiveSelect ? objectiveSelect.value || undefined : undefined;
    const type = typeSelect ? typeSelect.value || 'user' : 'user';
    const risk = riskSelect ? riskSelect.value || undefined : undefined;
    
    if (!title || !newProjectId || !requirementId) return;
    
    const riskAssessment = getRiskAssessmentFromFormIds('edit-requirement-');
    const updates = {
      trackingId: trackingId || undefined,
      title,
      description: description || undefined,
      objectiveId,
      type,
      risk,
      riskAssessment: riskAssessment ?? null
    };
    
    try {
      storage.updateRequirement(newProjectId, requirementId, updates);
      if (editRequirementForm) editRequirementForm.style.display = 'none';
      renderRequirements();
      renderProjects();
    } catch (error) {
      console.error('Failed to update requirement:', error);
      alert('Failed to update requirement');
    }
  });
  editRequirementForm?.addEventListener('change', (e) => {
    if (e.target.classList.contains('risk-factor-select')) updateRiskValueDisplay('edit-requirement-');
  });

  document.getElementById('edit-requirement-project')?.addEventListener('change', (e) => {
    if (e && e.target && e.target.value !== undefined) {
      populateObjectiveSelect('edit-requirement-objective', e.target.value);
    }
  });

  // Edit Functional Requirement Form handlers
  const editFunctionalRequirementForm = document.getElementById('edit-functional-requirement-form');
  const cancelEditFunctionalRequirementBtn = document.getElementById('cancel-edit-functional-requirement-btn');
  
  cancelEditFunctionalRequirementBtn?.addEventListener('click', () => {
    if (editFunctionalRequirementForm) editFunctionalRequirementForm.style.display = 'none';
  });

  editFunctionalRequirementForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const functionalRequirementIdInput = document.getElementById('edit-functional-requirement-id');
    const projectIdInput = document.getElementById('edit-functional-requirement-project-id');
    const titleInput = document.getElementById('edit-functional-requirement-title');
    const descriptionInput = document.getElementById('edit-functional-requirement-description');
    const projectSelect = document.getElementById('edit-functional-requirement-project');
    const userReqsSelect = document.getElementById('edit-functional-requirement-linked-user-requirements');
    
    const functionalRequirementId = functionalRequirementIdInput ? functionalRequirementIdInput.value : '';
    const projectId = projectIdInput ? projectIdInput.value : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const newProjectId = projectSelect ? projectSelect.value : projectId;
    const linkedUserRequirements = userReqsSelect ? Array.from(userReqsSelect.selectedOptions).map(opt => opt.value) : [];
    
    if (!title || !newProjectId || !functionalRequirementId) return;
    
    try {
      storage.updateRequirement(newProjectId, functionalRequirementId, {
        title,
        description: description || undefined
      });
      if (editFunctionalRequirementForm) editFunctionalRequirementForm.style.display = 'none';
      renderFunctionalRequirements();
      renderRequirements();
      renderProjects();
    } catch (error) {
      console.error('Failed to update requirement:', error);
      alert('Failed to update requirement');
    }
  });

  document.getElementById('edit-functional-requirement-project')?.addEventListener('change', (e) => {
    if (e && e.target && e.target.value !== undefined) {
      populateUserRequirementsSelect('edit-functional-requirement-linked-user-requirements', e.target.value);
    }
  });

  // Use the newTaskForm variable declared earlier
  if (newTaskForm) {
    newTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const projectSelect = document.getElementById('task-project');
      const titleInput = document.getElementById('task-title');
      const descriptionInput = document.getElementById('task-description');
      const effortSelect = document.getElementById('task-effort');
      const resourceSelect = document.getElementById('task-resource');
      const dueDateInput = document.getElementById('task-due-date');
      const milestoneSelect = document.getElementById('task-milestone');
      const requirementSelect = document.getElementById('task-requirement');
      const projectId = projectSelect ? projectSelect.value : '';
      const milestoneId = milestoneSelect ? milestoneSelect.value : getDefaultMilestoneIdForProject(projectId);
      const title = titleInput ? titleInput.value.trim() : '';
      const description = descriptionInput ? descriptionInput.value.trim() : '';
      const effort = effortSelect ? effortSelect.value : '';
      const resource = resourceSelect ? resourceSelect.value : '';
      const requirementId = requirementSelect ? requirementSelect.value : '';
      let dueDate = '';
      if (dueDateInput) {
        if (dueDateInput.flatpickr && dueDateInput.flatpickr.input) {
          dueDate = dueDateInput.flatpickr.input.value;
        } else {
          dueDate = dueDateInput.value || '';
        }
      }
      if (!title) {
        alert('Please enter a task title');
        if (titleInput) titleInput.focus();
        return;
      }
      if (!projectId) {
        alert('Please select an initiative');
        if (projectSelect) projectSelect.focus();
        return;
      }
      if (!milestoneId) {
        alert('Please select a milestone (or add one to the initiative first).');
        return;
      }
      try {
        storage.createTask(projectId, milestoneId, {
          title,
          description: description || undefined,
          effortLevel: effort || undefined,
          assignedResource: resource || undefined,
          dueDate: dueDate || undefined,
          requirementId: requirementId || undefined,
        });
        // Reset form fields using cached references
        if (titleInput) titleInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        if (effortSelect) effortSelect.value = '';
        if (resourceSelect) resourceSelect.value = '';
        // Reset project and functional requirement selects
        if (projectSelect) {
          projectSelect.value = '';
        }
        if (requirementSelect) { requirementSelect.innerHTML = '<option value="">Select an initiative first</option>'; requirementSelect.value = ''; }
        if (milestoneSelect) { milestoneSelect.innerHTML = '<option value="">Select an initiative first</option>'; milestoneSelect.value = ''; }
        // Clear due date
        if (window.taskDueDatePicker) {
          window.taskDueDatePicker.clear();
        }
        newTaskForm.style.display = 'none';
        const taskBtn = document.getElementById('new-task-btn');
        if (taskBtn) taskBtn.style.display = 'block';
        renderTasks();
        renderRequirements();
        if (currentView === 'projects') renderProjects();
      } catch (error) {
        console.error('Failed to create task:', error);
        alert('Failed to create task: ' + (error.message || 'Unknown error'));
      }
    });
  } else {
    console.error('new-task-form element not found');
  }

  // Settings event listeners
  setupSettingsEventListeners();
  
  // Task search and filter listeners
  setupTaskSearchAndFilterListeners();
  
  // Milestone search and filter listeners
  setupMilestoneSearchAndFilterListeners();
  
  // User requirement search and filter listeners
  setupRequirementSearchAndFilterListeners();
  
  // Functional requirement search and filter listeners
  setupFunctionalRequirementSearchAndFilterListeners();

  // CSV import/export listeners
  setupCsvListeners();
}

function setupTaskSearchAndFilterListeners() {
  const searchInput = document.getElementById('task-search');
  const statusFilter = document.getElementById('task-filter-status');
  const projectFilter = document.getElementById('task-filter-project');
  const resourceFilter = document.getElementById('task-filter-resource');
  
  searchInput?.addEventListener('input', (e) => {
    state.taskSearch = e.target.value;
    renderTasks();
  });
  
  statusFilter?.addEventListener('change', (e) => {
    state.taskFilterStatus = e.target.value;
    renderTasks();
  });
  
  projectFilter?.addEventListener('change', (e) => {
    state.taskFilterProject = e.target.value;
    renderTasks();
  });
  
  resourceFilter?.addEventListener('change', (e) => {
    state.taskFilterResource = e.target.value;
    renderTasks();
  });
}

function setupMilestoneSearchAndFilterListeners() {
  const searchInput = document.getElementById('milestone-search');
  const projectFilter = document.getElementById('milestone-filter-project');
  
  searchInput?.addEventListener('input', (e) => {
    state.milestoneSearch = e.target.value;
    renderMilestones();
  });
  
  projectFilter?.addEventListener('change', (e) => {
    state.milestoneFilterProject = e.target.value;
    renderMilestones();
  });
}

function setupRequirementSearchAndFilterListeners() {
  const searchInput = document.getElementById('requirement-search');
  const projectFilter = document.getElementById('requirement-filter-project');
  const typeFilter = document.getElementById('requirement-filter-type');
  
  searchInput?.addEventListener('input', (e) => {
    state.requirementSearch = e.target.value;
    renderRequirements();
  });
  
  projectFilter?.addEventListener('change', (e) => {
    if (isUpdatingRequirementProjectFilter) return;
    state.requirementFilterProject = e.target.value;
    populateRequirementFilters();
    renderRequirements();
  });
  
  typeFilter?.addEventListener('change', (e) => {
    state.requirementFilterType = e.target.value;
    renderRequirements();
  });
}

function setupFunctionalRequirementSearchAndFilterListeners() {
  const searchInput = document.getElementById('functional-requirement-search');
  const projectFilter = document.getElementById('functional-requirement-filter-project');
  
  searchInput?.addEventListener('input', (e) => {
    state.functionalRequirementSearch = e.target.value;
    renderFunctionalRequirements();
  });
  
  projectFilter?.addEventListener('change', (e) => {
    if (isUpdatingFunctionalRequirementProjectFilter) return;
    state.functionalRequirementFilterProject = e.target.value;
    renderFunctionalRequirements();
  });
}

function setupCsvListeners() {
  const configs = [
    {
      label: 'Milestones',
      exportId: 'milestones-export-btn',
      templateKey: 'milestones',
      templateId: 'milestones-template-btn',
      importId: 'milestones-import-btn',
      inputId: 'milestones-csv-input',
      exportFn: exportMilestonesToCsv,
      importFn: importMilestonesFromCsv,
      onImported: () => {
        renderMilestones();
        renderProjects();
        updateAllSelects();
      },
    },
    {
      label: 'User Requirements',
      exportId: 'requirements-export-btn',
      templateKey: 'requirements',
      templateId: 'requirements-template-btn',
      importId: 'requirements-import-btn',
      inputId: 'requirements-csv-input',
      exportFn: exportRequirementsToCsv,
      importFn: importRequirementsFromCsv,
      onImported: () => {
        renderRequirements();
        renderFunctionalRequirements();
        renderProjects();
        updateAllSelects();
      },
    },
    {
      label: 'Functional Requirements',
      exportId: 'functional-requirements-export-btn',
      templateKey: 'functionalRequirements',
      templateId: 'functional-requirements-template-btn',
      importId: 'functional-requirements-import-btn',
      inputId: 'functional-requirements-csv-input',
      exportFn: exportFunctionalRequirementsToCsv,
      importFn: importFunctionalRequirementsFromCsv,
      onImported: () => {
        renderFunctionalRequirements();
        renderRequirements();
        renderProjects();
        updateAllSelects();
      },
    },
    {
      label: 'Tasks',
      exportId: 'tasks-export-btn',
      templateKey: 'tasks',
      templateId: 'tasks-template-btn',
      importId: 'tasks-import-btn',
      inputId: 'tasks-csv-input',
      exportFn: exportTasksToCsv,
      importFn: importTasksFromCsv,
      onImported: () => {
        renderTasks();
        renderFunctionalRequirements();
        renderRequirements();
        renderProjects();
        updateAllSelects();
      },
    },
  ];

  configs.forEach(config => {
    document.getElementById(config.exportId)?.addEventListener('click', config.exportFn);
    document.getElementById(config.templateId)?.addEventListener('click', () => downloadCsvTemplate(config.templateKey));
    document.getElementById(config.importId)?.addEventListener('click', () => {
      document.getElementById(config.inputId)?.click();
    });

    const inputElement = document.getElementById(config.inputId);
    inputElement?.addEventListener('change', async (event) => {
      const target = event.target;
      if (!target || !(target instanceof HTMLInputElement)) return;
      const file = target.files?.[0];
      if (!file) {
        target.value = '';
        return;
      }

      try {
        const fileContent = await readFileAsText(file);
        const csvText = typeof fileContent === 'string' ? fileContent : '';
        const { rows } = parseCsv(csvText);
        if (rows.length === 0) {
          alert(`No rows found in ${config.label} CSV.`);
          return;
        }
        const { imported, errors } = config.importFn(rows);
        if (config.onImported) {
          config.onImported(imported, errors);
        }
        reportCsvImportResult(config.label, imported, errors);
      } catch (error) {
        console.error(`Failed to import ${config.label} CSV`, error);
        alert(`Failed to import ${config.label} CSV: ${(error && error.message) || 'Unknown error'}`);
      } finally {
        target.value = '';
      }
    });
  });
}

function buildTemplateFileName(key) {
  return `plan-e-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}-template.csv`;
}

function downloadCsvTemplate(key) {
  const template = csvTemplates[key];
  if (!template) return;
  downloadCsv(buildTemplateFileName(key), template.headers, [template.sampleRow]);
}

function exportMilestonesToCsv() {
  const rows = sortMilestones(filterMilestones(storage.getAllMilestones())).map(milestone => {
    const completedTasks = milestone.tasks ? milestone.tasks.filter(task => task.status === 'completed').length : 0;
    const totalTasks = milestone.tasks ? milestone.tasks.length : 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return [
      milestone.project?.title || '',
      milestone.title || '',
      milestone.description || '',
      formatDateForExport(milestone.targetDate),
      completedTasks,
      totalTasks,
      progress,
    ];
  });
  downloadCsv('plan-e-milestones.csv', milestoneExportHeaders, rows);
}

function exportRequirementsToCsv() {
  const requirements = sortRequirements(filterRequirements(storage.getAllRequirements()));
  const riskLevels = storage.getRiskLevels();
  const effortLevels = storage.getEffortLevels();
  const pointsMap = new Map(effortLevels.map(e => [e.id, Number(e.points) || 0]));
  const tasks = storage.getAllTasks();
  const rows = requirements.map(requirement => {
    const project = requirement.project;
    const objective = project?.objectives?.find(o => o.id === requirement.objectiveId);
    const objectiveName = objective?.name || '';
    const type = requirement.type || 'user';
    const riskLabel = riskLevels.find(r => r.id === requirement.risk)?.label || '';
    const linkedTasks = tasks.filter(t => t.requirementId === requirement.id);
    const effortSum = linkedTasks.reduce((s, t) => s + (pointsMap.get(t.effortLevel) || 0), 0);
    return [
      requirement.project?.title || '',
      requirement.trackingId || '',
      objectiveName,
      type,
      requirement.title || '',
      requirement.description || '',
      riskLabel,
      linkedTasks.length,
      effortSum || '',
    ];
  });
  downloadCsv('plan-e-requirements.csv', requirementExportHeaders, rows);
}

function exportFunctionalRequirementsToCsv() {
  const functionalRequirements = sortFunctionalRequirements(filterFunctionalRequirements(storage.getAllFunctionalRequirements()));
  const tasks = storage.getAllTasks();
  const rows = functionalRequirements.map(fr => {
    const linkedTasks = tasks.filter(task => task.requirementId === fr.id);
    const completedTasks = linkedTasks.filter(task => task.status === 'completed').length;
    const progress = linkedTasks.length > 0 ? Math.round((completedTasks / linkedTasks.length) * 100) : 0;
    return [
      fr.project?.title || '',
      fr.title || '',
      fr.description || '',
      fr.type || 'system',
      linkedTasks.length,
      progress,
    ];
  });
  downloadCsv('plan-e-functional-requirements.csv', functionalRequirementExportHeaders, rows);
}

function exportTasksToCsv() {
  const statuses = storage.getStatuses();
  const effortLevels = storage.getEffortLevels();
  const functionalRequirements = storage.getAllFunctionalRequirements();
  const rows = sortTasks(filterTasks(storage.getAllTasks())).map(task => {
    const milestoneTitle = task.milestone?.title || '';
    const requirement = functionalRequirements.find(fr => fr.id === task.requirementId);
    const statusLabel = statuses.find(status => status.id === task.status)?.label || '';
    const effortLabel = effortLevels.find(e => e.id === task.effortLevel)?.label || '';
    return [
      task.project?.title || '',
      milestoneTitle,
      requirement?.title || '',
      task.title || '',
      task.description || '',
      effortLabel,
      task.assignedResource || '',
      formatDateForExport(task.dueDate),
      statusLabel,
    ];
  });
  downloadCsv('plan-e-tasks.csv', taskExportHeaders, rows);
}

function importMilestonesFromCsv(rows) {
  const errors = [];
  let imported = 0;
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const projectTitle = getRowValue(row, ['project title', 'project']).trim();
    const milestoneTitle = getRowValue(row, ['milestone title', 'title']).trim();
    const description = getRowValue(row, ['description', 'details', 'notes']).trim();
    const targetDate = getRowValue(row, ['target date', 'target date (yyyy-mm-dd)', 'due date']).trim();

    if (!projectTitle || !milestoneTitle) {
      errors.push(`Row ${rowNumber}: Project and milestone title are required.`);
      return;
    }

    const project = findProjectByTitle(projectTitle);
    if (!project) {
      errors.push(`Row ${rowNumber}: Project "${projectTitle}" not found.`);
      return;
    }

    try {
      storage.createMilestone(project.id, {
        title: milestoneTitle,
        description: description || undefined,
        targetDate: targetDate || undefined,
      });
      imported += 1;
    } catch (error) {
      console.error('Milestone CSV import error', error);
      errors.push(`Row ${rowNumber}: ${error.message || 'Unable to create milestone.'}`);
    }
  });
  return { imported, errors };
}

function importRequirementsFromCsv(rows) {
  const errors = [];
  let imported = 0;
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const projectTitle = getRowValue(row, ['initiative title', 'project title', 'project']).trim();
    const objectiveName = getRowValue(row, ['objective name', 'objective']).trim();
    const typeValue = getRowValue(row, ['type']).trim().toLowerCase() || 'user';
    const requirementTitle = getRowValue(row, ['requirement title', 'title', 'requirement']).trim();
    const acceptanceCriteria = getRowValue(row, ['acceptance criteria', 'criteria', 'description']).trim();
    const riskValue = getRowValue(row, ['risk']).trim();

    if (!projectTitle || !requirementTitle) {
      errors.push(`Row ${rowNumber}: Initiative and requirement title are required.`);
      return;
    }

    const project = findProjectByTitle(projectTitle);
    if (!project) {
      errors.push(`Row ${rowNumber}: Initiative "${projectTitle}" not found.`);
      return;
    }

    let objectiveId;
    if (objectiveName && project.objectives) {
      const objective = project.objectives.find(o => (o.name || '').toLowerCase() === objectiveName.toLowerCase());
      if (objective) objectiveId = objective.id;
    }

    const type = ['user', 'system', 'admin'].includes(typeValue) ? typeValue : 'user';

    let risk;
    if (riskValue) {
      const riskLevels = storage.getRiskLevels();
      const riskLevel = riskLevels.find(r => r.label.toLowerCase() === riskValue.toLowerCase() || r.id === riskValue.toLowerCase());
      if (riskLevel) risk = riskLevel.id;
    }

    const trackingId = getRowValue(row, ['tracking id', 'tracking identifier', 'tracking number']).trim();

    try {
      storage.createRequirement(project.id, {
        trackingId: trackingId || undefined,
        title: requirementTitle,
        description: acceptanceCriteria || undefined,
        objectiveId: objectiveId || undefined,
        type,
        risk: risk || undefined,
      });
      imported += 1;
    } catch (error) {
      console.error('Requirement CSV import error', error);
      errors.push(`Row ${rowNumber}: ${error.message || 'Unable to create requirement.'}`);
    }
  });
  return { imported, errors };
}

function importFunctionalRequirementsFromCsv(rows) {
  const errors = [];
  let imported = 0;
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const projectTitle = getRowValue(row, ['initiative title', 'project title', 'project']).trim();
    const title = getRowValue(row, ['requirement title', 'functional requirement title', 'title']).trim();
    const description = getRowValue(row, ['description', 'details']).trim();
    const typeValue = getRowValue(row, ['type']).trim().toLowerCase() || 'system';

    if (!projectTitle || !title) {
      errors.push(`Row ${rowNumber}: Initiative and requirement title are required.`);
      return;
    }

    const project = findProjectByTitle(projectTitle);
    if (!project) {
      errors.push(`Row ${rowNumber}: Initiative "${projectTitle}" not found.`);
      return;
    }

    const type = ['user', 'system', 'admin'].includes(typeValue) ? typeValue : 'system';

    try {
      storage.createRequirement(project.id, {
        title,
        description: description || undefined,
        type
      });
      imported += 1;
    } catch (error) {
      console.error('Requirement CSV import error', error);
      errors.push(`Row ${rowNumber}: ${error.message || 'Unable to create requirement.'}`);
    }
  });
  return { imported, errors };
}

function importTasksFromCsv(rows) {
  const errors = [];
  let imported = 0;
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const projectTitle = getRowValue(row, ['project title', 'project']).trim();
    const taskTitle = getRowValue(row, ['task title', 'title']).trim();
    const functionalRequirementTitle = getRowValue(row, ['functional requirement title', 'linked functional requirement', 'functional requirement']).trim();
    const milestoneTitle = getRowValue(row, ['milestone title', 'milestone']).trim();
    const description = getRowValue(row, ['description', 'details', 'notes']).trim();
    const effortValue = getRowValue(row, ['effort level', 'effort']).trim();
    const assignedResource = getRowValue(row, ['assigned resource', 'resource']).trim();
    const dueDate = getRowValue(row, ['due date', 'target date', 'target date (YYYY-MM-DD)']).trim();
    const statusValue = getRowValue(row, ['status']).trim();

    if (!projectTitle || !taskTitle) {
      errors.push(`Row ${rowNumber}: Project and task title are required.`);
      return;
    }

    const project = findProjectByTitle(projectTitle);
    if (!project) {
      errors.push(`Row ${rowNumber}: Project "${projectTitle}" not found.`);
      return;
    }

    let milestoneId = '';
    let linkedFunctionalRequirementId;
    if (functionalRequirementTitle) {
      const linkedFR = findFunctionalRequirementByTitle(project.id, functionalRequirementTitle);
      if (linkedFR) {
        linkedFunctionalRequirementId = linkedFR.id;
        milestoneId = linkedFR.milestoneId || getMilestoneIdFromFunctionalRequirement(project.id, linkedFR.id);
      } else {
        console.warn(`Row ${rowNumber}: Functional requirement "${functionalRequirementTitle}" not found.`);
      }
    }

    if (!milestoneId && milestoneTitle) {
      const milestone = findMilestoneByTitle(project.id, milestoneTitle);
      if (milestone) {
        milestoneId = milestone.id;
      } else {
        console.warn(`Row ${rowNumber}: Milestone "${milestoneTitle}" not found for project "${projectTitle}".`);
      }
    }

    if (!milestoneId) {
      milestoneId = getDefaultMilestoneIdForProject(project.id);
    }

    if (!milestoneId) {
      errors.push(`Row ${rowNumber}: Unable to resolve a milestone for this task; add a milestone to the project first.`);
      return;
    }

    const effortId = resolveEffortLevelId(effortValue);
    if (effortValue && !effortId) {
      console.warn(`Row ${rowNumber}: Effort level "${effortValue}" not recognized.`);
    }

    const statusId = resolveStatusId(statusValue);
    if (statusValue && !statusId) {
      console.warn(`Row ${rowNumber}: Status "${statusValue}" not recognized.`);
    }

    try {
      const newTask = storage.createTask(project.id, milestoneId, {
        title: taskTitle,
        description: description || undefined,
        effortLevel: effortId || undefined,
        assignedResource: assignedResource || undefined,
        dueDate: dueDate || undefined,
        requirementId: linkedFunctionalRequirementId || undefined,
      });

      if (newTask && statusId && statusId !== 'not-started') {
        storage.updateTask(project.id, milestoneId, newTask.id, { status: statusId });
      }

      imported += 1;
    } catch (error) {
      console.error('Task CSV import error', error);
      errors.push(`Row ${rowNumber}: ${error.message || 'Unable to create task.'}`);
    }
  });
  return { imported, errors };
}

// Render functions
function filterProjects(projects) {
  const q = (state.projectSearch || '').trim().toLowerCase();
  if (!q) return projects;
  return projects.filter(p => {
    const title = (p.title || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    const problem = (p.problemStatement || '').toLowerCase();
    const strategy = (p.strategy || '').toLowerCase();
    return title.includes(q) || desc.includes(q) || problem.includes(q) || strategy.includes(q);
  });
}

function sortProjects(projects) {
  if (!state.projectSortColumn) return projects;
  const sorted = [...projects].sort((a, b) => {
    let aVal, bVal;
    switch (state.projectSortColumn) {
      case 'title':
        aVal = (a.title || '').toLowerCase();
        bVal = (b.title || '').toLowerCase();
        return state.projectSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'milestones':
        aVal = (a.milestones || []).length;
        bVal = (b.milestones || []).length;
        return state.projectSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      default:
        return 0;
    }
  });
  return sorted;
}

function renderProjectsTable(projects) {
  const users = storage.getUsers();
  const stakeholders = storage.getStakeholders();
  const priorities = storage.getPriorities();
  const rows = projects.map(project => {
    const ownerName = project.owner ? (users.find(u => u.id === project.owner)?.name || '') : '';
    const devLeadName = project.devLead ? (users.find(u => u.id === project.devLead)?.name || '') : '';
    const qaLeadName = project.qaLead ? (users.find(u => u.id === project.qaLead)?.name || '') : '';
    const stakeholderNames = (project.stakeholders || []).map(id => stakeholders.find(s => s.id === id)?.name || id).filter(Boolean);
    const milestoneCount = (project.milestones || []).length;
    const objectives = project.objectives || [];
    const objectivesDisplay = objectives.length
      ? objectives.map(o => {
          const priorityLabel = (o.priority && priorities.find(p => p.id === o.priority)?.label) || o.priority || '';
          return priorityLabel ? `${escapeHtml(o.name)} (${escapeHtml(priorityLabel)})` : escapeHtml(o.name);
        }).join(', ')
      : '<span class="text-muted">—</span>';
    return `
      <tr class="task-table-row" data-project-id="${project.id}">
        <td class="task-title-cell">
          <strong>${escapeHtml(project.title)}</strong>
          ${project.description ? `<div class="task-description-small">${escapeHtml(project.description)}</div>` : ''}
        </td>
        <td class="task-description-small-cell">${project.problemStatement ? escapeHtml(project.problemStatement) : '<span class="text-muted">—</span>'}</td>
        <td class="task-description-small-cell">${project.strategy ? escapeHtml(project.strategy) : '<span class="text-muted">—</span>'}</td>
        <td class="task-description-small-cell">${objectivesDisplay}</td>
        <td>${ownerName ? escapeHtml(ownerName) : '<span class="text-muted">—</span>'}</td>
        <td>${devLeadName ? escapeHtml(devLeadName) : '<span class="text-muted">—</span>'}</td>
        <td>${qaLeadName ? escapeHtml(qaLeadName) : '<span class="text-muted">—</span>'}</td>
        <td>${stakeholderNames.length ? stakeholderNames.map(n => escapeHtml(n)).join(', ') : '<span class="text-muted">—</span>'}</td>
        <td>${milestoneCount}</td>
        <td class="task-actions-cell">
          <button type="button" class="btn btn-blue btn-xs edit-project-view" data-project-id="${project.id}">Edit</button>
          <button type="button" class="btn btn-red btn-xs delete-project-view" data-project-id="${project.id}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  const getSortIndicator = (col) => state.projectSortColumn !== col ? '' : (state.projectSortDirection === 'asc' ? ' ↑' : ' ↓');
  const getSortClass = (col) => state.projectSortColumn === col ? 'sortable-header sorted' : 'sortable-header';

  return `
    <table class="tasks-table initiatives-table">
      <thead>
        <tr>
          <th class="${getSortClass('title')}" data-sort-column="title">Initiative${getSortIndicator('title')}</th>
          <th>Problem</th>
          <th>Strategy</th>
          <th>Objectives</th>
          <th>Owner</th>
          <th>Dev lead</th>
          <th>QA lead</th>
          <th>Stakeholders</th>
          <th class="${getSortClass('milestones')}" data-sort-column="milestones">Milestones${getSortIndicator('milestones')}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderProjects() {
  if (!elements.projectsList) return;

  const projectsControl = document.getElementById('projects-controls');
  if (projectsControl) projectsControl.style.display = state.projects.length > 0 ? 'block' : 'none';

  if (state.projects.length === 0) {
    elements.projectsList.innerHTML = `
      <div class="empty-state">
        <p>No initiatives yet</p>
        <p class="empty-state-sub">Create your first initiative to get started!</p>
      </div>
    `;
    return;
  }

  const filtered = filterProjects(state.projects);
  const sorted = sortProjects(filtered);

  if (sorted.length === 0) {
    elements.projectsList.innerHTML = `
      <div class="empty-state">
        <p>No initiatives match your search</p>
        <p class="empty-state-sub">Try a different search term.</p>
      </div>
    `;
    return;
  }

  elements.projectsList.innerHTML = renderProjectsTable(sorted);

  sorted.forEach(project => {
    attachProjectListeners(project);
  });

  document.querySelectorAll('#projects-list .sortable-header[data-sort-column]').forEach(header => {
    header.addEventListener('click', () => {
      const col = header.getAttribute('data-sort-column');
      if (state.projectSortColumn === col) {
        state.projectSortDirection = state.projectSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.projectSortColumn = col;
        state.projectSortDirection = 'asc';
      }
      renderProjects();
    });
  });
}

function renderMilestoneCard(milestone, projectId) {
  const isEditing = state.editingMilestones.has(milestone.id);
  
  const completedTasks = milestone.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = milestone.tasks.length;
  
  if (isEditing) {
    const targetDateValue = milestone.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : '';
    return `
      <div class="milestone-card" data-milestone-id="${milestone.id}" data-project-id="${projectId}">
        <input type="text" class="edit-title" value="${escapeHtml(milestone.title)}" data-milestone-id="${milestone.id}">
        <textarea class="edit-description" data-milestone-id="${milestone.id}">${escapeHtml(milestone.description || '')}</textarea>
        <input type="text" class="edit-target-date" value="${targetDateValue}" data-milestone-id="${milestone.id}" placeholder="Select target date">
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-milestone" data-milestone-id="${milestone.id}" data-project-id="${projectId}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit-milestone" data-milestone-id="${milestone.id}">Cancel</button>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="milestone-card" data-milestone-id="${milestone.id}" data-project-id="${projectId}">
      <div class="project-card-header">
        <div class="project-card-content">
          <h3>${escapeHtml(milestone.title)}</h3>
          ${milestone.description ? `<p>${escapeHtml(milestone.description)}</p>` : ''}
          ${milestone.targetDate ? `<p class="text-xs text-muted">Target Date: ${new Date(milestone.targetDate).toLocaleDateString()}</p>` : ''}
          ${milestone.dueDate ? `<p class="text-xs text-muted">Due: ${new Date(milestone.dueDate).toLocaleDateString()}</p>` : ''}
          <p class="text-xs text-muted">${completedTasks}/${totalTasks} tasks completed</p>
        </div>
        <div class="project-card-actions">
          <button class="btn btn-blue btn-xs edit-milestone" data-milestone-id="${milestone.id}" data-project-id="${projectId}">Edit</button>
          <button class="btn btn-red btn-xs delete-milestone" data-milestone-id="${milestone.id}" data-project-id="${projectId}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function renderTaskCard(task, projectId, milestoneId) {
  const isEditing = state.editingTasks.has(task.id);
  const isCompleted = task.status === 'completed';
  
  if (isEditing) {
    const statuses = storage.getStatuses();
    const effortLevels = storage.getEffortLevels();
    const users = storage.getUsers();
    
    const statusOptions = statuses.map(s => 
      `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
    ).join('');
    
    const effortOptions = effortLevels.map(e => 
      `<option value="${e.id}" ${task.effortLevel === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
    ).join('');
    
    const userOptions = users.map(u => 
      `<option value="${u.name}" ${task.assignedResource === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
    ).join('');
    
    return `
      <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
        <input type="text" class="edit-title" value="${escapeHtml(task.title)}" data-task-id="${task.id}">
        <textarea class="edit-description" data-task-id="${task.id}">${escapeHtml(task.description || '')}</textarea>
        <div class="form-row">
          <div class="form-group">
            <label>Status</label>
            <select class="edit-status" data-task-id="${task.id}">
              ${statusOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Effort</label>
            <select class="edit-effort" data-task-id="${task.id}">
              <option value="">None</option>
              ${effortOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Resource</label>
            <select class="edit-resource" data-task-id="${task.id}">
              <option value="">None</option>
              ${userOptions}
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-task" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit-task" data-task-id="${task.id}">Cancel</button>
        </div>
      </div>
    `;
  }
  
  const statuses = storage.getStatuses();
  const status = statuses.find(s => s.id === task.status);
  const statusColorStyle = status?.color ? getStatusSelectStyle(status.color) : '';
  
  const statusOptions = statuses.map(s => 
    `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  
  return `
    <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
      <div class="project-card-header">
        <div class="project-card-content" style="flex: 1; min-width: 0;">
          <select class="task-status-select" style="${statusColorStyle}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
            ${statusOptions}
          </select>
          <h4>${escapeHtml(task.title)}</h4>
          ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
          <div class="task-meta">
            ${(() => {
              const effortLevels = storage.getEffortLevels();
              const effort = effortLevels.find(e => e.id === task.effortLevel);
              const effortBadgeStyle = effort?.color ? getBadgeStyle(effort.color) : '';
              return effort ? `<span class="badge" style="${effortBadgeStyle}">Effort: ${escapeHtml(effort.label)}</span>` : '';
            })()}
            ${task.assignedResource ? `<span>Assigned to: ${escapeHtml(task.assignedResource)}</span>` : ''}
            ${task.startDate ? `<span>Started: ${new Date(task.startDate).toLocaleDateString()}</span>` : ''}
            ${task.completedDate ? `<span>Completed: ${new Date(task.completedDate).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
        <div class="project-card-actions">
          <button class="btn btn-blue btn-xs edit-task" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Edit</button>
          <button class="btn btn-red btn-xs delete-task" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function renderAddMilestoneForm(projectId) {
  return `
    <form class="add-milestone-form" data-project-id="${projectId}">
      <input type="text" class="milestone-title-input" placeholder="Milestone title" required>
      <textarea class="milestone-description-input" placeholder="Description (optional)" rows="2"></textarea>
      <input type="text" class="milestone-target-date-input" placeholder="Target Date (optional)">
      <div class="form-actions">
        <button type="submit" class="btn btn-green btn-sm">Add Milestone</button>
        <button type="button" class="btn btn-secondary btn-sm cancel-add-milestone" data-project-id="${projectId}">Cancel</button>
      </div>
    </form>
  `;
}

function renderAddTaskForm(projectId, milestoneId) {
  return `
    <form class="add-task-form" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
      <input type="text" class="task-title-input" placeholder="Task title" required>
      <textarea class="task-description-input" placeholder="Description (optional)" rows="2"></textarea>
      <div class="form-actions">
        <button type="submit" class="btn btn-green btn-sm">Add Task</button>
        <button type="button" class="btn btn-secondary btn-sm cancel-add-task" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Cancel</button>
      </div>
    </form>
  `;
}

function renderMilestones() {
  if (!elements.milestonesList) return;
  
  const allMilestones = storage.getAllMilestones();
  
  // Apply filters
  const filteredMilestones = filterMilestones(allMilestones);
  
  // Apply sorting
  const sortedMilestones = sortMilestones(filteredMilestones);
  
  if (!sortedMilestones.some(m => m.id === state.activeMilestoneId)) {
    state.activeMilestoneId = null;
  }

  if (sortedMilestones.length === 0) {
    elements.milestonesList.innerHTML = `
      <div class="empty-state">
        <p>No milestones found</p>
        <p class="empty-state-sub">${allMilestones.length === 0 ? 'Create your first milestone to get started!' : 'Try adjusting your search or filters.'}</p>
      </div>
    `;
    return;
  }
  
  // Render table
  elements.milestonesList.innerHTML = renderMilestonesTable(sortedMilestones);
  
  // Attach event listeners for milestones in the view
  sortedMilestones.forEach(milestone => {
    attachMilestoneTableListeners(milestone);
  });
  
  // Populate filter dropdowns if not already populated
  populateMilestoneFilters();
  
  // Attach sort listeners
  attachMilestoneSortListeners();
}

function sortMilestones(milestones) {
  if (!state.milestoneSortColumn) return milestones;
  
  const sorted = [...milestones].sort((a, b) => {
    let aVal, bVal;
    
    switch (state.milestoneSortColumn) {
      case 'title':
        aVal = a.title || '';
        bVal = b.title || '';
        break;
      case 'project':
        aVal = a.project?.title || '';
        bVal = b.project?.title || '';
        break;
      case 'targetDate':
        aVal = a.targetDate ? new Date(a.targetDate).getTime() : 0;
        bVal = b.targetDate ? new Date(b.targetDate).getTime() : 0;
        break;
      case 'progress':
        const aCompleted = a.tasks ? a.tasks.filter(t => t.status === 'completed').length : 0;
        const aTotal = a.tasks ? a.tasks.length : 0;
        const bCompleted = b.tasks ? b.tasks.filter(t => t.status === 'completed').length : 0;
        const bTotal = b.tasks ? b.tasks.length : 0;
        aVal = aTotal > 0 ? aCompleted / aTotal : 0;
        bVal = bTotal > 0 ? bCompleted / bTotal : 0;
        break;
      default:
        return 0;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return state.milestoneSortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return state.milestoneSortDirection === 'asc' 
        ? aVal - bVal
        : bVal - aVal;
    }
  });
  
  return sorted;
}

function filterMilestones(milestones) {
  return milestones.filter(milestone => {
    // Search filter
    if (state.milestoneSearch) {
      const searchLower = state.milestoneSearch.toLowerCase();
      const matchesSearch = 
        milestone.title.toLowerCase().includes(searchLower) ||
        (milestone.description && milestone.description.toLowerCase().includes(searchLower)) ||
        (milestone.project && milestone.project.title.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // Project filter
    if (state.milestoneFilterProject && milestone.projectId !== state.milestoneFilterProject) {
      return false;
    }
    
    return true;
  });
}

function renderMilestonesTable(milestones) {
  const rows = milestones.map(m => {
    const completedTasks = m.tasks ? m.tasks.filter(t => t.status === 'completed').length : 0;
    const totalTasks = m.tasks ? m.tasks.length : 0;
    const { segmentsHtml, completedPercent } = buildProgressSegments(m.tasks || []);
    const progressBarHtml = renderProgressMeter(segmentsHtml, completedPercent);
    const rowClass = `task-table-row milestone-row${state.activeMilestoneId === m.id ? ' expanded' : ''}`;
    
    return `
      <tr class="${rowClass}" data-milestone-id="${m.id}" data-project-id="${m.projectId}">
        <td class="task-title-cell">
          <strong>${escapeHtml(m.title)}</strong>
          ${m.description ? `<div class="task-description-small">${escapeHtml(m.description)}</div>` : ''}
        </td>
        <td class="task-project-cell">${escapeHtml(m.project.title)}</td>
        <td>${m.targetDate ? new Date(m.targetDate).toLocaleDateString() : '<span class="text-muted">—</span>'}</td>
        <td>${completedTasks}/${totalTasks}</td>
        <td>
          <div class="milestone-progress">
            ${progressBarHtml}
          </div>
        </td>
        <td class="task-actions-cell">
          <button class="btn btn-blue btn-xs edit-milestone-view" data-milestone-id="${m.id}" data-project-id="${m.projectId}">Edit</button>
          <button class="btn btn-red btn-xs delete-milestone-view" data-milestone-id="${m.id}" data-project-id="${m.projectId}">Delete</button>
        </td>
      </tr>
    ` + renderMilestoneExpansionRow(m);
  }).join('');
  
  const getSortIndicator = (column) => {
    if (state.milestoneSortColumn !== column) return '';
    return state.milestoneSortDirection === 'asc' ? ' ↑' : ' ↓';
  };
  
  const getSortClass = (column) => {
    return state.milestoneSortColumn === column ? 'sortable-header sorted' : 'sortable-header';
  };
  
  return `
    <table class="tasks-table">
      <thead>
        <tr>
          <th class="${getSortClass('title')}" data-sort-column="title">Milestone${getSortIndicator('title')}</th>
          <th class="${getSortClass('project')}" data-sort-column="project">Initiative${getSortIndicator('project')}</th>
          <th class="${getSortClass('targetDate')}" data-sort-column="targetDate">Target Date${getSortIndicator('targetDate')}</th>
          <th class="${getSortClass('progress')}" data-sort-column="progress">Progress${getSortIndicator('progress')}</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function attachMilestoneTableListeners(milestone) {
  const milestoneId = milestone.id;
  const projectId = milestone.projectId;
  const row = document.querySelector(`.milestone-row[data-milestone-id="${milestoneId}"]`);
  row?.addEventListener('click', (e) => {
    if (e.target.closest('.task-actions-cell') || e.target.closest('button')) {
      return;
    }
    state.activeMilestoneId = state.activeMilestoneId === milestoneId ? null : milestoneId;
    renderMilestones();
  });

  if (state.activeMilestoneId === milestoneId) {
    document.querySelector(`.cancel-milestone-expansion[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
      state.activeMilestoneId = null;
      renderMilestones();
    });
  }

  // Edit milestone button
  document.querySelector(`.edit-milestone-view[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', (e) => {
    e.stopPropagation();
    window.openEditMilestoneModal(milestone);
  });

  // Delete milestone button
  document.querySelector(`.delete-milestone-view[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${milestone.title}"?`)) return;
    
    try {
      storage.deleteMilestone(projectId, milestoneId);
      renderMilestones();
      renderProjects(); // Also update projects view if visible
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      alert('Failed to delete milestone');
    }
  });
}

function renderMilestoneExpansionRow(milestone) {
  if (state.activeMilestoneId !== milestone.id) {
    return '';
  }

  const allRequirements = storage.getAllRequirements();
  const milestoneRequirements = allRequirements.filter(req => req.milestoneId === milestone.id);
  const requirementItems = milestoneRequirements.map(req => {
    const project = storage.getProject(req.projectId);
    const allFunctionalRequirements = storage.getAllFunctionalRequirements();
    const linkedFunctionalReqs = allFunctionalRequirements.filter(fr => (fr.linkedUserRequirements || []).includes(req.id));
    const allTasks = storage.getAllTasks();
    const linkedTasks = allTasks.filter(task => linkedFunctionalReqs.some(fr => fr.id === task.requirementId));
    const progressBarHtml = renderUserRequirementProgressBar(req, linkedTasks, false);
    return `
      <div class="milestone-urs-item">
        <div class="milestone-urs-info">
          <strong>${escapeHtml(req.title)}</strong>
          <p class="milestone-urs-meta">
            ${linkedFunctionalReqs.length} FRS${linkedFunctionalReqs.length !== 1 ? 's' : ''} · ${linkedTasks.length} task${linkedTasks.length !== 1 ? 's' : ''}
          </p>
          ${req.description ? `<p class="milestone-urs-description">${escapeHtml(req.description)}</p>` : ''}
        </div>
        <div class="milestone-urs-progress">
          ${progressBarHtml}
        </div>
      </div>
    `;
  }).join('');

  const content = requirementItems || '<p class="milestone-expansion-empty">No URSs linked to this milestone yet.</p>';

  return `
    <tr class="milestone-expansion-row" data-milestone-id="${milestone.id}">
      <td colspan="7">
        <div class="milestone-expansion-panel">
          <div class="milestone-expansion-header">
            <h3>Linked URSs</h3>
            <button type="button" class="btn btn-secondary btn-xs cancel-milestone-expansion" data-milestone-id="${milestone.id}">
              Close
            </button>
          </div>
          <div class="milestone-expansion-body">
            ${content}
          </div>
        </div>
      </td>
    </tr>
  `;
}

function attachMilestoneSortListeners() {
  const headers = document.querySelectorAll('#milestones-list .sortable-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort-column');
      if (state.milestoneSortColumn === column) {
        state.milestoneSortDirection = state.milestoneSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.milestoneSortColumn = column;
        state.milestoneSortDirection = 'asc';
      }
      renderMilestones();
    });
  });
}

function getUniqueTasks(tasks) {
  const unique = new Map();
  tasks.forEach(task => {
    if (task && task.id) {
      unique.set(task.id, task);
    }
  });
  return Array.from(unique.values());
}

function renderProgressSummaryCard(completedCount, totalCount, label) {
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return `
    <div class="progress-summary-card">
      <div class="progress-summary-header">
        <span>${label}</span>
        <span class="progress-summary-percentage">${percentage}%</span>
      </div>
      <div class="progress-summary-bar">
        <div class="progress-summary-bar-fill" style="width: ${percentage}%;"></div>
      </div>
    </div>
  `;
}

function renderRequirementsProgressSummary(requirements) {
  const container = elements.requirementsProgressView;
  if (!container) return;
  const requirementIds = requirements.map(req => req.id);
  const allTasks = storage.getAllTasks();
  const relevantTasks = allTasks.filter(task => requirementIds.includes(task.requirementId));
  const uniqueTasks = getUniqueTasks(relevantTasks);
  const completed = uniqueTasks.filter(task => task.status === 'completed').length;
  container.innerHTML = renderProgressSummaryCard(completed, uniqueTasks.length, 'Requirements progress');
}

function renderFunctionalRequirementsProgressSummary(functionalRequirements) {
  const container = elements.functionalRequirementsProgressView;
  if (!container) return;
  const allTasks = storage.getAllTasks();
  const relevantTasks = allTasks.filter(task =>
    functionalRequirements.some(fr => fr.id === task.requirementId)
  );
  const uniqueTasks = getUniqueTasks(relevantTasks);
  const completed = uniqueTasks.filter(task => task.status === 'completed').length;
  container.innerHTML = renderProgressSummaryCard(completed, uniqueTasks.length, 'FRS Progress');
}

function renderRequirements() {
  if (!elements.requirementsList) return;
  
  const allRequirements = storage.getAllRequirements();
  
  // Apply filters
  const filteredRequirements = filterRequirements(allRequirements);
  
  // Apply sorting
  const sortedRequirements = sortRequirements(filteredRequirements);
  
  if (!sortedRequirements.some(req => req.id === state.activeRequirementLinkId)) {
    state.activeRequirementLinkId = null;
  }

  renderRequirementsProgressSummary(sortedRequirements);

  if (sortedRequirements.length === 0) {
    elements.requirementsList.innerHTML = `
      <div class="empty-state">
        <p>No user requirements found</p>
        <p class="empty-state-sub">${allRequirements.length === 0 ? 'Create your first user requirement to get started!' : 'Try adjusting your search or filters.'}</p>
      </div>
    `;
    return;
  }
  
  // Render table
  elements.requirementsList.innerHTML = renderRequirementsTable(sortedRequirements);
  
  // Attach event listeners for requirements in the view
  sortedRequirements.forEach(requirement => {
    attachRequirementViewListeners(requirement);
  });
  
  // Populate filter dropdowns if not already populated
  populateRequirementFilters();
  
  // Attach sort listeners
  attachRequirementSortListeners();
}

function populateRequirementFilters() {
  const projects = storage.getAllProjects();

  // Populate type filter
  const typeFilter = document.getElementById('requirement-filter-type');
  if (typeFilter) {
    const selectedValue = state.requirementFilterType || typeFilter.value || '';
    const typeOptions = [
      { value: '', label: 'All types' },
      { value: 'user', label: 'User' },
      { value: 'system', label: 'System' },
      { value: 'admin', label: 'Admin' }
    ];
    typeFilter.innerHTML = typeOptions.map(o =>
      `<option value="${o.value}" ${selectedValue === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
    ).join('');
  }

  // Populate project filter
  const projectFilter = document.getElementById('requirement-filter-project');
  if (projectFilter) {
    const selectedValue = state.requirementFilterProject || projectFilter.value || '';
    isUpdatingRequirementProjectFilter = true;
    try {
      while (projectFilter.options.length > 1) {
        projectFilter.remove(1);
      }
      projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.title;
        projectFilter.appendChild(option);
      });
      projectFilter.value = selectedValue;
    } finally {
      isUpdatingRequirementProjectFilter = false;
    }
  }
}

function attachFunctionalRequirementExpansionListeners(functionalRequirement) {
  const frId = functionalRequirement.id;

  document.querySelector(`.fr-create-task-form[data-functional-requirement-id="${frId}"]`)?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleCreateTaskFromFunctionalRequirement(functionalRequirement);
  });

  document.querySelector(`.link-task-to-fr[data-functional-requirement-id="${frId}"]`)?.addEventListener('click', () => {
    handleLinkTaskToFunctionalRequirement(functionalRequirement);
  });

  document.querySelectorAll(`.unlink-task-from-fr[data-functional-requirement-id="${frId}"]`).forEach(button => {
    button.addEventListener('click', () => {
      const taskId = button.getAttribute('data-task-id');
      if (!taskId) return;
      handleUnlinkTaskFromFunctionalRequirement(functionalRequirement, taskId);
    });
  });

  document.querySelector(`.cancel-fr-task[data-functional-requirement-id="${frId}"]`)?.addEventListener('click', () => {
    state.activeFunctionalRequirementId = null;
    renderFunctionalRequirements();
  });
}

function handleCreateTaskFromFunctionalRequirement(functionalRequirement) {
  const frId = functionalRequirement.id;
  const form = document.querySelector(`.fr-create-task-form[data-functional-requirement-id="${frId}"]`);
  if (!form) return;
  const title = form.querySelector('.fr-task-title')?.value.trim();
  const description = form.querySelector('.fr-task-description')?.value.trim();
  let milestoneId = form.querySelector('.fr-task-milestone')?.value;
  if (!title) {
    alert('Please enter a title for the task.');
    return;
  }
  if (!milestoneId) {
    if (functionalRequirement.milestoneId) {
      milestoneId = functionalRequirement.milestoneId;
    } else {
      alert('Please select a milestone for the new task.');
      return;
    }
  }

  const effort = form.querySelector('.fr-task-effort')?.value || '';
  const resource = form.querySelector('.fr-task-resource')?.value || '';

  try {
    storage.createTask(functionalRequirement.projectId, milestoneId, {
      title,
      description: description || undefined,
      requirementId: frId,
      effortLevel: effort || undefined,
      assignedResource: resource || undefined,
    });
    state.activeFunctionalRequirementId = frId;
    renderFunctionalRequirements();
    renderRequirements();
    renderProjects();
  } catch (error) {
    console.error('Failed to create task from functional requirement view:', error);
    alert('Failed to create task');
  }
}

function handleLinkTaskToFunctionalRequirement(functionalRequirement) {
  const select = document.getElementById(`existing-task-select-${functionalRequirement.id}`);
  if (!select) return;
  const taskId = select.value;
  if (!taskId) {
    alert('Please select a task to link.');
    return;
  }

  const allTasks = storage.getAllTasks();
  const task = allTasks.find(t => t.id === taskId);
  if (!task) {
    alert('The selected task could not be found.');
    return;
  }

  try {
    storage.updateTask(task.projectId, task.milestoneId, taskId, {
      requirementId: functionalRequirement.id,
    });
    state.activeFunctionalRequirementId = functionalRequirement.id;
    renderFunctionalRequirements();
    renderRequirements();
    renderProjects();
  } catch (error) {
    console.error('Failed to link task to functional requirement:', error);
    alert('Failed to link task');
  }
}

function handleUnlinkTaskFromFunctionalRequirement(functionalRequirement, taskId) {
  const allTasks = storage.getAllTasks();
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  try {
    storage.updateTask(task.projectId, task.milestoneId, taskId, {
      requirementId: undefined,
    });
    state.activeFunctionalRequirementId = functionalRequirement.id;
    renderFunctionalRequirements();
    renderRequirements();
    renderProjects();
  } catch (error) {
    console.error('Failed to unlink task from functional requirement:', error);
    alert('Failed to unlink task');
  }
}

function populateMilestoneFilters() {
  const projects = storage.getAllProjects();
  
  // Populate project filter
  const projectFilter = document.getElementById('milestone-filter-project');
  if (projectFilter) {
    // Clear existing options except the first one
    while (projectFilter.options.length > 1) {
      projectFilter.remove(1);
    }
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.title;
      projectFilter.appendChild(option);
    });
  }
}

function populateFunctionalRequirementFilters() {
  const projects = storage.getAllProjects();
  
  // Populate project filter
  const projectFilter = document.getElementById('functional-requirement-filter-project');
  if (projectFilter) {
    const selectedValue = state.functionalRequirementFilterProject || projectFilter.value || '';
    isUpdatingFunctionalRequirementProjectFilter = true;
    try {
      // Clear existing options except the first one
      while (projectFilter.options.length > 1) {
        projectFilter.remove(1);
      }
      projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.title;
        projectFilter.appendChild(option);
      });
      projectFilter.value = selectedValue;
    } finally {
      isUpdatingFunctionalRequirementProjectFilter = false;
    }
  }
}

function sortRequirements(requirements) {
  if (!state.requirementSortColumn) return requirements;
  
  const sorted = [...requirements].sort((a, b) => {
    let aVal, bVal;
    
    switch (state.requirementSortColumn) {
      case 'trackingId':
        aVal = a.trackingId || '';
        bVal = b.trackingId || '';
        break;
      case 'title':
        aVal = a.title || '';
        bVal = b.title || '';
        break;
      case 'project':
        aVal = a.project?.title || '';
        bVal = b.project?.title || '';
        break;
      case 'objective': {
        const aProj = state.projects.find(p => p.id === a.projectId);
        const bProj = state.projects.find(p => p.id === b.projectId);
        const aObj = aProj?.objectives?.find(o => o.id === a.objectiveId);
        const bObj = bProj?.objectives?.find(o => o.id === b.objectiveId);
        aVal = aObj?.name || '';
        bVal = bObj?.name || '';
        break;
      }
      case 'type':
        aVal = a.type || 'user';
        bVal = b.type || 'user';
        break;
      case 'risk': {
        const riskLevels = storage.getRiskLevels();
        const aRiskLabel = riskLevels.find(r => r.id === a.risk)?.label || '';
        const bRiskLabel = riskLevels.find(r => r.id === b.risk)?.label || '';
        aVal = aRiskLabel;
        bVal = bRiskLabel;
        break;
      }
      case 'riskValue':
        aVal = a.riskValue !== undefined && a.riskValue !== null ? a.riskValue : -1;
        bVal = b.riskValue !== undefined && b.riskValue !== null ? b.riskValue : -1;
        break;
      case 'linkedTasks': {
        const allTasksForSort = storage.getAllTasks();
        const aLinkedTasks = allTasksForSort.filter(t => t.requirementId === a.id);
        const bLinkedTasks = allTasksForSort.filter(t => t.requirementId === b.id);
        aVal = aLinkedTasks.length;
        bVal = bLinkedTasks.length;
        break;
      }
      case 'effort': {
        const effortLevelsForSort = storage.getEffortLevels();
        const pointsMap = new Map(effortLevelsForSort.map(e => [e.id, Number(e.points) || 0]));
        const allTasksForEffort = storage.getAllTasks();
        const aTasks = allTasksForEffort.filter(t => t.requirementId === a.id);
        const bTasks = allTasksForEffort.filter(t => t.requirementId === b.id);
        aVal = aTasks.reduce((s, t) => s + (pointsMap.get(t.effortLevel) || 0), 0);
        bVal = bTasks.reduce((s, t) => s + (pointsMap.get(t.effortLevel) || 0), 0);
        break;
      }
      default:
        return 0;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return state.requirementSortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return state.requirementSortDirection === 'asc' 
        ? aVal - bVal
        : bVal - aVal;
    }
  });
  
  return sorted;
}

function filterRequirements(requirements) {
  return requirements.filter(requirement => {
    // Search filter
    if (state.requirementSearch) {
      const searchLower = state.requirementSearch.toLowerCase();
      const matchesSearch = 
        requirement.title.toLowerCase().includes(searchLower) ||
        (requirement.trackingId && requirement.trackingId.toLowerCase().includes(searchLower)) ||
        (requirement.description && requirement.description.toLowerCase().includes(searchLower)) ||
        requirement.project.title.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    // Project filter
    if (state.requirementFilterProject && requirement.projectId !== state.requirementFilterProject) {
      return false;
    }
    
    // Type filter
    if (state.requirementFilterType && requirement.type !== state.requirementFilterType) {
      return false;
    }
    
    return true;
  });
}

function renderRequirementsTable(requirements) {
  const allTasks = storage.getAllTasks();
  const effortLevels = storage.getEffortLevels();
  const pointsMap = new Map(effortLevels.map(e => [e.id, Number(e.points) || 0]));
  const riskLevels = storage.getRiskLevels();

  const rows = requirements.map(r => {
    if (state.editingRequirements.has(r.id)) {
      return renderRequirementEditRow(r);
    }

    const project = state.projects.find(p => p.id === r.projectId);
    const objective = project?.objectives?.find(o => o.id === r.objectiveId);
    const typeLabel = (r.type || 'user').charAt(0).toUpperCase() + (r.type || 'user').slice(1);
    const risk = riskLevels.find(l => l.id === r.risk);
    const riskBadgeStyle = risk?.color ? getBadgeStyle(risk.color) : '';
    const linkedTasks = allTasks.filter(t => t.requirementId === r.id);
    const effortSum = linkedTasks.reduce((s, t) => s + (pointsMap.get(t.effortLevel) || 0), 0);

    const progressBarHtml = renderUserRequirementProgressBar(r, linkedTasks, false);
    const isExpanded = state.activeRequirementLinkId === r.id;
    const rowClass = `task-table-row requirement-row${isExpanded ? ' expanded' : ''}`;

    const trackingIdDisplay = r.trackingId
      ? `<strong>${escapeHtml(r.trackingId)}</strong>`
      : '<span class="text-muted">—</span>';
    const rowHtml = `
      <tr class="${rowClass}" data-requirement-id="${r.id}" data-project-id="${r.projectId}">
        <td>${trackingIdDisplay}</td>
        <td class="task-title-cell">
          <strong>${escapeHtml(r.title)}</strong>
          ${r.description ? `<div class="task-description-small">${escapeHtml(r.description)}</div>` : ''}
        </td>
        <td class="task-project-cell">${escapeHtml(r.project.title)}</td>
        <td class="task-objective-cell">${objective ? escapeHtml(objective.name) : '<span class="text-muted">—</span>'}</td>
        <td>${typeLabel}</td>
        <td>${risk ? `<span class="badge" style="${riskBadgeStyle}">${escapeHtml(risk.label)}</span>` : '<span class="text-muted">—</span>'}</td>
        <td class="requirement-risk-value-cell">${r.riskValue !== undefined && r.riskValue !== null ? escapeHtml(String(r.riskValue)) : '<span class="text-muted">—</span>'}</td>
        <td>${linkedTasks.length}</td>
        <td>${effortSum > 0 ? `${effortSum} pts` : '<span class="text-muted">—</span>'}</td>
        <td>
          <div class="progress-cell">
            ${progressBarHtml}
          </div>
        </td>
        <td class="task-actions-cell">
          <button class="btn btn-blue btn-xs edit-requirement-view" data-requirement-id="${r.id}" data-project-id="${r.projectId}">Edit</button>
          <button class="btn btn-red btn-xs delete-requirement-view" data-requirement-id="${r.id}" data-project-id="${r.projectId}">Delete</button>
        </td>
      </tr>
    `;

    return rowHtml + renderRequirementExpansionRow(r);
  }).join('');

  const getSortIndicator = (column) => {
    if (state.requirementSortColumn !== column) return '';
    return state.requirementSortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const getSortClass = (column) => {
    return state.requirementSortColumn === column ? 'sortable-header sorted' : 'sortable-header';
  };

  return `
    <table class="tasks-table">
      <thead>
        <tr>
          <th class="${getSortClass('trackingId')}" data-sort-column="trackingId">Tracking ID${getSortIndicator('trackingId')}</th>
          <th class="${getSortClass('title')}" data-sort-column="title">Requirement${getSortIndicator('title')}</th>
          <th class="${getSortClass('project')}" data-sort-column="project">Initiative${getSortIndicator('project')}</th>
          <th class="${getSortClass('objective')}" data-sort-column="objective">Objective${getSortIndicator('objective')}</th>
          <th class="${getSortClass('type')}" data-sort-column="type">Type${getSortIndicator('type')}</th>
          <th class="${getSortClass('risk')}" data-sort-column="risk">Risk${getSortIndicator('risk')}</th>
          <th class="${getSortClass('riskValue')}" data-sort-column="riskValue">Risk value${getSortIndicator('riskValue')}</th>
          <th class="${getSortClass('linkedTasks')}" data-sort-column="linkedTasks">Linked Tasks${getSortIndicator('linkedTasks')}</th>
          <th class="${getSortClass('effort')}" data-sort-column="effort">Effort${getSortIndicator('effort')}</th>
          <th>Progress</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function getRequirementProjectOptions(selectedProjectId) {
  const options = state.projects.map(project =>
    `<option value="${project.id}" ${project.id === selectedProjectId ? 'selected' : ''}>${escapeHtml(project.title)}</option>`
  ).join('');
  return `<option value="">Select a project</option>${options}`;
}

function getRequirementMilestoneOptions(projectId, selectedMilestoneId = '') {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) {
    return '<option value="">Select a project first</option>';
  }
  const milestoneOptions = project.milestones.map(milestone =>
    `<option value="${milestone.id}" ${milestone.id === selectedMilestoneId ? 'selected' : ''}>${escapeHtml(milestone.title)}</option>`
  ).join('');
  return '<option value="">None</option>' + milestoneOptions;
}

function getRequirementObjectiveOptions(projectId, selectedObjectiveId = '') {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) {
    return '<option value="">Select initiative first</option>';
  }
  const objectives = project.objectives || [];
  const options = objectives.map(o =>
    `<option value="${o.id}" ${o.id === selectedObjectiveId ? 'selected' : ''}>${escapeHtml(o.name || o.id)}</option>`
  ).join('');
  return '<option value="">None</option>' + options;
}

function refreshRequirementObjectiveOptions(requirementId, projectId, selectedObjectiveId = '') {
  const objectiveSelect = document.querySelector(`.requirement-edit-objective-select[data-requirement-id="${requirementId}"]`);
  if (!objectiveSelect) return;
  objectiveSelect.innerHTML = projectId
    ? getRequirementObjectiveOptions(projectId, selectedObjectiveId)
    : '<option value="">Select initiative first</option>';
}

function renderRequirementEditRow(requirement) {
  const projectOptions = getRequirementProjectOptions(requirement.projectId);
  const objectiveOptions = getRequirementObjectiveOptions(requirement.projectId, requirement.objectiveId);
  const riskLevels = storage.getRiskLevels();
  const riskOptions = riskLevels.map(r =>
    `<option value="${r.id}" ${r.id === requirement.risk ? 'selected' : ''}>${escapeHtml(r.label)}</option>`
  ).join('');

  return `
    <tr class="task-table-row requirement-edit-row" data-requirement-id="${requirement.id}">
      <td colspan="11">
        <div class="requirement-edit-form">
          <div class="form-row">
            <div class="form-group">
              <label for="requirement-edit-project-${requirement.id}">Initiative *</label>
              <select id="requirement-edit-project-${requirement.id}" class="requirement-edit-project-select" data-requirement-id="${requirement.id}">
                ${projectOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="requirement-edit-objective-${requirement.id}">Objective</label>
              <select id="requirement-edit-objective-${requirement.id}" class="requirement-edit-objective-select" data-requirement-id="${requirement.id}">
                ${objectiveOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="requirement-edit-type-${requirement.id}">Type</label>
              <select id="requirement-edit-type-${requirement.id}" class="requirement-edit-type" data-requirement-id="${requirement.id}">
                <option value="user" ${(requirement.type || 'user') === 'user' ? 'selected' : ''}>User</option>
                <option value="system" ${requirement.type === 'system' ? 'selected' : ''}>System</option>
                <option value="admin" ${requirement.type === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label for="requirement-edit-risk-${requirement.id}">Risk</label>
              <select id="requirement-edit-risk-${requirement.id}" class="requirement-edit-risk" data-requirement-id="${requirement.id}">
                <option value="">None</option>
                ${riskOptions}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="requirement-edit-tracking-${requirement.id}">Tracking ID</label>
              <input type="text" id="requirement-edit-tracking-${requirement.id}" class="requirement-edit-tracking" data-requirement-id="${requirement.id}" value="${escapeHtml(requirement.trackingId || '')}" placeholder="Tracking ID (optional)">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group requirement-edit-title-group">
              <label for="requirement-edit-title-${requirement.id}">Requirement Title *</label>
              <input type="text" id="requirement-edit-title-${requirement.id}" class="requirement-edit-title" data-requirement-id="${requirement.id}" value="${escapeHtml(requirement.title)}" placeholder="Enter requirement title">
            </div>
          </div>
          <div class="form-group">
            <label for="requirement-edit-description-${requirement.id}">Acceptance Criteria (optional)</label>
            <textarea id="requirement-edit-description-${requirement.id}" class="requirement-edit-description" data-requirement-id="${requirement.id}" rows="3" placeholder="Enter acceptance criteria">${escapeHtml(requirement.description || '')}</textarea>
          </div>
          <div class="form-row risk-assessment-row">
            <span class="risk-assessment-inline-label">Risk (T0085):</span>
            <div class="form-group risk-factor-inline">
              <label for="requirement-edit-di-${requirement.id}">DI</label>
              <select id="requirement-edit-di-${requirement.id}" class="requirement-edit-risk-factor" data-requirement-id="${requirement.id}" data-risk-factor="dataIntegrityRisk">
                <option value="">—</option>
                <option value="1" ${(requirement.riskAssessment?.dataIntegrityRisk) === 1 ? 'selected' : ''}>1</option>
                <option value="2" ${(requirement.riskAssessment?.dataIntegrityRisk) === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${(requirement.riskAssessment?.dataIntegrityRisk) === 3 ? 'selected' : ''}>3</option>
              </select>
            </div>
            <div class="form-group risk-factor-inline">
              <label for="requirement-edit-sec-${requirement.id}">Sec</label>
              <select id="requirement-edit-sec-${requirement.id}" class="requirement-edit-risk-factor" data-requirement-id="${requirement.id}" data-risk-factor="securityRisk">
                <option value="">—</option>
                <option value="1" ${(requirement.riskAssessment?.securityRisk) === 1 ? 'selected' : ''}>1</option>
                <option value="2" ${(requirement.riskAssessment?.securityRisk) === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${(requirement.riskAssessment?.securityRisk) === 3 ? 'selected' : ''}>3</option>
              </select>
            </div>
            <div class="form-group risk-factor-inline">
              <label for="requirement-edit-reg-${requirement.id}">Reg</label>
              <select id="requirement-edit-reg-${requirement.id}" class="requirement-edit-risk-factor" data-requirement-id="${requirement.id}" data-risk-factor="regressionNeed">
                <option value="">—</option>
                <option value="0" ${(requirement.riskAssessment?.regressionNeed) === 0 ? 'selected' : ''}>0</option>
                <option value="1" ${(requirement.riskAssessment?.regressionNeed) === 1 ? 'selected' : ''}>1</option>
                <option value="2" ${(requirement.riskAssessment?.regressionNeed) === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${(requirement.riskAssessment?.regressionNeed) === 3 ? 'selected' : ''}>3</option>
              </select>
            </div>
            <div class="form-group risk-factor-inline">
              <label for="requirement-edit-freq-${requirement.id}">Freq</label>
              <select id="requirement-edit-freq-${requirement.id}" class="requirement-edit-risk-factor" data-requirement-id="${requirement.id}" data-risk-factor="frequencyOfUse">
                <option value="">—</option>
                <option value="0" ${(requirement.riskAssessment?.frequencyOfUse) === 0 ? 'selected' : ''}>0</option>
                <option value="1" ${(requirement.riskAssessment?.frequencyOfUse) === 1 ? 'selected' : ''}>1</option>
                <option value="2" ${(requirement.riskAssessment?.frequencyOfUse) === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${(requirement.riskAssessment?.frequencyOfUse) === 3 ? 'selected' : ''}>3</option>
              </select>
            </div>
            <div class="form-group risk-factor-inline">
              <label for="requirement-edit-det-${requirement.id}">Det</label>
              <select id="requirement-edit-det-${requirement.id}" class="requirement-edit-risk-factor" data-requirement-id="${requirement.id}" data-risk-factor="detectability">
                <option value="">—</option>
                <option value="1" ${(requirement.riskAssessment?.detectability) === 1 ? 'selected' : ''}>1</option>
                <option value="2" ${(requirement.riskAssessment?.detectability) === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${(requirement.riskAssessment?.detectability) === 3 ? 'selected' : ''}>3</option>
              </select>
            </div>
            <div class="form-group risk-factor-inline">
              <label for="requirement-edit-rem-${requirement.id}">Rem</label>
              <select id="requirement-edit-rem-${requirement.id}" class="requirement-edit-risk-factor" data-requirement-id="${requirement.id}" data-risk-factor="remediation">
                <option value="">—</option>
                <option value="1" ${(requirement.riskAssessment?.remediation) === 1 ? 'selected' : ''}>1</option>
                <option value="2" ${(requirement.riskAssessment?.remediation) === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${(requirement.riskAssessment?.remediation) === 3 ? 'selected' : ''}>3</option>
                <option value="4" ${(requirement.riskAssessment?.remediation) === 4 ? 'selected' : ''}>4</option>
              </select>
            </div>
            <div class="form-group risk-value-inline">
              <span class="risk-value-label">Rv:</span>
              <span class="requirement-edit-risk-value-inline" data-requirement-id="${requirement.id}">${requirement.riskValue !== undefined && requirement.riskValue !== null ? escapeHtml(String(requirement.riskValue)) : '—'}</span>
            </div>
          </div>
          <div class="form-actions requirement-edit-actions">
            <button type="button" class="btn btn-primary btn-sm save-edit-requirement" data-requirement-id="${requirement.id}">Save</button>
            <button type="button" class="btn btn-secondary btn-sm cancel-edit-requirement" data-requirement-id="${requirement.id}">Cancel</button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderRequirementExpansionRow(requirement) {
  if (state.activeRequirementLinkId !== requirement.id) {
    return '';
  }

  const acceptanceCriteriaHtml = `
    <div class="requirements-fr-link-criteria requirement-expansion-criteria">
      <span class="requirements-fr-link-criteria-label">Acceptance Criteria</span>
      <p class="requirements-fr-link-criteria-text${requirement.description ? '' : ' requirements-fr-link-criteria-empty'}">
        ${requirement.description ? escapeHtml(requirement.description) : 'No acceptance criteria provided yet.'}
      </p>
    </div>
  `;

  const allTasks = storage.getAllTasks();
  const linkedTasks = allTasks.filter(t => t.requirementId === requirement.id);
  const progressBarHtml = renderUserRequirementProgressBar(requirement, linkedTasks, false);
  const linkedTasksList = linkedTasks.length > 0
    ? `<div class="requirements-linked-tasks-list">
        ${linkedTasks.map(task => {
          const statuses = storage.getStatuses();
          const status = statuses.find(s => s.id === task.status);
          const statusLabel = status?.label || task.status || '—';
          return `
            <div class="linked-task-item">
              <span class="linked-task-title">${escapeHtml(task.title)}</span>
              <span class="linked-task-status">${escapeHtml(statusLabel)}</span>
            </div>
          `;
        }).join('')}
      </div>`
    : '<p class="requirements-fr-link-hint requirements-linked-frs-empty">No linked tasks yet. Add tasks from the Tasks view and link them to this requirement.</p>';

  return `
    <tr class="requirement-expansion-row" data-requirement-id="${requirement.id}">
      <td colspan="11">
        <div class="requirement-expansion-panel">
          <div class="requirement-expansion-header">
            <div class="requirement-expansion-criteria-container">
              ${acceptanceCriteriaHtml}
            </div>
            <button type="button" class="btn btn-secondary btn-xs cancel-fr-link" data-requirement-id="${requirement.id}">
              Close
            </button>
          </div>
          <div class="requirement-expansion-grid">
            <div class="requirement-expansion-section requirement-linked-tasks">
              <p class="requirements-fr-link-label">Linked tasks</p>
              <div class="progress-cell">${progressBarHtml}</div>
              ${linkedTasksList}
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function attachRequirementSortListeners() {
  const headers = document.querySelectorAll('#requirements-list .sortable-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort-column');
      if (state.requirementSortColumn === column) {
        state.requirementSortDirection = state.requirementSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.requirementSortColumn = column;
        state.requirementSortDirection = 'asc';
      }
      renderRequirements();
    });
  });
}

function renderFunctionalRequirements() {
  if (!elements.functionalRequirementsList) return;
  
  const allFunctionalRequirements = storage.getAllFunctionalRequirements();
  
  // Apply filters
  const filteredFunctionalRequirements = filterFunctionalRequirements(allFunctionalRequirements);
  
  // Apply sorting
  const sortedFunctionalRequirements = sortFunctionalRequirements(filteredFunctionalRequirements);
  
  if (!sortedFunctionalRequirements.some(fr => fr.id === state.activeFunctionalRequirementId)) {
    state.activeFunctionalRequirementId = null;
  }

  renderFunctionalRequirementsProgressSummary(sortedFunctionalRequirements);

  if (sortedFunctionalRequirements.length === 0) {
    elements.functionalRequirementsList.innerHTML = `
      <div class="empty-state">
        <p>No functional requirements found</p>
        <p class="empty-state-sub">${allFunctionalRequirements.length === 0 ? 'Create your first functional requirement to get started!' : 'Try adjusting your search or filters.'}</p>
      </div>
    `;
    return;
  }
  
  // Render table
  elements.functionalRequirementsList.innerHTML = renderFunctionalRequirementsTable(sortedFunctionalRequirements);
  
  // Attach event listeners for functional requirements in the view
  sortedFunctionalRequirements.forEach(functionalRequirement => {
    attachFunctionalRequirementViewListeners(functionalRequirement);
  });
  
  // Populate filter dropdowns if not already populated
  populateFunctionalRequirementFilters();
  
  // Attach sort listeners
  attachFunctionalRequirementSortListeners();
}

function attachFunctionalRequirementSortListeners() {
  const headers = document.querySelectorAll('#functional-requirements-list .sortable-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort-column');
      if (state.functionalRequirementSortColumn === column) {
        state.functionalRequirementSortDirection = state.functionalRequirementSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.functionalRequirementSortColumn = column;
        state.functionalRequirementSortDirection = 'asc';
      }
      renderFunctionalRequirements();
    });
  });
}

function sortFunctionalRequirements(functionalRequirements) {
  if (!state.functionalRequirementSortColumn) return functionalRequirements;
  
  const sorted = [...functionalRequirements].sort((a, b) => {
    let aVal, bVal;
    
    switch (state.functionalRequirementSortColumn) {
      case 'title':
        aVal = a.title || '';
        bVal = b.title || '';
        break;
      case 'project':
        aVal = a.project?.title || '';
        bVal = b.project?.title || '';
        break;
      case 'linkedUserReqs':
        aVal = (a.linkedUserRequirements || []).length;
        bVal = (b.linkedUserRequirements || []).length;
        break;
      case 'linkedTasks':
        const allTasks = storage.getAllTasks();
        const aLinkedTasks = allTasks.filter(t => t.requirementId === a.id);
        const bLinkedTasks = allTasks.filter(t => t.requirementId === b.id);
        aVal = aLinkedTasks.length;
        bVal = bLinkedTasks.length;
        break;
      default:
        return 0;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return state.functionalRequirementSortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return state.functionalRequirementSortDirection === 'asc' 
        ? aVal - bVal
        : bVal - aVal;
    }
  });
  
  return sorted;
}

function filterFunctionalRequirements(functionalRequirements) {
  return functionalRequirements.filter(functionalRequirement => {
    // Search filter
    if (state.functionalRequirementSearch) {
      const searchLower = state.functionalRequirementSearch.toLowerCase();
      const matchesSearch = 
        functionalRequirement.title.toLowerCase().includes(searchLower) ||
        (functionalRequirement.description && functionalRequirement.description.toLowerCase().includes(searchLower)) ||
        (functionalRequirement.project && functionalRequirement.project.title.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // Project filter
    if (state.functionalRequirementFilterProject && functionalRequirement.projectId !== state.functionalRequirementFilterProject) {
      return false;
    }
    
    return true;
  });
}

function renderFunctionalRequirementDetailsRow(functionalRequirement) {
  if (state.editingFunctionalRequirements.has(functionalRequirement.id)) {
    return '';
  }

  if (typeof renderFunctionalRequirementDetailsRowImpl !== 'function') {
    return '';
  }

  return renderFunctionalRequirementDetailsRowImpl(functionalRequirement);
}

function getFunctionalRequirementProjectOptions(selectedProjectId) {
  const options = state.projects.map(project =>
    `<option value="${project.id}" ${project.id === selectedProjectId ? 'selected' : ''}>${escapeHtml(project.title)}</option>`
  ).join('');
  return `<option value="">Select a project</option>${options}`;
}

function getFunctionalRequirementUserRequirementOptions(projectId, selectedIds = []) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) {
    return '<option value="" disabled>Select a project first</option>';
  }
  const requirements = project.requirements || [];
  if (requirements.length === 0) {
    return '<option value="" disabled>No user requirements available</option>';
  }
  const selectedSet = new Set(Array.isArray(selectedIds) ? selectedIds : []);
  return requirements.map(requirement =>
    `<option value="${requirement.id}" ${selectedSet.has(requirement.id) ? 'selected' : ''}>${escapeHtml(requirement.title)}</option>`
  ).join('');
}

function renderFunctionalRequirementEditRow(functionalRequirement) {
  const projectOptions = getFunctionalRequirementProjectOptions(functionalRequirement.projectId);
  const userRequirementOptions = getFunctionalRequirementUserRequirementOptions(
    functionalRequirement.projectId,
    functionalRequirement.linkedUserRequirements || []
  );

  return `
    <tr class="task-table-row functional-requirement-edit-row" data-functional-requirement-id="${functionalRequirement.id}">
      <td colspan="7">
        <div class="functional-requirement-edit-form">
          <div class="form-row">
            <div class="form-group">
              <label for="functional-requirement-edit-project-${functionalRequirement.id}">Project *</label>
              <select id="functional-requirement-edit-project-${functionalRequirement.id}" class="functional-requirement-edit-project-select" data-functional-requirement-id="${functionalRequirement.id}">
                ${projectOptions}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="functional-requirement-edit-title-${functionalRequirement.id}">Title *</label>
            <input type="text" id="functional-requirement-edit-title-${functionalRequirement.id}" class="functional-requirement-edit-title" data-functional-requirement-id="${functionalRequirement.id}" value="${escapeHtml(functionalRequirement.title)}" placeholder="Functional requirement title">
          </div>
          <div class="form-group">
            <label for="functional-requirement-edit-description-${functionalRequirement.id}">Description (optional)</label>
            <textarea id="functional-requirement-edit-description-${functionalRequirement.id}" class="functional-requirement-edit-description" data-functional-requirement-id="${functionalRequirement.id}" rows="3" placeholder="Describe how this FR fulfills the linked user requirements">${escapeHtml(functionalRequirement.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label for="functional-requirement-edit-user-reqs-${functionalRequirement.id}">Linked User Requirements</label>
            <select id="functional-requirement-edit-user-reqs-${functionalRequirement.id}" class="functional-requirement-edit-user-requirements" data-functional-requirement-id="${functionalRequirement.id}" multiple>
              ${userRequirementOptions}
            </select>
            <small>Hold Ctrl/Cmd to select multiple</small>
          </div>
          <div class="form-actions functional-requirement-edit-actions">
            <button type="button" class="btn btn-primary btn-sm save-edit-functional-requirement" data-functional-requirement-id="${functionalRequirement.id}">Save</button>
            <button type="button" class="btn btn-secondary btn-sm cancel-edit-functional-requirement" data-functional-requirement-id="${functionalRequirement.id}">Cancel</button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function refreshFunctionalRequirementUserRequirementOptions(functionalRequirementId, projectId, selectedIds = []) {
  const select = document.querySelector(`.functional-requirement-edit-user-requirements[data-functional-requirement-id="${functionalRequirementId}"]`);
  if (!select) return;
  select.innerHTML = projectId
    ? getFunctionalRequirementUserRequirementOptions(projectId, selectedIds)
    : '<option value="" disabled>Select a project first</option>';
}

function renderFunctionalRequirementsTable(functionalRequirements) {
  const rows = functionalRequirements.map(fr => {
    if (state.editingFunctionalRequirements.has(fr.id)) {
      return renderFunctionalRequirementEditRow(fr);
    }

    const project = state.projects.find(p => p.id === fr.projectId);
    const linkedUserReqs = (fr.linkedUserRequirements || []).map(urId => {
      const ur = project ? (project.requirements || []).find(r => r.id === urId) : null;
      return ur;
    }).filter(Boolean);
    
    const allTasks = storage.getAllTasks();
    const linkedTasks = allTasks.filter(t => t.requirementId === fr.id);
    
    const progressBarHtml = renderFunctionalRequirementProgressBar(fr, linkedTasks, false);
    const isExpanded = state.activeFunctionalRequirementId === fr.id;
    const rowClass = `task-table-row functional-requirement-row${isExpanded ? ' expanded' : ''}`;
    
    const rowHtml = `
      <tr class="${rowClass}" data-functional-requirement-id="${fr.id}" data-project-id="${fr.projectId}">
        <td class="task-title-cell">
          <strong>${escapeHtml(fr.title)}</strong>
          ${fr.description ? `<div class="task-description-small">${escapeHtml(fr.description)}</div>` : ''}
        </td>
        <td class="task-project-cell">${escapeHtml(fr.project.title)}</td>
        <td>${linkedUserReqs.length > 0 ? linkedUserReqs.map(ur => `<span class="badge" style="background: var(--gray-100); color: var(--text-primary); border-color: var(--border); margin-right: 0.25rem;">${escapeHtml(ur.title)}</span>`).join('') : '<span class="text-muted">—</span>'}</td>
        <td>${linkedTasks.length}</td>
        <td>
          <div class="progress-cell">
            ${progressBarHtml}
          </div>
        </td>
        <td class="task-actions-cell">
          <button class="btn btn-blue btn-xs edit-functional-requirement-view" data-functional-requirement-id="${fr.id}" data-project-id="${fr.projectId}">Edit</button>
          <button class="btn btn-red btn-xs delete-functional-requirement-view" data-functional-requirement-id="${fr.id}" data-project-id="${fr.projectId}">Delete</button>
        </td>
      </tr>
    `;

    return rowHtml + renderFunctionalRequirementDetailsRow(fr);
  }).join('');
  
  const getSortIndicator = (column) => {
    if (state.functionalRequirementSortColumn !== column) return '';
    return state.functionalRequirementSortDirection === 'asc' ? ' ↑' : ' ↓';
  };
  
  const getSortClass = (column) => {
    return state.functionalRequirementSortColumn === column ? 'sortable-header sorted' : 'sortable-header';
  };
  
  return `
    <table class="tasks-table">
      <thead>
        <tr>
          <th class="${getSortClass('title')}" data-sort-column="title">Functional Requirement${getSortIndicator('title')}</th>
          <th class="${getSortClass('project')}" data-sort-column="project">Initiative${getSortIndicator('project')}</th>
          <th class="${getSortClass('linkedUserReqs')}" data-sort-column="linkedUserReqs">Linked User Reqs${getSortIndicator('linkedUserReqs')}</th>
          <th class="${getSortClass('linkedTasks')}" data-sort-column="linkedTasks">Linked Tasks${getSortIndicator('linkedTasks')}</th>
          <th>Progress</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderFunctionalRequirementDetailsRowImpl(functionalRequirement) {
  if (state.activeFunctionalRequirementId !== functionalRequirement.id) {
    return '';
  }

  const project = storage.getProject(functionalRequirement.projectId);
  const allTasks = storage.getAllTasks();
  const linkedTasks = allTasks.filter(task => task.requirementId === functionalRequirement.id);
  const statuses = storage.getStatuses();
  const taskItemsHtml = linkedTasks.length > 0
    ? `<div class="functional-requirement-task-list">
        ${linkedTasks.map(task => {
          const statusLabel = statuses.find(status => status.id === task.status)?.label || 'No status';
          const dueDate = task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}` : '';
          return `
            <div class="functional-requirement-task-item">
              <div class="functional-requirement-task-info">
                <span class="functional-requirement-task-title">${escapeHtml(task.title)}</span>
                <span class="functional-requirement-task-status">${statusLabel}${dueDate}</span>
              </div>
              <div class="functional-requirement-task-actions">
                <button type="button" class="btn btn-gray btn-xs unlink-task-from-fr" data-functional-requirement-id="${functionalRequirement.id}" data-task-id="${task.id}">
                  Unlink
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>`
    : '<p class="requirements-fr-link-hint">No tasks linked yet.</p>';

  const availableTasks = allTasks.filter(task =>
    task.projectId === functionalRequirement.projectId && !task.requirementId
  );
  const existingTaskOptions = availableTasks.map(task => `<option value="${task.id}">${escapeHtml(task.title)}</option>`).join('');
  const milestoneOptions = (project?.milestones || []).map(milestone => `<option value="${milestone.id}" ${functionalRequirement.milestoneId === milestone.id ? 'selected' : ''}>${escapeHtml(milestone.title)}</option>`).join('');
  const effortOptionsHtml = getEffortOptionsHtml();
  const resourceOptionsHtml = getUserOptionsHtml();

  return `
    <tr class="functional-requirement-expansion-row" data-functional-requirement-id="${functionalRequirement.id}">
      <td colspan="7">
        <div class="functional-requirement-expansion-panel">
          <div class="functional-requirement-expansion-header">
            <div>
              <p class="requirements-fr-link-label">Linked Tasks</p>
              ${taskItemsHtml}
            </div>
            <button type="button" class="btn btn-secondary btn-xs cancel-fr-task" data-functional-requirement-id="${functionalRequirement.id}">
              Close
            </button>
          </div>
          <div class="functional-requirement-expansion-grid">
            <div class="functional-requirement-expansion-section">
              <form class="fr-create-task-form" data-functional-requirement-id="${functionalRequirement.id}">
                <p class="requirements-fr-link-label">Add a new task</p>
                <div class="form-group">
                  <label for="fr-task-title-${functionalRequirement.id}">Title *</label>
                  <input type="text" id="fr-task-title-${functionalRequirement.id}" class="fr-task-title" placeholder="Task title" required>
                </div>
                <div class="form-group">
                  <label for="fr-task-description-${functionalRequirement.id}">Description (optional)</label>
                  <textarea id="fr-task-description-${functionalRequirement.id}" class="fr-task-description" rows="2" placeholder="Describe the work"></textarea>
                </div>
                <div class="form-group">
                  <label for="fr-task-milestone-${functionalRequirement.id}">Milestone *</label>
                  <select id="fr-task-milestone-${functionalRequirement.id}" class="fr-task-milestone" required>
                    <option value="">Select a milestone</option>
                    ${milestoneOptions}
                  </select>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="fr-task-effort-${functionalRequirement.id}">Effort</label>
                    <select id="fr-task-effort-${functionalRequirement.id}" class="fr-task-effort">
                      ${effortOptionsHtml}
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="fr-task-resource-${functionalRequirement.id}">Assigned Resource</label>
                    <select id="fr-task-resource-${functionalRequirement.id}" class="fr-task-resource">
                      ${resourceOptionsHtml}
                    </select>
                  </div>
                </div>
                <button type="submit" class="btn btn-green btn-xs create-task-from-fr" data-functional-requirement-id="${functionalRequirement.id}">
                  Create task
                </button>
              </form>
            </div>
            <div class="functional-requirement-expansion-section">
              <p class="requirements-fr-link-label">Link an existing task</p>
              <div class="form-group">
                <label for="existing-task-select-${functionalRequirement.id}">Task</label>
                <select id="existing-task-select-${functionalRequirement.id}" class="existing-task-select" data-functional-requirement-id="${functionalRequirement.id}">
                  <option value="">Select a task</option>
                  ${existingTaskOptions}
                </select>
              </div>
              <button type="button" class="btn btn-primary btn-xs link-task-to-fr" data-functional-requirement-id="${functionalRequirement.id}" ${availableTasks.length === 0 ? 'disabled' : ''}>
                Link task
              </button>
              ${availableTasks.length === 0 ? '<p class="requirements-fr-link-hint">No unlinked tasks available.</p>' : ''}
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}
function renderTasks() {
  if (!elements.tasksList) return;
  
  const allTasks = storage.getAllTasks();
  
  // Apply filters
  const filteredTasks = filterTasks(allTasks);
  
  // Apply sorting
  const sortedTasks = sortTasks(filteredTasks);
  
  if (sortedTasks.length === 0) {
    elements.tasksList.innerHTML = `
      <div class="empty-state">
        <p>No tasks found</p>
        <p class="empty-state-sub">${allTasks.length === 0 ? 'Create your first task to get started!' : 'Try adjusting your search or filters.'}</p>
      </div>
    `;
    if (currentView === 'capacity') {
      renderCapacity();
    }
    return;
  }
  
  // Render table
  elements.tasksList.innerHTML = renderTasksTable(sortedTasks);
  
  // Re-attach event listeners
  sortedTasks.forEach(task => {
    attachTaskListenersForView(task);
  });
  
  // Populate filter dropdowns if not already populated
  populateTaskFilters();
  
  // Attach sort listeners
  attachTaskSortListeners();
  if (currentView === 'capacity') {
    renderCapacity();
  }
  renderProgress();
}

function formatCapacityPoints(points) {
  if (!Number.isFinite(points)) {
    return '0';
  }
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

function renderStackedEffortBar(stat, effortLevels, maxPoints) {
  if (!effortLevels.length) {
    return '<div class="capacity-bar-track capacity-bar-stacked capacity-bar-empty"><span class="text-muted">No effort levels defined</span></div>';
  }

  const rowWidth = stat.points ? Math.min(100, Math.max(0, (stat.points / maxPoints) * 100)) : 0;
  const segmentsHtml = effortLevels.map(level => {
    const levelPoints = stat.effortBreakdown[level.id] || 0;
    if (levelPoints <= 0 || !stat.points) return '';
    const color = level.color || 'var(--primary)';
    const tooltip = `${escapeHtml(level.label)} · ${formatCapacityPoints(levelPoints)} pts`;
    const widthPercent = (levelPoints / stat.points) * 100;
    return `<span class="capacity-bar-segment" style="width:${widthPercent}%;background:${color}" title="${tooltip}"></span>`;
  }).join('');

  if (!segmentsHtml || rowWidth <= 0) {
    return '<div class="capacity-bar-track capacity-bar-stacked"></div>';
  }

  return `
    <div class="capacity-bar-track capacity-bar-stacked">
      <div class="capacity-bar-stacked-inner" style="width:${rowWidth}%">
        ${segmentsHtml}
      </div>
    </div>`;
}

function renderTaskCountBar(stat, maxTasks) {
  const widthPercent = Math.min(100, Math.max(0, (stat.tasks / maxTasks) * 100));
  return `
    <div class="capacity-task-bar-track">
      <span class="capacity-task-bar-fill" style="width:${widthPercent}%"></span>
    </div>
    <div class="capacity-task-bar-label">
      ${stat.tasks} ${stat.tasks === 1 ? 'task' : 'tasks'}
    </div>
  `;
}

function renderCompletionBar(stat, color) {
  const completion = Math.min(100, Math.max(0, stat.completedPercent));
  return `
    <div class="capacity-progress-bar-track" role="img" aria-label="${Math.round(completion)}% complete">
      <span class="capacity-progress-bar-fill" style="width:${completion}%; background:${color};"></span>
    </div>
    <div class="capacity-progress-bar-label">
      ${Math.round(completion)}% complete
    </div>
  `;
}

function populateCapacityFilters() {
  const projects = storage.getAllProjects().slice().sort((a, b) => {
    return (a.title || '').localeCompare(b.title || '');
  });

  if (elements.capacityFilterProject) {
    const options = projects.map(project => 
      `<option value="${project.id}">${escapeHtml(project.title || 'Untitled Project')}</option>`
    ).join('');
    elements.capacityFilterProject.innerHTML = '<option value="">All Initiatives</option>' + options;
    restoreTaskFilterSelect(elements.capacityFilterProject, 'capacityFilterProject');
  }

  if (elements.capacityFilterMilestone) {
    const milestones = [];
    projects.forEach(project => {
      (project.milestones || []).forEach(milestone => {
        milestones.push({
          id: milestone.id,
          label: `${project.title || 'Untitled Project'} · ${milestone.title || 'Untitled Milestone'}`,
        });
      });
    });
    const milestoneOptions = milestones.map(milestone => 
      `<option value="${milestone.id}">${escapeHtml(milestone.label)}</option>`
    ).join('');
    elements.capacityFilterMilestone.innerHTML = '<option value="">All Milestones</option>' + milestoneOptions;
    restoreTaskFilterSelect(elements.capacityFilterMilestone, 'capacityFilterMilestone');
  }

  if (elements.capacityFilterRequirement) {
    const requirements = storage.getAllRequirements().slice().sort((a, b) => {
      const projectA = a.project?.title || '';
      const projectB = b.project?.title || '';
      const titleA = a.title || '';
      const titleB = b.title || '';
      return projectA === projectB ? titleA.localeCompare(titleB) : projectA.localeCompare(projectB);
    });
    const requirementOptions = requirements.map(requirement => {
      const projectTitle = requirement.project?.title ? `${requirement.project.title} · ` : '';
      return `<option value="${requirement.id}">${escapeHtml(`${projectTitle}${requirement.title || 'Untitled UR'}`)}</option>`;
    }).join('');
    elements.capacityFilterRequirement.innerHTML = '<option value="">All URS</option>' + requirementOptions;
    restoreTaskFilterSelect(elements.capacityFilterRequirement, 'capacityFilterRequirement');
  }

  if (elements.capacityFilterFunctionalRequirement) {
    const functionalRequirements = storage.getAllFunctionalRequirements().slice().sort((a, b) => {
      const projectA = a.project?.title || '';
      const projectB = b.project?.title || '';
      const titleA = a.title || '';
      const titleB = b.title || '';
      return projectA === projectB ? titleA.localeCompare(titleB) : projectA.localeCompare(projectB);
    });
    const functionalOptions = functionalRequirements.map(fr => {
      const projectTitle = fr.project?.title ? `${fr.project.title} · ` : '';
      return `<option value="${fr.id}">${escapeHtml(`${projectTitle}${fr.title || 'Untitled FR'}`)}</option>`;
    }).join('');
    elements.capacityFilterFunctionalRequirement.innerHTML = '<option value="">All FRS</option>' + functionalOptions;
    restoreTaskFilterSelect(elements.capacityFilterFunctionalRequirement, 'capacityFilterFunctionalRequirement');
  }

  if (elements.capacityFilterStatus) {
    const statuses = storage.getStatuses();
    const statusOptions = statuses.map(status => 
      `<option value="${status.id}">${escapeHtml(status.label)}</option>`
    ).join('');
    elements.capacityFilterStatus.innerHTML = '<option value="">All Statuses</option>' + statusOptions;
    restoreTaskFilterSelect(elements.capacityFilterStatus, 'capacityFilterStatus');
  }
}

function filterCapacityTasks(tasks) {
  const functionalRequirements = storage.getAllFunctionalRequirements();
  const frMap = new Map(functionalRequirements.map(fr => [fr.id, fr]));
  return tasks.filter(task => {
    if (state.capacityFilterProject && task.projectId !== state.capacityFilterProject) {
      return false;
    }
    if (state.capacityFilterMilestone && task.milestoneId !== state.capacityFilterMilestone) {
      return false;
    }
    if (state.capacityFilterStatus && task.status !== state.capacityFilterStatus) {
      return false;
    }
    if (state.capacityFilterFunctionalRequirement && task.requirementId !== state.capacityFilterFunctionalRequirement) {
      return false;
    }
    if (state.capacityFilterRequirement) {
      const fr = frMap.get(task.requirementId);
      const linkedRequirements = Array.isArray(fr?.linkedUserRequirements) ? fr.linkedUserRequirements : [];
      if (!linkedRequirements.includes(state.capacityFilterRequirement)) {
        return false;
      }
    }
    return true;
  });
}

function renderCapacity() {
  if (!elements.capacityList) return;

  populateCapacityFilters();

  const allTasks = storage.getAllTasks();
  const filteredTasks = filterCapacityTasks(allTasks);
  const effortLevels = storage.getEffortLevels();
  const effortPoints = new Map(effortLevels.map(effort => {
    const normalized = Number(effort.points);
    return [effort.id, Number.isFinite(normalized) ? normalized : 0];
  }));

  const statsMap = new Map();
  const users = storage.getUsers();
  const knownUsers = new Set(users.map(user => user.name));
  users.forEach(user => {
    statsMap.set(user.name, {
      label: user.name,
      tasks: 0,
      points: 0,
      effortBreakdown: {},
      completedTasks: 0,
      isUser: true,
      isUnassigned: false,
      isExternal: false,
    });
  });

  filteredTasks.forEach(task => {
    const resource = (task.assignedResource || '').trim();
    const label = resource || 'Unassigned';
    if (!statsMap.has(label)) {
      statsMap.set(label, {
        label,
        tasks: 0,
        points: 0,
        effortBreakdown: {},
        completedTasks: 0,
        isUser: !!resource && knownUsers.has(resource),
        isUnassigned: !resource,
        isExternal: !!resource && !knownUsers.has(resource),
      });
    }

    const stat = statsMap.get(label);
    const effortValue = effortPoints.get(task.effortLevel) || 0;
    stat.tasks += 1;
    stat.points += effortValue;
    if (task.effortLevel) {
      stat.effortBreakdown[task.effortLevel] = (stat.effortBreakdown[task.effortLevel] || 0) + effortValue;
    }
    if (task.status === 'completed') {
      stat.completedTasks += 1;
    }
  });

  const statsArray = Array.from(statsMap.values());
  statsArray.forEach(stat => {
    stat.completedPercent = stat.tasks ? (stat.completedTasks / stat.tasks) * 100 : 0;
  });
  const sortedStats = [...statsArray].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    if (b.tasks !== a.tasks) {
      return b.tasks - a.tasks;
    }
    return a.label.localeCompare(b.label);
  });

  if (sortedStats.length === 0) {
    elements.capacityList.innerHTML = `
      <div class="empty-state">
        <p>No capacity data yet</p>
        <p class="empty-state-sub">Add users and assign tasks to start tracking team capacity.</p>
      </div>
    `;
    return;
  }

  const maxPoints = Math.max(1, ...sortedStats.map(stat => stat.points));
  const maxTasks = Math.max(1, ...sortedStats.map(stat => stat.tasks));
  const statusesMeta = storage.getStatuses();
  const completedStatus = statusesMeta.find(s => s.id === 'completed') 
    || statusesMeta.find(s => (s.label || '').toLowerCase().includes('complete'));
  const completionColor = completedStatus?.color || 'var(--success)';
  const filteredBanner = filteredTasks.length === 0
    ? '<p class="capacity-empty-msg">No tasks match the selected filters.</p>'
    : '';

  const rows = sortedStats.map(stat => {
    const tags = [];
    if (stat.isUnassigned) {
      tags.push('Unassigned');
    } else if (stat.isExternal) {
      tags.push('External');
    }
    const tagsHtml = tags.map(tag => `<span class="capacity-resource-tag">${tag}</span>`).join('');
    const effortBarHtml = renderStackedEffortBar(stat, effortLevels, maxPoints);
    const taskBarHtml = renderTaskCountBar(stat, maxTasks);
    const completionBar = renderCompletionBar(stat, completionColor);
    return `
      <tr>
        <td>
          <div class="capacity-resource">
            <span>${escapeHtml(stat.label)}</span>
            ${tagsHtml}
          </div>
        </td>
        <td>${taskBarHtml}</td>
        <td>
          ${effortBarHtml}
          <div class="capacity-bar-meta">
            <span>${formatCapacityPoints(stat.points)} pts assigned</span>
          </div>
        </td>
        <td>${completionBar}</td>
      </tr>
    `;
  }).join('');

  elements.capacityList.innerHTML = `
    ${filteredBanner}
    <table class="capacity-table">
      <thead>
        <tr>
          <th>Resource</th>
          <th>Tasks</th>
          <th>Effort</th>
          <th>% Complete</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function initializeProgressDatePickers() {
  if (typeof flatpickr !== 'function') return;

  const startInput = elements.progressFilterStartDate;
  if (startInput && !progressDatePickers.start) {
    progressDatePickers.start = flatpickr(startInput, {
      dateFormat: 'Y-m-d',
      clickOpens: true,
      allowInput: false,
    });
    startInput.addEventListener('focus', () => {
      progressDatePickers.start?.open();
    });
  }

  const endInput = elements.progressFilterEndDate;
  if (endInput && !progressDatePickers.end) {
    progressDatePickers.end = flatpickr(endInput, {
      dateFormat: 'Y-m-d',
      clickOpens: true,
      allowInput: false,
    });
    endInput.addEventListener('focus', () => {
      progressDatePickers.end?.open();
    });
  }
}

function renderProgress() {
  if (!elements.progressView) return;
  initializeProgressDatePickers();
  populateProgressFilters();

  const allTasks = storage.getAllTasks();
  const filteredTasks = allTasks.filter(task => {
    if (state.progressFilterProject && task.projectId !== state.progressFilterProject) {
      return false;
    }
    if (state.progressFilterMilestone && task.milestoneId !== state.progressFilterMilestone) {
      return false;
    }
    return true;
  });

  const defaultRange = getProgressDefaultRange();
  const startDate = parseDateValue(state.progressFilterStartDate) || defaultRange.start;
  const endDate = parseDateValue(state.progressFilterEndDate) || defaultRange.end;
  updateProgressDateInputs(startDate, endDate);
  const progressData = buildProgressData(filteredTasks, { startDate, endDate });

  if (elements.progressTasksChart) {
    renderLineChart(elements.progressTasksChart, progressData.weekLabels, [{
      label: 'Tasks Completed',
      color: 'var(--primary)',
      values: progressData.tasksCompleted,
    }], {
      ariaLabel: 'Tasks completed by week',
      panelClass: 'progress-burndown-panel',
    });
  }

  if (elements.progressEffortChart) {
    renderStackedEffortChart(elements.progressEffortChart, progressData.weekSegments, progressData.maxStackPoints);
  }

  updateEffortLegend(progressData.legendItems);

  if (elements.progressBurndownChart) {
    renderLineChart(elements.progressBurndownChart, progressData.weekLabels, [
      { label: 'Effort Completed', color: 'var(--success)', values: progressData.cumulativePoints },
      { label: 'Effort Left', color: 'var(--warning)', values: progressData.leftPoints },
    ], {
      ariaLabel: 'Effort completed versus effort remaining',
      panelClass: 'progress-burndown-panel',
    });
  }

  if (elements.progressTotalEffort) {
    elements.progressTotalEffort.textContent = `${formatPoints(progressData.totalEffort)} pts`;
  }

  if (elements.progressEffortLeft) {
    const remaining = progressData.leftPoints[progressData.leftPoints.length - 1] ?? progressData.totalEffort;
    elements.progressEffortLeft.textContent = `${formatPoints(remaining)} pts`;
  }
}

function setProgressDateInputValue(input, date, pickerKey) {
  if (!input) return;
  const formattedDate = formatDateInputValue(date);
  const picker = pickerKey ? progressDatePickers[pickerKey] : null;
  if (picker) {
    if (formattedDate) {
      picker.setDate(formattedDate, false);
    } else {
      picker.clear(false);
      input.value = '';
    }
    return;
  }
  input.value = formattedDate;
}

function updateProgressDateInputs(startDate, endDate) {
  setProgressDateInputValue(elements.progressFilterStartDate, startDate, 'start');
  setProgressDateInputValue(elements.progressFilterEndDate, endDate, 'end');
}

function getProgressDefaultRange() {
  const nowWeek = getWeekStart(new Date());
  const start = new Date(nowWeek);
  start.setDate(start.getDate() - 7 * 4);
  const end = new Date(nowWeek);
  end.setDate(end.getDate() + 7 * 4);
  return { start, end };
}

function formatDateInputValue(date) {
  if (!date) return '';
  const normalized = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(normalized.getTime())) return '';
  return normalized.toISOString().split('T')[0];
}

function populateProgressFilters() {
  const projectSelect = elements.progressFilterProject;
  if (projectSelect) {
    const projects = storage.getAllProjects().slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const options = projects.map(project => `<option value="${project.id}">${escapeHtml(project.title || 'Untitled Project')}</option>`).join('');
    projectSelect.innerHTML = '<option value="">All Initiatives</option>' + options;
    restoreTaskFilterSelect(projectSelect, 'progressFilterProject');
  }
  updateProgressMilestoneFilterOptions();
}

function updateProgressMilestoneFilterOptions() {
  const milestoneSelect = elements.progressFilterMilestone;
  if (!milestoneSelect) return;
  const projects = storage.getAllProjects().slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  const filteredProjectId = state.progressFilterProject;
  const options = [];
  projects.forEach(project => {
    if (filteredProjectId && project.id !== filteredProjectId) {
      return;
    }
    const prefix = filteredProjectId ? '' : `${project.title || 'Untitled Project'} · `;
    (project.milestones || []).forEach(milestone => {
      options.push({
        id: milestone.id,
        label: `${prefix}${milestone.title || 'Untitled Milestone'}`,
      });
    });
  });
  const html = options.map(option => `<option value="${option.id}">${escapeHtml(option.label)}</option>`).join('');
  milestoneSelect.innerHTML = '<option value="">All Milestones</option>' + html;
  restoreTaskFilterSelect(milestoneSelect, 'progressFilterMilestone');
}

function buildProgressData(tasks, { startDate, endDate } = {}) {
  const effortLevels = storage.getEffortLevels();
  const effortMap = new Map(effortLevels.map(level => [level.id, Number.isFinite(Number(level.points)) ? Number(level.points) : 0]));
  const weekDates = getProgressWeekDates(tasks, startDate, endDate);
  const weekLabels = weekDates.map(formatWeekLabel);
  const weekKeys = weekDates.map(getWeekKey);
  const weekStats = new Map(weekKeys.map(key => [key, { tasks: 0, points: 0, segments: new Map() }]));
  const milestoneLabels = buildMilestoneLabelMap();
  let totalEffort = 0;

  tasks.forEach(task => {
    const points = effortMap.get(task.effortLevel) || 0;
    totalEffort += points;
    if (task.status !== 'completed') {
      return;
    }
    const completedDate = parseDateValue(task.completedDate) || parseDateValue(task.updatedAt);
    if (!completedDate) return;
    const weekKey = getWeekKey(getWeekStart(completedDate));
    const stats = weekStats.get(weekKey);
    if (!stats) return;
    stats.tasks += 1;
    stats.points += points;
    const milestoneLabel = milestoneLabels.get(task.milestoneId) || 'Unassigned Milestone';
    stats.segments.set(milestoneLabel, (stats.segments.get(milestoneLabel) || 0) + points);
  });

  const weekSegments = weekKeys.map((key, index) => {
    const stats = weekStats.get(key) || { tasks: 0, points: 0, segments: new Map() };
    const segments = Array.from(stats.segments.entries()).map(([label, value]) => ({
      label,
      value,
      color: getColorForLabel(label),
    })).sort((a, b) => b.value - a.value);
    return {
      key,
      label: weekLabels[index],
      tasks: stats.tasks,
      total: stats.points,
      segments,
    };
  });

  const legendMap = new Map();
  weekSegments.forEach(week => {
    week.segments.forEach(segment => {
      if (segment.value <= 0) return;
      if (!legendMap.has(segment.label)) {
        legendMap.set(segment.label, {
          label: segment.label,
          color: segment.color,
          value: 0,
        });
      }
      const legendEntry = legendMap.get(segment.label);
      legendEntry.value += segment.value;
    });
  });

  const cumulativePoints = [];
  const leftPoints = [];
  let runningPoints = 0;
  weekSegments.forEach(week => {
    runningPoints += week.total;
    cumulativePoints.push(roundToPrecision(runningPoints, 2));
    const remaining = Math.max(totalEffort - runningPoints, 0);
    leftPoints.push(roundToPrecision(remaining, 2));
  });

  const legendItems = Array.from(legendMap.values()).sort((a, b) => b.value - a.value).slice(0, 5);
  const tasksCompleted = weekSegments.map(week => week.tasks);
  const maxStackPoints = Math.max(0, ...weekSegments.map(week => week.total));

  return {
    weekLabels,
    weekSegments,
    tasksCompleted,
    cumulativePoints,
    leftPoints,
    totalEffort: roundToPrecision(totalEffort, 2),
    maxStackPoints,
    legendItems,
  };
}

function getProgressWeekDates(tasks, startOverride, endOverride) {
  const completionDates = tasks
    .map(task => parseDateValue(task.completedDate) || parseDateValue(task.updatedAt))
    .filter(Boolean)
    .map(date => getWeekStart(date));
  const nowWeek = getWeekStart(new Date());
  const earliestFromData = completionDates.length > 0
    ? completionDates.reduce((current, date) => (date < current ? date : current))
    : null;
  const latestFromData = completionDates.length > 0
    ? completionDates.reduce((current, date) => (date > current ? date : current))
    : null;
  const defaultStart = new Date(nowWeek);
  defaultStart.setDate(defaultStart.getDate() - 7 * 4);
  const defaultEnd = new Date(nowWeek);
  defaultEnd.setDate(defaultEnd.getDate() + 7 * 4);
  const resolvedStart = startOverride ? getWeekStart(startOverride) : (earliestFromData && earliestFromData < defaultStart ? earliestFromData : defaultStart);
  const resolvedEnd = endOverride ? getWeekStart(endOverride) : (latestFromData && latestFromData > defaultEnd ? latestFromData : defaultEnd);
  let startWeekCandidate = resolvedStart;
  let endWeekCandidate = resolvedEnd;
  if (startWeekCandidate > endWeekCandidate) {
    endWeekCandidate = new Date(startWeekCandidate);
  }

  const weeks = [];
  const pointer = new Date(startWeekCandidate);
  while (pointer <= endWeekCandidate) {
    weeks.push(new Date(pointer));
    pointer.setDate(pointer.getDate() + 7);
  }

  if (weeks.length === 0) {
    weeks.push(new Date(startWeekCandidate));
  }

  return weeks;
}

function buildMilestoneLabelMap() {
  const map = new Map();
  storage.getAllProjects().forEach(project => {
    const prefix = project.title ? `${project.title} · ` : '';
    (project.milestones || []).forEach(milestone => {
      const label = milestone.title || 'Untitled Milestone';
      map.set(milestone.id, `${prefix}${label}`);
    });
  });
  return map;
}

function parseDateValue(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date?.getTime()) ? date : null;
}

function getWeekStart(value) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekKey(date) {
  const copy = new Date(date);
  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, '0');
  const day = String(copy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatWeekLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getColorForLabel(label) {
  const normalized = label || 'milestone';
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 360;
  }
  const hue = (hash + normalized.length * 17) % 360;
  return `hsl(${hue}, 72%, 60%)`;
}

function formatPoints(value) {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function roundToPrecision(value, precision = 2) {
  if (!Number.isFinite(value)) return 0;
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function renderStackedEffortChart(container, weeks, maxStack) {
  if (!container) return;
  if (!weeks.length) {
    container.innerHTML = '<p class="text-muted text-sm">No effort data yet.</p>';
    return;
  }
  const columnsHtml = weeks.map(week => {
    const totalLabel = formatPoints(week.total);
    const columnHeight = Math.max(140, (maxStack > 0 ? (week.total / maxStack) * 200 : 0));
    const segments = week.segments.length > 0
      ? week.segments.map(segment => {
        const heightPercent = week.total > 0 ? (segment.value / week.total) * 100 : 0;
        const color = segment.color;
        const tooltip = `${escapeHtml(segment.label)} · ${formatPoints(segment.value)} pts`;
        return `<span class="progress-stacked-segment" style="height:${heightPercent}%;background:${color}" title="${tooltip}"></span>`;
      }).join('')
      : '';
    const emptyState = week.total === 0 ? '<span class="progress-stacked-empty">No effort</span>' : '';
    return `
      <div class="progress-stacked-column" title="${escapeHtml(week.label)} · ${totalLabel} pts completed">
        <div class="progress-stacked-column-inner" style="height:${columnHeight}px">
          ${segments || emptyState}
        </div>
        <div class="progress-stacked-column-labels">
          <span class="progress-stacked-label">${week.label}</span>
          <span class="progress-stacked-value">${week.total > 0 ? `${totalLabel} pts` : '0 pts'}</span>
        </div>
      </div>
    `;
  }).join('');
  container.innerHTML = renderChartPanel(`<div class="progress-stacked-columns">${columnsHtml}</div>`, 'progress-stacked-panel');
}

function updateEffortLegend(legendItems) {
  if (!elements.progressEffortLegend) return;
  if (!legendItems.length) {
    elements.progressEffortLegend.innerHTML = '<p class="text-muted text-sm">No effort completed yet.</p>';
    return;
  }
  elements.progressEffortLegend.innerHTML = legendItems.map(item => `
    <div class="progress-legend-item">
      <span class="progress-legend-chip" style="background: ${item.color};"></span>
      ${escapeHtml(item.label)}
    </div>
  `).join('');
}

function renderLineChart(container, labels, series, options = {}) {
  if (!container || !labels.length || !series.length) {
    if (container) {
      container.innerHTML = '<p class="text-muted text-sm">No data to display.</p>';
    }
    return;
  }
  const width = Math.max(container.clientWidth, 520);
  const height = 220;
  const padding = { top: 24, right: 28, bottom: 40, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const allValues = series.flatMap(serie => serie.values);
  const maxValue = Math.max(1, ...allValues);
  const tickCount = 4;
  const stepCount = Math.max(labels.length - 1, 1);
  const gridLines = [];
  for (let i = 0; i <= tickCount; i += 1) {
    const value = (maxValue / tickCount) * i;
    const y = padding.top + innerHeight - (value / maxValue) * innerHeight;
    gridLines.push({ value, y });
  }
  const paths = [];
  const points = [];
  series.forEach(serie => {
    const pathSegments = [];
    serie.values.forEach((value, index) => {
      const ratio = stepCount === 0 ? 0.5 : index / stepCount;
      const x = padding.left + innerWidth * ratio;
      const y = padding.top + innerHeight - (value / maxValue) * innerHeight;
      pathSegments.push(`${index === 0 ? 'M' : 'L'} ${x} ${y}`);
      points.push(`<circle cx="${x}" cy="${y}" r="3.5" fill="${serie.color}" stroke="var(--card-bg)" stroke-width="2"></circle>`);
    });
    paths.push(`<path d="${pathSegments.join(' ')}" fill="none" stroke="${serie.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>`);
  });
  const gridSvg = gridLines.map(line => `<line x1="${padding.left}" x2="${width - padding.right}" y1="${line.y}" y2="${line.y}" stroke="var(--border)" stroke-width="0.75"></line>`).join('');
  const axisLabels = gridLines.map(line => `<text x="${padding.left - 6}" y="${line.y + 4}" text-anchor="end" font-size="10" fill="var(--text-muted)">${formatAxisValue(line.value)}</text>`).join('');
  const labelNodes = labels.map((label, index) => {
    const ratio = stepCount === 0 ? 0.5 : index / stepCount;
    const x = padding.left + innerWidth * ratio;
    return `<text x="${x}" y="${height - 12}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${escapeHtml(label)}</text>`;
  }).join('');
  const svg = `
    <svg viewBox="0 0 ${width} ${height}">
      <g>${gridSvg}</g>
      <g>${paths.join('')}</g>
      <g>${points.join('')}</g>
      <g>${axisLabels}</g>
      <line x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${width - padding.right}" y2="${padding.top + innerHeight}" stroke="var(--border)" stroke-width="1"></line>
      <g>${labelNodes}</g>
    </svg>
  `;
  const legendHtml = options.hideLegend ? '' : `<div class="progress-chart-legend">${series.map(serie => `<span class="progress-chart-legend-item"><span class="progress-chart-legend-swatch" style="background:${serie.color};"></span>${escapeHtml(serie.label)}</span>`).join('')}</div>`;
  container.innerHTML = `${renderChartPanel(svg, options.panelClass)}${legendHtml}`;
  if (options.ariaLabel) {
    container.setAttribute('aria-label', options.ariaLabel);
  }
  container.setAttribute('role', 'img');
}

function renderChartPanel(content, panelClass = '') {
  const classes = ['progress-chart-panel'];
  if (panelClass) {
    classes.push(panelClass);
  }
  return `<div class="${classes.join(' ')}">${content}</div>`;
}

function formatAxisValue(value) {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toFixed(1);
}

function attachTaskSortListeners() {
  const headers = document.querySelectorAll('#tasks-list .sortable-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort-column');
      if (state.taskSortColumn === column) {
        state.taskSortDirection = state.taskSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.taskSortColumn = column;
        state.taskSortDirection = 'asc';
      }
      renderTasks();
    });
  });
}

function filterTasks(tasks) {
  return tasks.filter(task => {
    // Search filter
    if (state.taskSearch) {
      const searchLower = state.taskSearch.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        task.project.title.toLowerCase().includes(searchLower) ||
        (task.assignedResource && task.assignedResource.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (state.taskFilterStatus && task.status !== state.taskFilterStatus) {
      return false;
    }
    
    // Project filter
    if (state.taskFilterProject && task.projectId !== state.taskFilterProject) {
      return false;
    }
    
    // Resource filter
    if (state.taskFilterResource && task.assignedResource !== state.taskFilterResource) {
      return false;
    }
    
    return true;
  });
}

function sortTasks(tasks) {
  if (!state.taskSortColumn) return tasks;
  
  const sorted = [...tasks].sort((a, b) => {
    let aVal, bVal;
    
    switch (state.taskSortColumn) {
      case 'status':
        const statuses = storage.getStatuses();
        const aStatus = statuses.find(s => s.id === a.status);
        const bStatus = statuses.find(s => s.id === b.status);
        aVal = aStatus?.label || '';
        bVal = bStatus?.label || '';
        break;
      case 'priority':
        const priorities = storage.getPriorities();
        const aPriority = priorities.find(p => p.id === a.priority);
        const bPriority = priorities.find(p => p.id === b.priority);
        aVal = aPriority?.label || '';
        bVal = bPriority?.label || '';
        break;
      case 'title':
        aVal = a.title || '';
        bVal = b.title || '';
        break;
      case 'project':
        aVal = a.project?.title || '';
        bVal = b.project?.title || '';
        break;
      case 'effort':
        const effortLevels = storage.getEffortLevels();
        const aEffort = effortLevels.find(e => e.id === a.effortLevel);
        const bEffort = effortLevels.find(e => e.id === b.effortLevel);
        aVal = aEffort?.label || '';
        bVal = bEffort?.label || '';
        break;
      case 'assigned':
        aVal = a.assignedResource || '';
        bVal = b.assignedResource || '';
        break;
      case 'startDate':
        aVal = a.startDate ? new Date(a.startDate).getTime() : 0;
        bVal = b.startDate ? new Date(b.startDate).getTime() : 0;
        break;
      case 'completedDate':
        aVal = a.completedDate ? new Date(a.completedDate).getTime() : 0;
        bVal = b.completedDate ? new Date(b.completedDate).getTime() : 0;
        break;
      default:
        return 0;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return state.taskSortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return state.taskSortDirection === 'asc' 
        ? aVal - bVal
        : bVal - aVal;
    }
  });
  
  return sorted;
}

function renderTasksTable(tasks) {
  const statuses = storage.getStatuses();
  const effortLevels = storage.getEffortLevels();
  
  const rows = tasks.map(task => {
    const isEditing = state.editingTasks.has(task.id);
    const isCompleted = task.status === 'completed';
    
    if (isEditing) {
      return renderTaskTableRowEdit(task, statuses, effortLevels);
    }
    
    const status = statuses.find(s => s.id === task.status);
    const statusColorStyle = status?.color ? getStatusSelectStyle(status.color) : '';
    
    const effort = effortLevels.find(e => e.id === task.effortLevel);
    const effortBadgeStyle = effort?.color ? getBadgeStyle(effort.color) : '';
    
    const statusOptions = statuses.map(s => 
      `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
    ).join('');
    
    return `
      <tr class="task-table-row ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">
        <td>
          <select class="task-status-select-view" style="${statusColorStyle}" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">
            ${statusOptions}
          </select>
        </td>
        <td class="task-title-cell">
          <strong>${escapeHtml(task.title)}</strong>
          ${task.description ? `<div class="task-description-small">${escapeHtml(task.description)}</div>` : ''}
        </td>
        <td class="task-project-cell">${escapeHtml(task.project.title)}</td>
        <td>${effort ? `<span class="badge" style="${effortBadgeStyle}">${escapeHtml(effort.label)}</span>` : '<span class="text-muted">—</span>'}</td>
        <td>${task.assignedResource ? escapeHtml(task.assignedResource) : '<span class="text-muted">—</span>'}</td>
        <td class="task-dates-cell">
          ${task.startDate ? `<div class="task-date-small">Started: ${new Date(task.startDate).toLocaleDateString()}</div>` : ''}
          ${task.completedDate ? `<div class="task-date-small">Completed: ${new Date(task.completedDate).toLocaleDateString()}</div>` : ''}
          ${!task.startDate && !task.completedDate ? '<span class="text-muted">—</span>' : ''}
        </td>
        <td class="task-actions-cell">
          <button class="btn btn-blue btn-xs edit-task-view" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">Edit</button>
          <button class="btn btn-red btn-xs delete-task-view" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
  
  const getSortIndicator = (column) => {
    if (state.taskSortColumn !== column) return '';
    return state.taskSortDirection === 'asc' ? ' ↑' : ' ↓';
  };
  
  const getSortClass = (column) => {
    return state.taskSortColumn === column ? 'sortable-header sorted' : 'sortable-header';
  };
  
  return `
    <table class="tasks-table">
      <thead>
        <tr>
          <th class="${getSortClass('status')}" data-sort-column="status">Status${getSortIndicator('status')}</th>
          <th class="${getSortClass('title')}" data-sort-column="title">Task${getSortIndicator('title')}</th>
          <th class="${getSortClass('project')}" data-sort-column="project">Initiative${getSortIndicator('project')}</th>
          <th class="${getSortClass('effort')}" data-sort-column="effort">Effort${getSortIndicator('effort')}</th>
          <th class="${getSortClass('assigned')}" data-sort-column="assigned">Assigned${getSortIndicator('assigned')}</th>
          <th class="${getSortClass('startDate')}" data-sort-column="startDate">Dates${getSortIndicator('startDate')}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderTaskTableRowEdit(task, statuses, effortLevels) {
  const usersList = storage.getUsers();
  
  const statusOptions = statuses.map(s => 
    `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  
  const effortOptions = effortLevels.map(e => 
    `<option value="${e.id}" ${task.effortLevel === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
  ).join('');
  
  const userOptions = usersList.map(u => 
    `<option value="${u.name}" ${task.assignedResource === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
  ).join('');
  
  return `
    <tr class="task-table-row task-table-row-edit" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">
      <td colspan="9">
        <div class="task-edit-form-inline">
          <div class="task-edit-row">
            <input type="text" class="edit-title" value="${escapeHtml(task.title)}" data-task-id="${task.id}" placeholder="Task title">
            <textarea class="edit-description-small" data-task-id="${task.id}" placeholder="Description (optional)">${escapeHtml(task.description || '')}</textarea>
          </div>
          <div class="task-edit-row">
            <select class="edit-status" data-task-id="${task.id}">
              ${statusOptions}
            </select>
            <select class="edit-effort" data-task-id="${task.id}">
              <option value="">None</option>
              ${effortOptions}
            </select>
            <select class="edit-resource" data-task-id="${task.id}">
              <option value="">None</option>
              ${userOptions}
            </select>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary btn-sm save-task-view" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-task-view" data-task-id="${task.id}">Cancel</button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function restoreTaskFilterSelect(filterElement, stateKey) {
  if (!filterElement) return;
  const desiredValue = state[stateKey];
  if (!desiredValue) {
    filterElement.value = '';
    return;
  }

  const optionExists = Array.from(filterElement.options).some(option => option.value === desiredValue);
  if (optionExists) {
    filterElement.value = desiredValue;
  } else {
    filterElement.value = '';
    state[stateKey] = '';
  }
}

function populateTaskFilters() {
  const statuses = storage.getStatuses();
  const projects = storage.getAllProjects();
  const users = storage.getUsers();
  
  // Populate status filter
  const statusFilter = document.getElementById('task-filter-status');
  if (statusFilter) {
    // Clear existing options except the first one
    while (statusFilter.options.length > 1) {
      statusFilter.remove(1);
    }
    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status.id;
      option.textContent = status.label;
      statusFilter.appendChild(option);
    });
    restoreTaskFilterSelect(statusFilter, 'taskFilterStatus');
  }
  
  // Populate project filter
  const projectFilter = document.getElementById('task-filter-project');
  if (projectFilter) {
    // Clear existing options except the first one
    while (projectFilter.options.length > 1) {
      projectFilter.remove(1);
    }
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.title;
      projectFilter.appendChild(option);
    });
    restoreTaskFilterSelect(projectFilter, 'taskFilterProject');
  }
  
  // Populate resource filter
  const resourceFilter = document.getElementById('task-filter-resource');
  if (resourceFilter) {
    // Clear existing options except the first one
    while (resourceFilter.options.length > 1) {
      resourceFilter.remove(1);
    }
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.name;
      option.textContent = user.name;
      resourceFilter.appendChild(option);
    });
    restoreTaskFilterSelect(resourceFilter, 'taskFilterResource');
  }
}

function renderTaskCardForView(task) {
  const isEditing = state.editingTasks.has(task.id);
  const isCompleted = task.status === 'completed';
  const projectId = task.projectId;
  const milestoneId = task.milestoneId;
  
  if (isEditing) {
    const statuses = storage.getStatuses();
    const priorities = storage.getPriorities();
    const effortLevels = storage.getEffortLevels();
    const users = storage.getUsers();
    
    const statusOptions = statuses.map(s => 
      `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
    ).join('');
    
    const effortOptions = effortLevels.map(e => 
      `<option value="${e.id}" ${task.effortLevel === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
    ).join('');
    
    const userOptions = users.map(u => 
      `<option value="${u.name}" ${task.assignedResource === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
    ).join('');
    
    return `
      <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
        <input type="text" class="edit-title" value="${escapeHtml(task.title)}" data-task-id="${task.id}">
        <textarea class="edit-description" data-task-id="${task.id}">${escapeHtml(task.description || '')}</textarea>
        <div class="form-row">
          <div class="form-group">
            <label>Status</label>
            <select class="edit-status" data-task-id="${task.id}">
              ${statusOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Effort</label>
            <select class="edit-effort" data-task-id="${task.id}">
              <option value="">None</option>
              ${effortOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Resource</label>
            <select class="edit-resource" data-task-id="${task.id}">
              <option value="">None</option>
              ${userOptions}
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-task-view" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit-task-view" data-task-id="${task.id}">Cancel</button>
        </div>
      </div>
    `;
  }
  
  const statuses = storage.getStatuses();
  const status = statuses.find(s => s.id === task.status);
  const statusColorStyle = status?.color ? getStatusSelectStyle(status.color) : '';
  
  const statusOptions = statuses.map(s => 
    `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  
  return `
    <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
      <div class="project-card-header">
        <div class="project-card-content" style="flex: 1; min-width: 0;">
          <select class="task-status-select-view" style="${statusColorStyle}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
            ${statusOptions}
          </select>
          <h4>${escapeHtml(task.title)}</h4>
          <p class="text-muted">Project: ${escapeHtml(task.project.title)}</p>
          ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
          <div class="task-meta">
            ${(() => {
              const effortLevels = storage.getEffortLevels();
              const effort = effortLevels.find(e => e.id === task.effortLevel);
              return effort ? `<span>Effort: ${escapeHtml(effort.label)}</span>` : '';
            })()}
            ${task.assignedResource ? `<span>Assigned to: ${escapeHtml(task.assignedResource)}</span>` : ''}
            ${task.startDate ? `<span>Started: ${new Date(task.startDate).toLocaleDateString()}</span>` : ''}
            ${task.completedDate ? `<span>Completed: ${new Date(task.completedDate).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
        <div class="project-card-actions">
          <button class="btn btn-blue btn-xs edit-task-view" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Edit</button>
          <button class="btn btn-red btn-xs delete-task-view" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function attachTaskListenersForView(task) {
  const taskId = task.id;
  const projectId = task.projectId;
  const milestoneId = task.milestoneId;
  
  // Status change
  document.querySelector(`.task-status-select-view[data-task-id="${taskId}"]`)?.addEventListener('change', (e) => {
    try {
      storage.updateTask(projectId, milestoneId, taskId, { status: e.target.value });
      renderTasks();
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert('Failed to update task status');
    }
  });
  
  // Edit task
  document.querySelector(`.edit-task-view[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    state.editingTasks.add(taskId);
    renderTasks();
    // Initialize date picker for task due date after rendering
    setTimeout(() => {
      const dateInput = document.querySelector(`.edit-due-date[data-task-id="${taskId}"]`);
      if (dateInput && !dateInput.flatpickr) {
        const fp = flatpickr(dateInput, {
          dateFormat: 'Y-m-d',
          clickOpens: true,
          allowInput: false,
        });
        // Ensure calendar opens on focus
        dateInput.addEventListener('focus', () => {
          fp.open();
        });
      }
    }, 100);
  });
  
  // Save task
  document.querySelector(`.save-task-view[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    const titleInput = document.querySelector(`.edit-title[data-task-id="${taskId}"]`);
    if (!titleInput) {
      console.warn(`Edit form not found for task ${taskId}`);
      return;
    }

    const descriptionInput = document.querySelector(`.edit-description[data-task-id="${taskId}"]`);
    const statusSelect = document.querySelector(`.edit-status[data-task-id="${taskId}"]`);
    const effortSelect = document.querySelector(`.edit-effort[data-task-id="${taskId}"]`);
    const resourceInput = document.querySelector(`.edit-resource[data-task-id="${taskId}"]`);

    const title = titleInput.value.trim();
    const description = descriptionInput?.value.trim() ?? '';
    const status = statusSelect?.value;
    const effort = effortSelect?.value;
    const resource = resourceInput?.value;

    if (!title) return;
    
    try {
      storage.updateTask(projectId, milestoneId, taskId, {
        title,
        description: description || undefined,
        status,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
      });
      state.editingTasks.delete(taskId);
      renderTasks();
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  });
  
  // Cancel edit task
  document.querySelector(`.cancel-edit-task-view[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    state.editingTasks.delete(taskId);
    renderTasks();
  });
  
  // Delete task
  document.querySelector(`.delete-task-view[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    
    try {
      storage.deleteTask(projectId, milestoneId, taskId);
      renderTasks();
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  });
}

// Helper functions
function renderMilestoneProgressBar(milestone, includeText = false) {
  const { segmentsHtml, completedPercent, statsText } = buildProgressSegments(milestone.tasks || []);
  if (includeText) {
    return `
      <div class="progress-bar-container">
        ${segmentsHtml}
      </div>
      <div class="progress-text">
        <span>${statsText}</span>
        <span class="progress-percentage">${completedPercent}%</span>
      </div>
    `;
  }
  return `
    <div class="milestone-progress-item">
      <div class="milestone-progress-header">
        <span class="milestone-progress-title">${escapeHtml(milestone.title)}</span>
        <span class="milestone-progress-stats">${statsText}</span>
      </div>
      ${renderProgressMeter(segmentsHtml, completedPercent)}
    </div>
  `;
}

function renderUserRequirementProgressBar(userRequirement, linkedTasks, includeText = false) {
  const { segmentsHtml, completedPercent, statsText } = buildProgressSegments(linkedTasks || []);
  if (includeText) {
    return `
      <div class="progress-bar-container">
        ${segmentsHtml}
      </div>
      <div class="progress-text">
        <span>${statsText}</span>
        <span class="progress-percentage">${completedPercent}%</span>
      </div>
    `;
  }
  return renderProgressMeter(segmentsHtml, completedPercent);
}

function renderFunctionalRequirementProgressBar(functionalRequirement, linkedTasks, includeText = false) {
  const { segmentsHtml, completedPercent, statsText } = buildProgressSegments(linkedTasks || []);
  if (includeText) {
    return `
      <div class="progress-bar-container">
        ${segmentsHtml}
      </div>
      <div class="progress-text">
        <span>${statsText}</span>
        <span class="progress-percentage">${completedPercent}%</span>
      </div>
    `;
  }
  return renderProgressMeter(segmentsHtml, completedPercent);
}

function buildProgressSegments(tasks = []) {
  const statuses = storage.getStatuses();
  const totalTasks = tasks.length;
  const statusCounts = {};
  statuses.forEach(status => {
    statusCounts[status.id] = tasks.filter(t => t.status === status.id || (!t.status && status.id === 'not-started')).length;
  });

  const segments = statuses.map(status => {
    const count = statusCounts[status.id] || 0;
    if (!count) return '';
    const percent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
    return `<div class="progress-bar-segment" style="width: ${percent}%; background-color: ${status.color};"></div>`;
  }).filter(Boolean);

  const completedCount = statusCounts['completed'] || 0;
  const completedPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const statsText = statuses.map(status => {
    const count = statusCounts[status.id] || 0;
    return count ? `${count} ${status.label.toLowerCase()}` : null;
  }).filter(Boolean).join(', ') || '0 tasks';

  return {
    segmentsHtml: segments.join(''),
    completedPercent,
    statsText,
  };
}

function renderProgressMeter(segmentsHtml, completedPercent) {
  return `
    <div class="progress-meter">
      <span class="progress-meter-percentage">${completedPercent}%</span>
      <div class="progress-bar-container">
        ${segmentsHtml}
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getRiskAssessmentFromFormIds(prefix) {
  const get = (suffix) => {
    const el = document.getElementById(prefix + suffix);
    if (!el || el.value === '') return undefined;
    const n = parseInt(el.value, 10);
    return Number.isNaN(n) ? undefined : n;
  };
  const dataIntegrityRisk = get('data-integrity-risk');
  const securityRisk = get('security-risk');
  const regressionNeed = get('regression-need');
  const frequencyOfUse = get('frequency-of-use');
  const detectability = get('detectability');
  const remediation = get('remediation');
  if (dataIntegrityRisk === undefined && securityRisk === undefined && regressionNeed === undefined &&
      frequencyOfUse === undefined && detectability === undefined && remediation === undefined) {
    return undefined;
  }
  return {
    dataIntegrityRisk: dataIntegrityRisk ?? undefined,
    securityRisk: securityRisk ?? undefined,
    regressionNeed: regressionNeed ?? undefined,
    frequencyOfUse: frequencyOfUse ?? undefined,
    detectability: detectability ?? undefined,
    remediation: remediation ?? undefined,
  };
}

function updateRiskValueDisplay(prefix) {
  const displayId = prefix + 'risk-value-display';
  const el = document.getElementById(displayId);
  if (!el) return;
  const assessment = getRiskAssessmentFromFormIds(prefix);
  const { riskValue } = storage.computeRiskValue(assessment);
  el.textContent = riskValue !== undefined ? String(riskValue) : '—';
  el.classList.toggle('text-muted', riskValue === undefined);
}

function clearRiskAssessmentForm(prefix) {
  const ids = [
    prefix + 'data-integrity-risk',
    prefix + 'security-risk',
    prefix + 'regression-need',
    prefix + 'frequency-of-use',
    prefix + 'detectability',
    prefix + 'remediation',
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  updateRiskValueDisplay(prefix);
}

function getRiskAssessmentFromInlineEdit(requirementId) {
  const factors = ['dataIntegrityRisk', 'securityRisk', 'regressionNeed', 'frequencyOfUse', 'detectability', 'remediation'];
  const assessment = {};
  let hasAny = false;
  factors.forEach((key) => {
    const el = document.querySelector(`.requirement-edit-risk-factor[data-requirement-id="${requirementId}"][data-risk-factor="${key}"]`);
    if (el && el.value !== '') {
      const n = parseInt(el.value, 10);
      if (!Number.isNaN(n)) {
        assessment[key] = n;
        hasAny = true;
      }
    }
  });
  return hasAny ? assessment : null;
}

function getStatusSelectStyle(color) {
  if (!color) return '';
  // Convert hex to rgba with transparency
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `background-color: rgba(${r}, ${g}, ${b}, 0.15); border-color: rgba(${r}, ${g}, ${b}, 0.4); color: ${color};`;
}

function getBadgeStyle(color) {
  if (!color) return '';
  // Convert hex to rgba with transparency
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `background-color: rgba(${r}, ${g}, ${b}, 0.15); border-color: rgba(${r}, ${g}, ${b}, 0.4); color: ${color};`;
}

function populateProjectSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">Select an initiative</option>' +
    state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
}

function populateUserSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const users = storage.getUsers();
  select.innerHTML = '<option value="">None</option>' +
    users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
}

function getObjectiveRowHtml(priorityOptionsHtml, name = '', priorityId = '') {
  return `
    <div class="objective-row" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
      <input type="text" class="objective-name" placeholder="Objective name" value="${escapeHtml(name)}" style="flex: 1; min-width: 0;">
      <select class="objective-priority" style="min-width: 120px;">${priorityOptionsHtml}</select>
      <button type="button" class="btn btn-secondary btn-sm remove-objective-row">Remove</button>
    </div>
  `;
}

function getObjectivePriorityOptionsHtml(selectedId = '') {
  const priorities = storage.getPriorities();
  return '<option value="">None</option>' + priorities.map(p =>
    `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
  ).join('');
}

function populateStakeholderMultiSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const stakeholders = storage.getStakeholders();
  select.innerHTML = stakeholders.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
}

function populateMilestoneSelect(selectId, projectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const project = state.projects.find(p => p.id === projectId);
  if (!project) {
    select.innerHTML = '<option value="">Select a project first</option>';
    return;
  }
  
  select.innerHTML = '<option value="">Select a milestone</option>' +
    project.milestones.map(m => `<option value="${m.id}">${escapeHtml(m.title)}</option>`).join('');
}

function populateUserRequirementsSelect(selectId, projectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const project = state.projects.find(p => p.id === projectId);
  if (!project) {
    select.innerHTML = '';
    return;
  }
  
  const requirements = project.requirements || [];
  select.innerHTML = requirements.map(r => 
    `<option value="${r.id}">${escapeHtml(r.title)}</option>`
  ).join('');
}

function populateRequirementSelect(selectId, projectId, selectedValue = '') {
  const select = document.getElementById(selectId);
  if (!select) return;
  if (!projectId) {
    select.innerHTML = '<option value="">Select an initiative first</option>';
    return;
  }
  const project = storage.getProject(projectId);
  if (!project) {
    select.innerHTML = '<option value="">Select an initiative first</option>';
    return;
  }
  const requirements = project.requirements || [];
  const options = requirements.map(r =>
    `<option value="${r.id}" ${selectedValue === r.id ? 'selected' : ''}>${escapeHtml(r.title)}</option>`
  ).join('');
  select.innerHTML = '<option value="">None</option>' + options;
  if (selectedValue) select.value = selectedValue;
}

function getMilestoneIdFromFunctionalRequirement(projectId, functionalRequirementId) {
  if (!projectId || !functionalRequirementId) return '';
  const project = storage.getProject(projectId);
  if (!project) return '';

  const functionalRequirement = (project.requirements || []).find(fr => fr.id === functionalRequirementId);
  if (!functionalRequirement) return '';

  const milestones = project.milestones || [];
  const defaultMilestoneId = getDefaultMilestoneIdForProject(projectId);
  return defaultMilestoneId || (milestones.length ? milestones[0].id : '');
}

function getDefaultMilestoneIdForProject(projectId) {
  const project = storage.getProject(projectId);
  if (!project || !project.milestones || project.milestones.length === 0) {
    return '';
  }
  return project.milestones[0].id;
}

function populatePrioritySelect(select, selectedValue = '') {
  const priorities = storage.getPriorities();
  const options = priorities.map(p => 
    `<option value="${p.id}" ${selectedValue === p.id ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
  ).join('');
  select.innerHTML = '<option value="">None</option>' + options;
}

function populateStatusSelect(select, selectedValue = '') {
  const statuses = storage.getStatuses();
  const options = statuses.map(s => 
    `<option value="${s.id}" ${selectedValue === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  select.innerHTML = options;
}

function getEffortOptionsHtml(selectedValue = '') {
  const effortLevels = storage.getEffortLevels();
  const options = effortLevels.map(e => 
    `<option value="${e.id}" ${selectedValue === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
  ).join('');
  return '<option value="">None</option>' + options;
}

function populateEffortSelect(select, selectedValue = '') {
  select.innerHTML = getEffortOptionsHtml(selectedValue);
}

function getUserOptionsHtml(selectedValue = '') {
  const users = storage.getUsers();
  const options = users.map(u => 
    `<option value="${u.name}" ${selectedValue === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
  ).join('');
  return '<option value="">None</option>' + options;
}

function populateUserSelectElement(select, selectedValue = '') {
  select.innerHTML = getUserOptionsHtml(selectedValue);
}

function populateObjectiveSelect(selectId, projectId, selectedValue = '') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const project = state.projects.find(p => p.id === projectId);
  if (!projectId || !project) {
    select.innerHTML = '<option value="">None</option>';
    return;
  }
  const objectives = project.objectives || [];
  const options = objectives.map(o =>
    `<option value="${o.id}" ${selectedValue === o.id ? 'selected' : ''}>${escapeHtml(o.name || o.id)}</option>`
  ).join('');
  select.innerHTML = '<option value="">None</option>' + options;
}

function populateRiskSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const selected = select.value || '';
  const riskLevels = storage.getRiskLevels();
  const options = riskLevels.map(r =>
    `<option value="${r.id}" ${selected === r.id ? 'selected' : ''}>${escapeHtml(r.label)}</option>`
  ).join('');
  select.innerHTML = '<option value="">None</option>' + options;
}

function updateAllSelects() {
  // Update new task form selects
  const taskEffortSelect = document.getElementById('task-effort');
  const taskResourceSelect = document.getElementById('task-resource');
  
  if (taskEffortSelect) populateEffortSelect(taskEffortSelect);
  if (taskResourceSelect) populateUserSelectElement(taskResourceSelect);
  
  // Update requirement form risk selects
  populateRiskSelect('requirement-risk');
  populateRiskSelect('edit-requirement-risk');
  
  // Re-render views to update all dynamic selects
  if (currentView === 'projects') {
    renderProjects();
  } else if (currentView === 'tasks') {
    renderTasks();
    populateTaskFilters();
  } else if (currentView === 'capacity') {
    renderCapacity();
  } else if (currentView === 'progress') {
    renderProgress();
  } else if (currentView === 'requirements') {
    renderRequirements();
  }
}

// Attach event listeners to project table rows
function attachProjectListeners(project) {
  const projectId = project.id;

  document.querySelector(`.edit-project-view[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    openEditProjectModal(project);
  });

  document.querySelector(`.delete-project-view[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${project.title}"?`)) return;
    try {
      storage.deleteProject(projectId);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  });
}

function attachMilestoneViewListeners(milestone) {
  const milestoneId = milestone.id;
  const projectId = milestone.projectId;
  
  // Edit milestone
  document.querySelector(`.edit-milestone-view[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    openEditMilestoneModal(milestone);
  });
  
  // Delete milestone
  document.querySelector(`.delete-milestone-view[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${milestone.title}"?`)) return;
    
    try {
      storage.deleteMilestone(projectId, milestoneId);
      renderMilestones();
      renderProjects(); // Also update projects view if visible
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      alert('Failed to delete milestone');
    }
  });
}

function populateProjectSelectForMilestone(selectId, selectedProjectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">Select a project</option>' +
    state.projects.map(p => `<option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('');
}

function attachRequirementViewListeners(requirement) {
  const requirementId = requirement.id;
  const projectId = requirement.projectId;
  
  // Edit requirement inline
  document.querySelector(`.edit-requirement-view[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    if (state.editingRequirements.has(requirementId)) {
      return;
    }
    state.editingRequirements.clear();
    state.editingRequirements.add(requirementId);
    state.activeRequirementLinkId = null;
    renderRequirements();
  });

  // Delete requirement
  document.querySelector(`.delete-requirement-view[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${requirement.title}"?`)) return;
    
    try {
      storage.deleteRequirement(projectId, requirementId);
      renderRequirements();
      renderProjects(); // Also update projects view if visible
      renderFunctionalRequirements();
    } catch (error) {
      console.error('Failed to delete requirement:', error);
      alert('Failed to delete requirement');
    }
  });

  // Project change should refresh objective options
  document.querySelector(`.requirement-edit-project-select[data-requirement-id="${requirementId}"]`)?.addEventListener('change', (e) => {
    refreshRequirementObjectiveOptions(requirementId, e.target.value);
  });

  // Save requirement
  document.querySelector(`.save-edit-requirement[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    const projectSelect = document.querySelector(`.requirement-edit-project-select[data-requirement-id="${requirementId}"]`);
    const objectiveSelect = document.querySelector(`.requirement-edit-objective-select[data-requirement-id="${requirementId}"]`);
    const typeSelect = document.querySelector(`.requirement-edit-type[data-requirement-id="${requirementId}"]`);
    const riskSelect = document.querySelector(`.requirement-edit-risk[data-requirement-id="${requirementId}"]`);
    const trackingIdInput = document.querySelector(`.requirement-edit-tracking[data-requirement-id="${requirementId}"]`);
    const titleInput = document.querySelector(`.requirement-edit-title[data-requirement-id="${requirementId}"]`);
    const descriptionInput = document.querySelector(`.requirement-edit-description[data-requirement-id="${requirementId}"]`);
    
    const newProjectId = projectSelect ? projectSelect.value : '';
    const objectiveId = objectiveSelect ? objectiveSelect.value || undefined : undefined;
    const type = typeSelect ? typeSelect.value || 'user' : 'user';
    const risk = riskSelect ? riskSelect.value || undefined : undefined;
    const trackingId = trackingIdInput ? trackingIdInput.value.trim() : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const riskAssessment = getRiskAssessmentFromInlineEdit(requirementId);
    
    if (!title || !newProjectId) return;
    
    try {
      storage.updateRequirement(newProjectId, requirementId, {
        trackingId: trackingId || undefined,
        title,
        description: description || undefined,
        objectiveId,
        type,
        risk,
        riskAssessment: riskAssessment ?? null
      });
      state.editingRequirements.delete(requirementId);
      renderRequirements();
      renderProjects();
      renderFunctionalRequirements();
    } catch (error) {
      console.error('Failed to update requirement:', error);
      alert('Failed to update requirement');
    }
  });

  // Update inline risk value display when any risk factor changes
  document.querySelectorAll(`.requirement-edit-risk-factor[data-requirement-id="${requirementId}"]`).forEach((el) => {
    el.addEventListener('change', () => {
      const assessment = getRiskAssessmentFromInlineEdit(requirementId);
      const { riskValue } = storage.computeRiskValue(assessment || {});
      const rvSpan = document.querySelector(`.requirement-edit-risk-value-inline[data-requirement-id="${requirementId}"]`);
      if (rvSpan) rvSpan.textContent = riskValue !== undefined ? String(riskValue) : '—';
    });
  });

  // Cancel edit
  document.querySelector(`.cancel-edit-requirement[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    state.editingRequirements.delete(requirementId);
    renderRequirements();
  });

  // Expansion row Close button
  document.querySelector(`.cancel-fr-link[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    state.activeRequirementLinkId = null;
    renderRequirements();
  });

  const row = document.querySelector(`.requirement-row[data-requirement-id="${requirementId}"]`);
  row?.addEventListener('click', (e) => {
    if (e.target.closest('.task-actions-cell') || e.target.closest('button')) {
      return;
    }
    state.activeRequirementLinkId = state.activeRequirementLinkId === requirementId ? null : requirementId;
    renderRequirements();
  });
}

function attachFunctionalRequirementLinkFormListeners(requirement) {
  const requirementId = requirement.id;

  document.querySelector(`.link-existing-fr[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    handleLinkRequirementToExistingFunctionalRequirement(requirement);
  });

  document.querySelector(`.create-fr-and-link[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    handleCreateFunctionalRequirementFromRequirement(requirement);
  });

  document.querySelectorAll(`.unlink-functional-requirement[data-requirement-id="${requirementId}"]`).forEach(button => {
    button.addEventListener('click', () => {
      const functionalRequirementId = button.getAttribute('data-functional-requirement-id');
      if (!functionalRequirementId) return;
      handleUnlinkFunctionalRequirementFromRequirement(requirement, functionalRequirementId);
    });
  });

  document.querySelector(`.cancel-fr-link[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    state.activeRequirementLinkId = null;
    renderRequirements();
  });
}

function handleLinkRequirementToExistingFunctionalRequirement(requirement) {
  const select = document.getElementById(`existing-fr-select-${requirement.id}`);
  if (!select) return;
  const functionalRequirementId = select.value;
  if (!functionalRequirementId) {
    alert('Please select a functional requirement to link.');
    return;
  }

  const project = storage.getProject(requirement.projectId);
  const functionalRequirement = (project?.requirements || []).find(fr => fr.id === functionalRequirementId);
  if (!functionalRequirement) {
    alert('The selected requirement could not be found.');
    return;
  }

  const linkedReqs = new Set(functionalRequirement.linkedUserRequirements || []);
  if (linkedReqs.has(requirement.id)) {
    alert('This requirement is already linked to the selected requirement.');
    return;
  }
  linkedReqs.add(requirement.id);

  try {
    storage.updateRequirement(requirement.projectId, functionalRequirementId, {});
    refreshProjectsState();
    state.activeRequirementLinkId = requirement.id;
    renderFunctionalRequirements();
    renderRequirements();
  } catch (error) {
    console.error('Failed to link requirement:', error);
    alert('Failed to link requirement');
  }
}

function handleUnlinkFunctionalRequirementFromRequirement(requirement, functionalRequirementId) {
  const project = storage.getProject(requirement.projectId);
  const functionalRequirement = (project?.requirements || []).find(fr => fr.id === functionalRequirementId);
  if (!project || !functionalRequirement) {
    alert('The linked requirement could not be found.');
    return;
  }

  const linkedReqs = new Set(functionalRequirement.linkedUserRequirements || []);
  if (!linkedReqs.has(requirement.id)) {
    return;
  }
  linkedReqs.delete(requirement.id);

  try {
    storage.updateRequirement(project.id, functionalRequirementId, {});
    refreshProjectsState();
    renderFunctionalRequirements();
    renderRequirements();
  } catch (error) {
    console.error('Failed to remove link:', error);
    alert('Failed to remove link');
  }
}

function handleCreateFunctionalRequirementFromRequirement(requirement) {
  const titleInput = document.getElementById(`new-fr-title-${requirement.id}`);
  const title = titleInput ? titleInput.value.trim() : '';
  if (!title) {
    alert('Please enter a title for the requirement.');
    return;
  }

  const descriptionInput = document.getElementById(`new-fr-description-${requirement.id}`);
  const description = descriptionInput ? descriptionInput.value.trim() : '';

  try {
    storage.createRequirement(requirement.projectId, {
      title,
      description: description || undefined,
      type: 'system'
    });
    refreshProjectsState();
    state.activeRequirementLinkId = requirement.id;
    renderFunctionalRequirements();
    renderRequirements();
  } catch (error) {
    console.error('Failed to create requirement from requirement view:', error);
    alert('Failed to create requirement');
  }
}

function populateProjectSelectForRequirement(selectId, selectedProjectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">Select a project</option>' +
    state.projects.map(p => `<option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('');
}

function populateProjectSelectForFunctionalRequirement(selectId, selectedProjectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">Select a project</option>' +
    state.projects.map(p => `<option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('');
}

function attachFunctionalRequirementViewListeners(functionalRequirement) {
  const functionalRequirementId = functionalRequirement.id;
  const projectId = functionalRequirement.projectId;
  
  // Edit functional requirement inline
  document.querySelector(`.edit-functional-requirement-view[data-functional-requirement-id="${functionalRequirementId}"]`)?.addEventListener('click', () => {
    if (state.editingFunctionalRequirements.has(functionalRequirementId)) {
      return;
    }
    state.editingFunctionalRequirements.clear();
    state.editingFunctionalRequirements.add(functionalRequirementId);
    state.activeFunctionalRequirementId = null;
    renderFunctionalRequirements();
  });

  document.querySelector(`.functional-requirement-edit-project-select[data-functional-requirement-id="${functionalRequirementId}"]`)?.addEventListener('change', (e) => {
    refreshFunctionalRequirementUserRequirementOptions(functionalRequirementId, e.target.value);
  });

  document.querySelector(`.save-edit-functional-requirement[data-functional-requirement-id="${functionalRequirementId}"]`)?.addEventListener('click', () => {
    const projectSelect = document.querySelector(`.functional-requirement-edit-project-select[data-functional-requirement-id="${functionalRequirementId}"]`);
    const titleInput = document.querySelector(`.functional-requirement-edit-title[data-functional-requirement-id="${functionalRequirementId}"]`);
    const descriptionInput = document.querySelector(`.functional-requirement-edit-description[data-functional-requirement-id="${functionalRequirementId}"]`);
    const userReqSelect = document.querySelector(`.functional-requirement-edit-user-requirements[data-functional-requirement-id="${functionalRequirementId}"]`);

    const newProjectId = projectSelect ? projectSelect.value : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const linkedUserRequirements = userReqSelect
      ? Array.from(userReqSelect.selectedOptions).map(option => option.value).filter(Boolean)
      : [];

    if (!title || !newProjectId) return;

    try {
      storage.updateRequirement(newProjectId, functionalRequirementId, {
        title,
        description: description || undefined
      });
      state.editingFunctionalRequirements.delete(functionalRequirementId);
      renderFunctionalRequirements();
      renderRequirements();
      renderProjects();
    } catch (error) {
      console.error('Failed to update requirement:', error);
      alert('Failed to update functional requirement');
    }
  });

  document.querySelector(`.cancel-edit-functional-requirement[data-functional-requirement-id="${functionalRequirementId}"]`)?.addEventListener('click', () => {
    state.editingFunctionalRequirements.delete(functionalRequirementId);
    renderFunctionalRequirements();
  });
  
  // Delete functional requirement
  document.querySelector(`.delete-functional-requirement-view[data-functional-requirement-id="${functionalRequirementId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${functionalRequirement.title}"?`)) return;
    
    try {
      storage.deleteFunctionalRequirement(projectId, functionalRequirementId);
      renderFunctionalRequirements();
      renderRequirements();
      renderProjects(); // Also update projects view if visible
    } catch (error) {
      console.error('Failed to delete functional requirement:', error);
      alert('Failed to delete functional requirement');
    }
  });

  const row = document.querySelector(`.functional-requirement-row[data-functional-requirement-id="${functionalRequirementId}"]`);
  row?.addEventListener('click', (e) => {
    if (e.target.closest('.task-actions-cell') || e.target.closest('button')) {
      return;
    }
    state.activeFunctionalRequirementId = state.activeFunctionalRequirementId === functionalRequirementId ? null : functionalRequirementId;
    renderFunctionalRequirements();
  });

  if (state.activeFunctionalRequirementId === functionalRequirementId) {
    attachFunctionalRequirementExpansionListeners(functionalRequirement);
  }
}

function attachMilestoneListeners(projectId, milestone) {
  const milestoneId = milestone.id;
  
  // Edit milestone
  document.querySelector(`.edit-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.editingMilestones.add(milestoneId);
    renderProjects();
    // Initialize date picker for milestone target date after rendering
    setTimeout(() => {
      const targetDateInput = document.querySelector(`.edit-target-date[data-milestone-id="${milestoneId}"]`);
      if (targetDateInput && !targetDateInput.flatpickr) {
        const fp = flatpickr(targetDateInput, {
          dateFormat: 'Y-m-d',
          clickOpens: true,
          allowInput: false,
        });
        // Ensure calendar opens on focus
        targetDateInput.addEventListener('focus', () => {
          fp.open();
        });
      }
    }, 100);
  });
  
  // Save milestone
  document.querySelector(`.save-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-milestone-id="${milestoneId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-milestone-id="${milestoneId}"]`).value.trim();
    const targetDateInput = document.querySelector(`.edit-target-date[data-milestone-id="${milestoneId}"]`);
    const targetDate = targetDateInput ? (targetDateInput.flatpickr ? targetDateInput.flatpickr.input.value : targetDateInput.value) : '';
    
    if (!title) return;
    
    try {
      storage.updateMilestone(projectId, milestoneId, { 
        title, 
        description: description || undefined,
        targetDate: targetDate || undefined
      });
      state.editingMilestones.delete(milestoneId);
      loadProjects();
    } catch (error) {
      console.error('Failed to update milestone:', error);
      alert('Failed to update milestone');
    }
  });
  
  // Cancel edit milestone
  document.querySelector(`.cancel-edit-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.editingMilestones.delete(milestoneId);
    renderProjects();
  });
  
  // Delete milestone
  document.querySelector(`.delete-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${milestone.title}"?`)) return;
    
    try {
      storage.deleteMilestone(projectId, milestoneId);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      alert('Failed to delete milestone');
    }
  });
  
  // Cancel add task
  document.querySelector(`.cancel-add-task[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.showAddTask.delete(milestoneId);
    renderProjects();
  });
  
  // Add task form
  document.querySelector(`.add-task-form[data-milestone-id="${milestoneId}"]`)?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = e.target.querySelector('.task-title-input').value.trim();
    const description = e.target.querySelector('.task-description-input').value.trim();
    const dueDateInput = e.target.querySelector('.task-due-date-input');
    const dueDate = dueDateInput ? (dueDateInput.flatpickr ? dueDateInput.flatpickr.input.value : dueDateInput.value) : '';
    
    if (!title) return;
    
    try {
      storage.createTask(projectId, milestoneId, { 
        title, 
        description: description || undefined,
        dueDate: dueDate || undefined
      });
      state.showAddTask.delete(milestoneId);
      loadProjects();
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  });
  
  // Initialize date pickers for inline forms after rendering
  setTimeout(() => {
    // Initialize milestone target date picker
    const milestoneDateInput = document.querySelector(`.milestone-target-date-input[data-project-id="${projectId}"]`);
    if (milestoneDateInput && !milestoneDateInput.flatpickr) {
      const fp = flatpickr(milestoneDateInput, {
        dateFormat: 'Y-m-d',
        clickOpens: true,
        allowInput: false,
      });
      milestoneDateInput.addEventListener('focus', () => {
        fp.open();
      });
    }
    
    // Initialize task due date picker
    const taskDateInput = document.querySelector(`.task-due-date-input[data-milestone-id="${milestoneId}"]`);
    if (taskDateInput && !taskDateInput.flatpickr) {
      const fp = flatpickr(taskDateInput, {
        dateFormat: 'Y-m-d',
        clickOpens: true,
        allowInput: false,
      });
      taskDateInput.addEventListener('focus', () => {
        fp.open();
      });
    }
  }, 100);
  
  // Task listeners
  milestone.tasks.forEach(task => {
    attachTaskListeners(projectId, milestoneId, task);
  });
}

function attachTaskListeners(projectId, milestoneId, task) {
  const taskId = task.id;
  
  // Status change
  document.querySelector(`.task-status-select[data-task-id="${taskId}"]`)?.addEventListener('change', (e) => {
    try {
      storage.updateTask(projectId, milestoneId, taskId, { status: e.target.value });
      loadProjects();
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert('Failed to update task status');
    }
  });
  
  // Edit task
  document.querySelector(`.edit-task[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    state.editingTasks.add(taskId);
    renderProjects();
    // Initialize date picker for task due date after rendering
    setTimeout(() => {
      const dateInput = document.querySelector(`.edit-due-date[data-task-id="${taskId}"]`);
      if (dateInput && !dateInput.flatpickr) {
        const fp = flatpickr(dateInput, {
          dateFormat: 'Y-m-d',
          clickOpens: true,
          allowInput: false,
        });
        // Ensure calendar opens on focus
        dateInput.addEventListener('focus', () => {
          fp.open();
        });
      }
    }, 100);
  });
  
  // Save task
  document.querySelector(`.save-task[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-task-id="${taskId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-task-id="${taskId}"]`).value.trim();
    const status = document.querySelector(`.edit-status[data-task-id="${taskId}"]`).value;
    const priority = document.querySelector(`.edit-priority[data-task-id="${taskId}"]`).value;
    const effort = document.querySelector(`.edit-effort[data-task-id="${taskId}"]`).value;
    const resource = document.querySelector(`.edit-resource[data-task-id="${taskId}"]`).value;
    const dueDateInput = document.querySelector(`.edit-due-date[data-task-id="${taskId}"]`);
    const dueDate = dueDateInput ? (dueDateInput.flatpickr ? dueDateInput.flatpickr.input.value : dueDateInput.value) : '';
    
    if (!title) return;
    
    try {
      storage.updateTask(projectId, milestoneId, taskId, {
        title,
        description: description || undefined,
        status,
        priority: priority || undefined,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
        dueDate: dueDate || undefined,
      });
      state.editingTasks.delete(taskId);
      loadProjects();
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  });
  
  // Cancel edit task
  document.querySelector(`.cancel-edit-task[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    state.editingTasks.delete(taskId);
    renderProjects();
  });
  
  // Delete task
  document.querySelector(`.delete-task[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    
    try {
      storage.deleteTask(projectId, milestoneId, taskId);
      loadProjects();
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  });
}

// ============================================
// Settings Page Functions
// ============================================

function renderSettings() {
  renderWorkspaceSection();
  renderUsers();
  renderStakeholders();
  renderPriorities();
  renderStatuses();
  renderEffortLevels();
}

function renderWorkspaceSection() {
  const input = elements.workspaceNameInput;
  if (!input) return;
  input.value = storage.getWorkspaceName();
}

function renderUsers() {
  if (!elements.usersList) return;
  
  const users = storage.getUsers();
  
  if (users.length === 0) {
    elements.usersList.innerHTML = '<p class="text-muted">No users yet. Add one above!</p>';
    return;
  }
  
  elements.usersList.innerHTML = users.map(user => {
    const isEditing = state.editingMetadata.get(`user-${user.id}`);
    
    if (isEditing) {
      return `
        <div class="metadata-item-editing" data-user-id="${user.id}">
          <input type="text" class="edit-user-name" value="${escapeHtml(user.name)}" data-user-id="${user.id}">
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-user" data-user-id="${user.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-user" data-user-id="${user.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="metadata-item" data-user-id="${user.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-label">${escapeHtml(user.name)}</span>
        </div>
        <div class="metadata-item-actions">
          <button class="btn btn-blue btn-xs edit-user" data-user-id="${user.id}">Edit</button>
          <button class="btn btn-red btn-xs delete-user" data-user-id="${user.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  users.forEach(user => {
    attachUserListeners(user);
  });
}

function renderStakeholders() {
  const list = elements.stakeholdersList;
  if (!list) return;
  const stakeholders = storage.getStakeholders();
  if (stakeholders.length === 0) {
    list.innerHTML = '<p class="text-muted">No stakeholders yet. Add one above!</p>';
    return;
  }
  list.innerHTML = stakeholders.map(s => {
    const isEditing = state.editingMetadata.get(`stakeholder-${s.id}`);
    if (isEditing) {
      return `
        <div class="metadata-item-editing" data-stakeholder-id="${s.id}">
          <input type="text" class="edit-stakeholder-name" value="${escapeHtml(s.name)}" data-stakeholder-id="${s.id}">
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-stakeholder" data-stakeholder-id="${s.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-stakeholder" data-stakeholder-id="${s.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    return `
      <div class="metadata-item" data-stakeholder-id="${s.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-label">${escapeHtml(s.name)}</span>
        </div>
        <div class="metadata-item-actions">
          <button class="btn btn-blue btn-xs edit-stakeholder" data-stakeholder-id="${s.id}">Edit</button>
          <button class="btn btn-red btn-xs delete-stakeholder" data-stakeholder-id="${s.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  stakeholders.forEach(s => attachStakeholderListeners(s));
}

function renderPriorities() {
  if (!elements.prioritiesList) return;
  
  const priorities = storage.getPriorities();
  
  if (priorities.length === 0) {
    elements.prioritiesList.innerHTML = '<p class="text-muted">No priorities yet. Add one above!</p>';
    return;
  }
  
  elements.prioritiesList.innerHTML = priorities.map(priority => {
    const isEditing = state.editingMetadata.get(`priority-${priority.id}`);
    
    if (isEditing) {
      const currentColor = priority.color || '#71717a';
      return `
        <div class="metadata-item-editing" data-priority-id="${priority.id}">
          <input type="text" class="edit-priority-label" value="${escapeHtml(priority.label)}" data-priority-id="${priority.id}" placeholder="Label">
          <div class="form-group">
            <label>Color</label>
            <div class="color-input-group">
              <input type="color" class="edit-priority-color" value="${currentColor}" data-priority-id="${priority.id}">
              <input type="text" class="edit-priority-color-text color-text-input" value="${currentColor}" placeholder="#71717a" data-priority-id="${priority.id}">
            </div>
          </div>
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-priority" data-priority-id="${priority.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-priority" data-priority-id="${priority.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    const colorStyle = priority.color ? `style="background-color: ${priority.color};"` : '';
    return `
      <div class="metadata-item" data-priority-id="${priority.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-color-swatch" ${colorStyle}></span>
          <span class="metadata-item-label">${escapeHtml(priority.label)}</span>
        </div>
        <div class="metadata-item-actions">
          <button class="btn btn-blue btn-xs edit-priority-item" data-priority-id="${priority.id}">Edit</button>
          <button class="btn btn-red btn-xs delete-priority-item" data-priority-id="${priority.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  priorities.forEach(priority => {
    attachPriorityListeners(priority);
  });
  
  // Setup drag-and-drop for priorities
  setupDragAndDrop('priorities-list', 'priority', (ids) => {
    storage.reorderPriorities(ids);
    updateAllSelects();
  });
}

function renderStatuses() {
  if (!elements.statusesList) return;
  
  const statuses = storage.getStatuses();
  
  if (statuses.length === 0) {
    elements.statusesList.innerHTML = '<p class="text-muted">No statuses yet. Add one above!</p>';
    return;
  }
  
  elements.statusesList.innerHTML = statuses.map(status => {
    const isEditing = state.editingMetadata.get(`status-${status.id}`);
    
    if (isEditing) {
      const currentColor = status.color || '#71717a';
      return `
        <div class="metadata-item-editing" data-status-id="${status.id}">
          <input type="text" class="edit-status-label" value="${escapeHtml(status.label)}" data-status-id="${status.id}" placeholder="Label">
          <div class="form-group">
            <label>Color</label>
            <div class="color-input-group">
              <input type="color" class="edit-status-color" value="${currentColor}" data-status-id="${status.id}">
              <input type="text" class="edit-status-color-text color-text-input" value="${currentColor}" placeholder="#71717a" data-status-id="${status.id}">
            </div>
          </div>
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-status" data-status-id="${status.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-status" data-status-id="${status.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    const colorStyle = status.color ? `style="background-color: ${status.color};"` : '';
    return `
      <div class="metadata-item" data-status-id="${status.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-color-swatch" ${colorStyle}></span>
          <span class="metadata-item-label">${escapeHtml(status.label)}</span>
        </div>
        <div class="metadata-item-actions">
          <button class="btn btn-blue btn-xs edit-status-item" data-status-id="${status.id}">Edit</button>
          <button class="btn btn-red btn-xs delete-status-item" data-status-id="${status.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  statuses.forEach(status => {
    attachStatusListeners(status);
  });
  
  // Setup drag-and-drop for statuses
  setupDragAndDrop('statuses-list', 'status', (ids) => {
    storage.reorderStatuses(ids);
    updateAllSelects();
  });
}

function renderEffortLevels() {
  if (!elements.effortLevelsList) return;
  
  const effortLevels = storage.getEffortLevels();
  
  if (effortLevels.length === 0) {
    elements.effortLevelsList.innerHTML = '<p class="text-muted">No effort levels yet. Add one above!</p>';
    return;
  }
  
  elements.effortLevelsList.innerHTML = effortLevels.map(effort => {
    const isEditing = state.editingMetadata.get(`effort-${effort.id}`);
    
    if (isEditing) {
      const currentColor = effort.color || '#71717a';
      return `
        <div class="metadata-item-editing" data-effort-id="${effort.id}">
          <input type="text" class="edit-effort-label" value="${escapeHtml(effort.label)}" data-effort-id="${effort.id}" placeholder="Label">
          <div class="form-group">
            <label>Color</label>
            <div class="color-input-group">
              <input type="color" class="edit-effort-color" value="${currentColor}" data-effort-id="${effort.id}">
              <input type="text" class="edit-effort-color-text color-text-input" value="${currentColor}" placeholder="#71717a" data-effort-id="${effort.id}">
            </div>
          </div>
          <div class="form-group">
            <label>Points</label>
            <input type="number" min="0" step="0.5" class="edit-effort-points" data-effort-id="${effort.id}" value="${Number.isFinite(Number(effort.points)) ? effort.points : 0}">
          </div>
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-effort" data-effort-id="${effort.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-effort" data-effort-id="${effort.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    const colorStyle = effort.color ? `style="background-color: ${effort.color};"` : '';
    return `
      <div class="metadata-item" data-effort-id="${effort.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-color-swatch" ${colorStyle}></span>
          <div class="metadata-item-details">
            <span class="metadata-item-label">${escapeHtml(effort.label)}</span>
            <span class="metadata-item-points">${formatCapacityPoints(Number.isFinite(Number(effort.points)) ? effort.points : 0)} pts</span>
          </div>
        </div>
        <div class="metadata-item-actions">
          <button class="btn btn-blue btn-xs edit-effort-item" data-effort-id="${effort.id}">Edit</button>
          <button class="btn btn-red btn-xs delete-effort-item" data-effort-id="${effort.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  effortLevels.forEach(effort => {
    attachEffortListeners(effort);
  });
  
  // Setup drag-and-drop for effort levels
  setupDragAndDrop('effort-levels-list', 'effort', (ids) => {
    storage.reorderEffortLevels(ids);
    updateAllSelects();
  });
}

function setupDragAndDrop(listId, typePrefix, reorderCallback) {
  const list = document.getElementById(listId);
  if (!list) return;
  
  let draggedElement = null;
  let draggedIndex = -1;
  
  // Get all draggable items
  const items = Array.from(list.querySelectorAll(`.metadata-item[data-${typePrefix}-id]`));
  
  items.forEach((item, index) => {
    item.draggable = true;
    item.dataset.index = index;
    
    item.addEventListener('dragstart', (e) => {
      draggedElement = item;
      draggedIndex = index;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', item.innerHTML);
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      items.forEach(i => i.classList.remove('drag-over'));
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const afterElement = getDragAfterElement(list, e.clientY);
      const currentTarget = e.currentTarget;
      
      items.forEach(i => i.classList.remove('drag-over'));
      
      if (afterElement == null) {
        currentTarget.classList.add('drag-over');
      } else {
        afterElement.classList.add('drag-over');
      }
    });
    
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      
      if (draggedElement === null) return;
      
      const afterElement = getDragAfterElement(list, e.clientY);
      const currentTarget = e.currentTarget;
      
      if (afterElement == null) {
        list.appendChild(draggedElement);
      } else {
        list.insertBefore(draggedElement, afterElement);
      }
      
      // Get new order of IDs
      const newItems = Array.from(list.querySelectorAll(`.metadata-item[data-${typePrefix}-id]`));
      const newIds = newItems.map(i => {
        // Extract ID from data attribute based on type
        if (typePrefix === 'priority') return i.dataset.priorityId;
        if (typePrefix === 'status') return i.dataset.statusId;
        if (typePrefix === 'effort') return i.dataset.effortId;
        return null;
      }).filter(id => id !== null);
      
      // Update order
      reorderCallback(newIds);
      
      // Re-render to update
      renderSettings();
    });
    
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.metadata-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function setupSettingsEventListeners() {
  elements.workspaceNameForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = elements.workspaceNameInput;
    if (!input) return;

    try {
      storage.setWorkspaceName(input.value.trim());
      updateWorkspaceTitle();
      renderSettings();
    } catch (error) {
      console.error('Failed to update workspace name:', error);
      alert('Failed to update workspace name');
    }
  });

  // Users
  document.getElementById('add-user-btn')?.addEventListener('click', () => {
    document.getElementById('add-user-form').style.display = 'block';
    document.getElementById('add-user-btn').style.display = 'none';
    document.getElementById('user-name').focus();
  });

  document.getElementById('cancel-user-btn')?.addEventListener('click', () => {
    document.getElementById('add-user-form').style.display = 'none';
    document.getElementById('add-user-btn').style.display = 'block';
    document.getElementById('user-name').value = '';
  });

  document.getElementById('add-user-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('user-name').value.trim();
    
    if (!name) return;
    
    try {
      storage.addUser(name);
      document.getElementById('user-name').value = '';
      document.getElementById('add-user-form').style.display = 'none';
      document.getElementById('add-user-btn').style.display = 'block';
      renderSettings();
      updateAllSelects(); // Update all selects with new metadata
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user');
    }
  });

  // Stakeholders
  document.getElementById('add-stakeholder-btn')?.addEventListener('click', () => {
    document.getElementById('add-stakeholder-form').style.display = 'block';
    document.getElementById('add-stakeholder-btn').style.display = 'none';
    document.getElementById('stakeholder-name').focus();
  });
  document.getElementById('cancel-stakeholder-btn')?.addEventListener('click', () => {
    document.getElementById('add-stakeholder-form').style.display = 'none';
    document.getElementById('add-stakeholder-btn').style.display = 'block';
    document.getElementById('stakeholder-name').value = '';
  });
  document.getElementById('add-stakeholder-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('stakeholder-name').value.trim();
    if (!name) return;
    try {
      storage.addStakeholder(name);
      document.getElementById('stakeholder-name').value = '';
      document.getElementById('add-stakeholder-form').style.display = 'none';
      document.getElementById('add-stakeholder-btn').style.display = 'block';
      renderSettings();
      updateAllSelects();
    } catch (err) {
      console.error('Failed to add stakeholder:', err);
      alert('Failed to add stakeholder');
    }
  });

  // Priorities
  document.getElementById('add-priority-btn')?.addEventListener('click', () => {
    document.getElementById('add-priority-form').style.display = 'block';
    document.getElementById('add-priority-btn').style.display = 'none';
    document.getElementById('priority-label').focus();
  });

  document.getElementById('cancel-priority-btn')?.addEventListener('click', () => {
    document.getElementById('add-priority-form').style.display = 'none';
    document.getElementById('add-priority-btn').style.display = 'block';
    document.getElementById('priority-label').value = '';
    document.getElementById('priority-color').value = '#71717a';
    document.getElementById('priority-color-text').value = '#71717a';
  });

  document.getElementById('add-priority-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('priority-label').value.trim();
    const color = document.getElementById('priority-color').value || '#71717a';
    
    if (!label) return;
    
    try {
      storage.addPriority(label, color);
      document.getElementById('priority-label').value = '';
      document.getElementById('priority-color').value = '#71717a';
      document.getElementById('priority-color-text').value = '#71717a';
      document.getElementById('add-priority-form').style.display = 'none';
      document.getElementById('add-priority-btn').style.display = 'block';
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to add priority:', error);
      alert('Failed to add priority');
    }
  });

  // Statuses
  document.getElementById('add-status-btn')?.addEventListener('click', () => {
    document.getElementById('add-status-form').style.display = 'block';
    document.getElementById('add-status-btn').style.display = 'none';
    document.getElementById('status-label').focus();
  });

  document.getElementById('cancel-status-btn')?.addEventListener('click', () => {
    document.getElementById('add-status-form').style.display = 'none';
    document.getElementById('add-status-btn').style.display = 'block';
    document.getElementById('status-label').value = '';
    document.getElementById('status-color').value = '#71717a';
    document.getElementById('status-color-text').value = '#71717a';
  });

  document.getElementById('add-status-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('status-label').value.trim();
    const color = document.getElementById('status-color').value || '#71717a';
    
    if (!label) return;
    
    try {
      storage.addStatus(label, color);
      document.getElementById('status-label').value = '';
      document.getElementById('status-color').value = '#71717a';
      document.getElementById('status-color-text').value = '#71717a';
      document.getElementById('add-status-form').style.display = 'none';
      document.getElementById('add-status-btn').style.display = 'block';
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to add status:', error);
      alert('Failed to add status');
    }
  });

  // Effort Levels
  document.getElementById('add-effort-btn')?.addEventListener('click', () => {
    document.getElementById('add-effort-form').style.display = 'block';
    document.getElementById('add-effort-btn').style.display = 'none';
    document.getElementById('effort-label').focus();
  });
  
  // Color picker sync for add forms
  // Priority color sync
  document.getElementById('priority-color')?.addEventListener('input', (e) => {
    const textInput = document.getElementById('priority-color-text');
    if (textInput) textInput.value = e.target.value;
  });
  document.getElementById('priority-color-text')?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.getElementById('priority-color');
      if (colorInput) colorInput.value = colorValue;
    }
  });
  
  // Status color sync
  document.getElementById('status-color')?.addEventListener('input', (e) => {
    const textInput = document.getElementById('status-color-text');
    if (textInput) textInput.value = e.target.value;
  });
  document.getElementById('status-color-text')?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.getElementById('status-color');
      if (colorInput) colorInput.value = colorValue;
    }
  });
  
  // Effort color sync
  document.getElementById('effort-color')?.addEventListener('input', (e) => {
    const textInput = document.getElementById('effort-color-text');
    if (textInput) textInput.value = e.target.value;
  });
  document.getElementById('effort-color-text')?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.getElementById('effort-color');
      if (colorInput) colorInput.value = colorValue;
    }
  });

  document.getElementById('cancel-effort-btn')?.addEventListener('click', () => {
    document.getElementById('add-effort-form').style.display = 'none';
    document.getElementById('add-effort-btn').style.display = 'block';
    document.getElementById('effort-label').value = '';
    document.getElementById('effort-color').value = '#71717a';
    document.getElementById('effort-color-text').value = '#71717a';
    document.getElementById('effort-points').value = '1';
  });

  document.getElementById('add-effort-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('effort-label').value.trim();
    const color = document.getElementById('effort-color').value || '#71717a';
    const pointsInput = document.getElementById('effort-points');
    const parsedPoints = pointsInput ? Number(pointsInput.value) : 0;
    const points = Number.isFinite(parsedPoints) ? parsedPoints : 0;
    
    if (!label) return;
    
    try {
      storage.addEffortLevel(label, color, points);
      document.getElementById('effort-label').value = '';
      document.getElementById('effort-color').value = '#71717a';
      document.getElementById('effort-color-text').value = '#71717a';
      document.getElementById('effort-points').value = '1';
      document.getElementById('add-effort-form').style.display = 'none';
      document.getElementById('add-effort-btn').style.display = 'block';
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to add effort level:', error);
      alert('Failed to add effort level');
    }
  });

  // Capacity filters
  [
    { id: 'capacity-filter-status', stateKey: 'capacityFilterStatus' },
    { id: 'capacity-filter-project', stateKey: 'capacityFilterProject' },
    { id: 'capacity-filter-milestone', stateKey: 'capacityFilterMilestone' },
    { id: 'capacity-filter-requirement', stateKey: 'capacityFilterRequirement' },
    { id: 'capacity-filter-functional-requirement', stateKey: 'capacityFilterFunctionalRequirement' },
  ].forEach(({ id, stateKey }) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.addEventListener('change', (event) => {
      state[stateKey] = event.target.value;
      renderCapacity();
    });
  });
}

function attachUserListeners(user) {
  const userId = user.id;
  
  document.querySelector(`.edit-user[data-user-id="${userId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.set(`user-${userId}`, true);
    renderSettings();
  });
  
  document.querySelector(`.save-user[data-user-id="${userId}"]`)?.addEventListener('click', () => {
    const name = document.querySelector(`.edit-user-name[data-user-id="${userId}"]`).value.trim();
    
    if (!name) return;
    
    try {
      storage.updateUser(userId, { name });
      state.editingMetadata.delete(`user-${userId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  });
  
  document.querySelector(`.cancel-edit-user[data-user-id="${userId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.delete(`user-${userId}`);
    renderSettings();
  });
  
  document.querySelector(`.delete-user[data-user-id="${userId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${user.name}"?`)) return;
    
    try {
      storage.deleteUser(userId);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  });
}

function attachStakeholderListeners(stakeholder) {
  const id = stakeholder.id;
  document.querySelector(`.edit-stakeholder[data-stakeholder-id="${id}"]`)?.addEventListener('click', () => {
    state.editingMetadata.set(`stakeholder-${id}`, true);
    renderSettings();
  });
  document.querySelector(`.save-stakeholder[data-stakeholder-id="${id}"]`)?.addEventListener('click', () => {
    const name = document.querySelector(`.edit-stakeholder-name[data-stakeholder-id="${id}"]`)?.value?.trim();
    if (!name) return;
    try {
      storage.updateStakeholder(id, { name });
      state.editingMetadata.delete(`stakeholder-${id}`);
      renderSettings();
      updateAllSelects();
    } catch (err) {
      console.error('Failed to update stakeholder:', err);
      alert('Failed to update stakeholder');
    }
  });
  document.querySelector(`.cancel-edit-stakeholder[data-stakeholder-id="${id}"]`)?.addEventListener('click', () => {
    state.editingMetadata.delete(`stakeholder-${id}`);
    renderSettings();
  });
  document.querySelector(`.delete-stakeholder[data-stakeholder-id="${id}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${stakeholder.name}"?`)) return;
    try {
      storage.deleteStakeholder(id);
      renderSettings();
      updateAllSelects();
    } catch (err) {
      console.error('Failed to delete stakeholder:', err);
      alert('Failed to delete stakeholder');
    }
  });
}

function attachPriorityListeners(priority) {
  const priorityId = priority.id;
  
  document.querySelector(`.edit-priority-item[data-priority-id="${priorityId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.set(`priority-${priorityId}`, true);
    renderSettings();
  });
  
  document.querySelector(`.save-priority[data-priority-id="${priorityId}"]`)?.addEventListener('click', () => {
    const label = document.querySelector(`.edit-priority-label[data-priority-id="${priorityId}"]`).value.trim();
    const colorInput = document.querySelector(`.edit-priority-color[data-priority-id="${priorityId}"]`);
    const color = colorInput ? colorInput.value : (priority.color || '#71717a');
    
    if (!label) return;
    
    try {
      storage.updatePriority(priorityId, { label, color });
      state.editingMetadata.delete(`priority-${priorityId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update priority:', error);
      alert('Failed to update priority');
    }
  });
  
  // Sync color picker and text input in edit mode
  document.querySelector(`.edit-priority-color[data-priority-id="${priorityId}"]`)?.addEventListener('input', (e) => {
    const textInput = document.querySelector(`.edit-priority-color-text[data-priority-id="${priorityId}"]`);
    if (textInput) textInput.value = e.target.value;
  });
  document.querySelector(`.edit-priority-color-text[data-priority-id="${priorityId}"]`)?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.querySelector(`.edit-priority-color[data-priority-id="${priorityId}"]`);
      if (colorInput) colorInput.value = colorValue;
    }
  });
  
  document.querySelector(`.cancel-edit-priority[data-priority-id="${priorityId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.delete(`priority-${priorityId}`);
    renderSettings();
  });
  
  document.querySelector(`.delete-priority-item[data-priority-id="${priorityId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${priority.label}"?`)) return;
    
    try {
      storage.deletePriority(priorityId);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to delete priority:', error);
      alert('Failed to delete priority');
    }
  });
}

function attachStatusListeners(status) {
  const statusId = status.id;
  
  document.querySelector(`.edit-status-item[data-status-id="${statusId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.set(`status-${statusId}`, true);
    renderSettings();
  });
  
  document.querySelector(`.save-status[data-status-id="${statusId}"]`)?.addEventListener('click', () => {
    const label = document.querySelector(`.edit-status-label[data-status-id="${statusId}"]`).value.trim();
    const colorInput = document.querySelector(`.edit-status-color[data-status-id="${statusId}"]`);
    const color = colorInput ? colorInput.value : (status.color || '#71717a');
    
    if (!label) return;
    
    try {
      storage.updateStatus(statusId, { label, color });
      state.editingMetadata.delete(`status-${statusId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  });
  
  // Sync color picker and text input in edit mode
  document.querySelector(`.edit-status-color[data-status-id="${statusId}"]`)?.addEventListener('input', (e) => {
    const textInput = document.querySelector(`.edit-status-color-text[data-status-id="${statusId}"]`);
    if (textInput) textInput.value = e.target.value;
  });
  document.querySelector(`.edit-status-color-text[data-status-id="${statusId}"]`)?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.querySelector(`.edit-status-color[data-status-id="${statusId}"]`);
      if (colorInput) colorInput.value = colorValue;
    }
  });
  
  document.querySelector(`.cancel-edit-status[data-status-id="${statusId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.delete(`status-${statusId}`);
    renderSettings();
  });
  
  document.querySelector(`.delete-status-item[data-status-id="${statusId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${status.label}"?`)) return;
    
    try {
      storage.deleteStatus(statusId);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to delete status:', error);
      alert('Failed to delete status');
    }
  });
}

function attachEffortListeners(effort) {
  const effortId = effort.id;
  
  document.querySelector(`.edit-effort-item[data-effort-id="${effortId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.set(`effort-${effortId}`, true);
    renderSettings();
  });
  
  document.querySelector(`.save-effort[data-effort-id="${effortId}"]`)?.addEventListener('click', () => {
    const label = document.querySelector(`.edit-effort-label[data-effort-id="${effortId}"]`).value.trim();
    const colorInput = document.querySelector(`.edit-effort-color[data-effort-id="${effortId}"]`);
    const color = colorInput ? colorInput.value : (effort.color || '#71717a');
    const pointsInput = document.querySelector(`.edit-effort-points[data-effort-id="${effortId}"]`);
    const parsedPoints = pointsInput ? Number(pointsInput.value) : effort.points || 0;
    const points = Number.isFinite(parsedPoints) ? parsedPoints : 0;
    
    if (!label) return;
    
    try {
      storage.updateEffortLevel(effortId, { label, color, points });
      state.editingMetadata.delete(`effort-${effortId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update effort level:', error);
      alert('Failed to update effort level');
    }
  });
  
  // Sync color picker and text input in edit mode
  document.querySelector(`.edit-effort-color[data-effort-id="${effortId}"]`)?.addEventListener('input', (e) => {
    const textInput = document.querySelector(`.edit-effort-color-text[data-effort-id="${effortId}"]`);
    if (textInput) textInput.value = e.target.value;
  });
  document.querySelector(`.edit-effort-color-text[data-effort-id="${effortId}"]`)?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.querySelector(`.edit-effort-color[data-effort-id="${effortId}"]`);
      if (colorInput) colorInput.value = colorValue;
    }
  });
  
  document.querySelector(`.cancel-edit-effort[data-effort-id="${effortId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.delete(`effort-${effortId}`);
    renderSettings();
  });
  
  document.querySelector(`.delete-effort-item[data-effort-id="${effortId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${effort.label}"?`)) return;
    
    try {
      storage.deleteEffortLevel(effortId);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to delete effort level:', error);
      alert('Failed to delete effort level');
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

