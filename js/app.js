import * as storage from './storage.js';

// State management
let currentView = 'projects';
const state = {
  projects: [],
  expandedProjects: new Set(),
  editingProjects: new Set(),
  editingMilestones: new Set(),
  editingTasks: new Set(),
  showAddMilestone: new Map(),
  showAddTask: new Map(),
  editingMetadata: new Map(), // For editing metadata items in settings
  taskSearch: '',
  taskFilterStatus: '',
  taskFilterPriority: '',
  taskFilterProject: '',
  taskFilterResource: '',
};

// DOM elements
const elements = {
  loading: document.getElementById('loading'),
  projectsView: document.getElementById('projects-view'),
  milestonesView: document.getElementById('milestones-view'),
  tasksView: document.getElementById('tasks-view'),
  settingsView: document.getElementById('settings-view'),
  projectsList: document.getElementById('projects-list'),
  milestonesList: document.getElementById('milestones-list'),
  tasksList: document.getElementById('tasks-list'),
  newProjectBtn: document.getElementById('new-project-btn'),
  newProjectForm: document.getElementById('new-project-form'),
  newMilestoneBtn: document.getElementById('new-milestone-btn'),
  newMilestoneForm: document.getElementById('new-milestone-form'),
  newTaskBtn: document.getElementById('new-task-btn'),
  newTaskForm: document.getElementById('new-task-form'),
  // Settings elements
  usersList: document.getElementById('users-list'),
  prioritiesList: document.getElementById('priorities-list'),
  statusesList: document.getElementById('statuses-list'),
  effortLevelsList: document.getElementById('effort-levels-list'),
};

// Initialize app
function init() {
  loadProjects();
  setupEventListeners();
  updateAllSelects(); // Initialize all selects with metadata
  hideLoading();
}

function hideLoading() {
  if (elements.loading) {
    elements.loading.style.display = 'none';
  }
}

function loadProjects() {
  try {
    state.projects = storage.getAllProjects();
    renderProjects();
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

// View switching
function showView(viewName) {
  currentView = viewName;
  elements.projectsView.style.display = viewName === 'projects' ? 'block' : 'none';
  elements.milestonesView.style.display = viewName === 'milestones' ? 'block' : 'none';
  elements.tasksView.style.display = viewName === 'tasks' ? 'block' : 'none';
  elements.settingsView.style.display = viewName === 'settings' ? 'block' : 'none';
  
  if (viewName === 'milestones') {
    renderMilestones();
  } else if (viewName === 'tasks') {
    renderTasks();
  } else if (viewName === 'settings') {
    renderSettings();
  }
}

// Event listeners setup
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href === '#projects') showView('projects');
      if (href === '#milestones') showView('milestones');
      if (href === '#tasks') showView('tasks');
      if (href === '#settings') showView('settings');
    });
  });

  document.querySelectorAll('.back-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showView('projects');
    });
  });

  // Project form
  elements.newProjectBtn?.addEventListener('click', () => {
    elements.newProjectForm.style.display = 'block';
    elements.newProjectBtn.style.display = 'none';
    document.getElementById('project-title').focus();
  });

  document.getElementById('cancel-project-btn')?.addEventListener('click', () => {
    elements.newProjectForm.style.display = 'none';
    elements.newProjectBtn.style.display = 'block';
    document.getElementById('project-title').value = '';
    document.getElementById('project-description').value = '';
  });

  elements.newProjectForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-description').value.trim();
    
    if (!title) return;
    
    try {
      storage.createProject({ title, description: description || undefined });
      document.getElementById('project-title').value = '';
      document.getElementById('project-description').value = '';
      elements.newProjectForm.style.display = 'none';
      elements.newProjectBtn.style.display = 'block';
      loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
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
    const targetDate = targetDateInput ? (targetDateInput.flatpickr ? targetDateInput.flatpickr.input.value : targetDateInput.value) : '';
    
    if (!title || !projectId) return;
    
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
      alert('Failed to create milestone');
    }
  });

  // Task form
  elements.newTaskBtn?.addEventListener('click', () => {
    populateProjectSelect('task-project');
    updateAllSelects(); // Populate priority, effort, and resource selects
    // Clear and reset milestone select
    const milestoneSelect = document.getElementById('task-milestone');
    if (milestoneSelect) {
      milestoneSelect.innerHTML = '<option value="">Select a project first</option>';
      milestoneSelect.value = '';
    }
    // Reset project select
    const projectSelect = document.getElementById('task-project');
    if (projectSelect) {
      projectSelect.value = '';
    }
    elements.newTaskForm.style.display = 'block';
    elements.newTaskBtn.style.display = 'none';
    document.getElementById('task-title').focus();
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

  document.getElementById('task-project')?.addEventListener('change', (e) => {
    populateMilestoneSelect('task-milestone', e.target.value);
  });

  document.getElementById('cancel-task-btn')?.addEventListener('click', () => {
    elements.newTaskForm.style.display = 'none';
    elements.newTaskBtn.style.display = 'block';
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-due-date').value = '';
    // Reset project and milestone selects
    const projectSelect = document.getElementById('task-project');
    if (projectSelect) {
      projectSelect.value = '';
    }
    const milestoneSelect = document.getElementById('task-milestone');
    if (milestoneSelect) {
      milestoneSelect.innerHTML = '<option value="">Select a project first</option>';
      milestoneSelect.value = '';
    }
    // Reset other selects
    document.getElementById('task-priority').value = '';
    document.getElementById('task-effort').value = '';
    document.getElementById('task-resource').value = '';
    if (window.taskDueDatePicker) {
      window.taskDueDatePicker.clear();
    }
  });

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
    setTimeout(() => {
      document.getElementById('edit-task-milestone').value = task.milestoneId;
    }, 100);
    
    updateAllSelects(); // Populate priority, effort, and resource selects
    setTimeout(() => {
      const statusSelect = document.getElementById('edit-task-status');
      const prioritySelect = document.getElementById('edit-task-priority');
      const effortSelect = document.getElementById('edit-task-effort');
      const resourceSelect = document.getElementById('edit-task-resource');
      
      if (statusSelect) statusSelect.value = task.status || '';
      if (prioritySelect) prioritySelect.value = task.priority || '';
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

  editTaskForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const taskId = document.getElementById('edit-task-id').value;
    const projectId = document.getElementById('edit-task-project-id').value;
    const milestoneId = document.getElementById('edit-task-milestone-id').value;
    const title = document.getElementById('edit-task-title').value.trim();
    const description = document.getElementById('edit-task-description').value.trim();
    const status = document.getElementById('edit-task-status').value;
    const priority = document.getElementById('edit-task-priority').value;
    const effort = document.getElementById('edit-task-effort').value;
    const resource = document.getElementById('edit-task-resource').value;
    const editDueDateInput = document.getElementById('edit-task-due-date');
    const dueDate = editDueDateInput ? (editDueDateInput.flatpickr ? editDueDateInput.flatpickr.input.value : editDueDateInput.value) : '';
    
    if (!title || !projectId || !milestoneId) return;
    
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
      editTaskForm.style.display = 'none';
      renderTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  });

  document.getElementById('edit-task-project')?.addEventListener('change', (e) => {
    populateMilestoneSelect('edit-task-milestone', e.target.value);
  });

  elements.newTaskForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('task-project').value;
    const milestoneId = document.getElementById('task-milestone').value;
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const priority = document.getElementById('task-priority').value;
    const effort = document.getElementById('task-effort').value;
    const resource = document.getElementById('task-resource').value;
    const dueDateInput = document.getElementById('task-due-date');
    const dueDate = dueDateInput ? (dueDateInput.flatpickr ? dueDateInput.flatpickr.input.value : dueDateInput.value) : '';
    
    if (!title || !projectId || !milestoneId) return;
    
    try {
      storage.createTask(projectId, milestoneId, {
        title,
        description: description || undefined,
        priority: priority || undefined,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
        dueDate: dueDate || undefined,
      });
      document.getElementById('task-title').value = '';
      document.getElementById('task-description').value = '';
      document.getElementById('task-priority').value = '';
      document.getElementById('task-effort').value = '';
      document.getElementById('task-resource').value = '';
      // Reset project and milestone selects
      const projectSelect = document.getElementById('task-project');
      if (projectSelect) {
        projectSelect.value = '';
      }
      const milestoneSelect = document.getElementById('task-milestone');
      if (milestoneSelect) {
        milestoneSelect.innerHTML = '<option value="">Select a project first</option>';
        milestoneSelect.value = '';
      }
      // Clear due date
      if (window.taskDueDatePicker) {
        window.taskDueDatePicker.clear();
      }
      elements.newTaskForm.style.display = 'none';
      elements.newTaskBtn.style.display = 'block';
      renderTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  });

  // Settings event listeners
  setupSettingsEventListeners();
  
  // Task search and filter listeners
  setupTaskSearchAndFilterListeners();
}

function setupTaskSearchAndFilterListeners() {
  const searchInput = document.getElementById('task-search');
  const statusFilter = document.getElementById('task-filter-status');
  const priorityFilter = document.getElementById('task-filter-priority');
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
  
  priorityFilter?.addEventListener('change', (e) => {
    state.taskFilterPriority = e.target.value;
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

// Render functions
function renderProjects() {
  if (!elements.projectsList) return;
  
  if (state.projects.length === 0) {
    elements.projectsList.innerHTML = `
      <div class="empty-state">
        <p>No projects yet</p>
        <p class="empty-state-sub">Create your first project to get started!</p>
      </div>
    `;
    return;
  }
  
  elements.projectsList.innerHTML = state.projects.map(project => renderProjectCard(project)).join('');
  
  // Re-attach event listeners
  state.projects.forEach(project => {
    attachProjectListeners(project);
  });
}

function renderProjectCard(project) {
  const isEditing = state.editingProjects.has(project.id);
  
  if (isEditing) {
    return `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-card-header">
          <div class="project-card-content">
            <input type="text" class="edit-title" value="${escapeHtml(project.title)}" data-project-id="${project.id}">
            <textarea class="edit-description" data-project-id="${project.id}">${escapeHtml(project.description || '')}</textarea>
            <div class="form-actions">
              <button class="btn btn-primary btn-sm save-project" data-project-id="${project.id}">Save</button>
              <button class="btn btn-secondary btn-sm cancel-edit-project" data-project-id="${project.id}">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Calculate progress for each milestone
  const milestoneProgressHtml = project.milestones.length > 0 ? `
    <div class="project-milestones-progress">
      <h3 class="text-sm" style="margin-bottom: 0.75rem; font-weight: 600;">Milestone Progress</h3>
      <div class="milestones-progress-list">
        ${project.milestones.map(m => renderMilestoneProgressBar(m)).join('')}
      </div>
    </div>
  ` : '';
  
  return `
    <div class="project-card" data-project-id="${project.id}">
      <div class="project-card-header">
        <div class="project-card-content">
          <h2>${escapeHtml(project.title)}</h2>
          ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ''}
          <p class="text-xs text-muted">${project.milestones.length} milestone${project.milestones.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="project-card-actions">
          <button class="btn btn-blue btn-sm edit-project" data-project-id="${project.id}">Edit</button>
          <button class="btn btn-red btn-sm delete-project" data-project-id="${project.id}">Delete</button>
        </div>
      </div>
      ${milestoneProgressHtml}
    </div>
  `;
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
    const priorities = storage.getPriorities();
    const effortLevels = storage.getEffortLevels();
    const users = storage.getUsers();
    
    const statusOptions = statuses.map(s => 
      `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
    ).join('');
    
    const priorityOptions = priorities.map(p => 
      `<option value="${p.id}" ${task.priority === p.id ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
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
            <label>Priority</label>
            <select class="edit-priority" data-task-id="${task.id}">
              <option value="">None</option>
              ${priorityOptions}
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
  
  const priorities = storage.getPriorities();
  const priority = priorities.find(p => p.id === task.priority);
  const priorityBadgeStyle = priority?.color ? getBadgeStyle(priority.color) : '';
  
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
          ${task.priority && priority ? `<span class="badge" style="${priorityBadgeStyle}">${escapeHtml(priority.label)}</span>` : ''}
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
  
  const milestones = storage.getAllMilestones();
  
  if (milestones.length === 0) {
    elements.milestonesList.innerHTML = `
      <div class="empty-state">
        <p>No milestones yet</p>
        <p class="empty-state-sub">Create your first milestone to get started!</p>
      </div>
    `;
    return;
  }
  
  elements.milestonesList.innerHTML = milestones.map(m => {
    const isEditing = state.editingMilestones.has(m.id);
    const progressBarHtml = renderMilestoneProgressBar(m, true);
    const completedTasks = m.tasks ? m.tasks.filter(t => t.status === 'completed').length : 0;
    const totalTasks = m.tasks ? m.tasks.length : 0;
    
    if (isEditing) {
      const targetDateValue = m.targetDate ? new Date(m.targetDate).toISOString().split('T')[0] : '';
      return `
        <div class="form-card" data-milestone-id="${m.id}" data-project-id="${m.projectId}">
          <h2>Edit Milestone</h2>
          <div class="form-group">
            <label for="edit-milestone-view-project-${m.id}">Project *</label>
            <select id="edit-milestone-view-project-${m.id}" class="edit-milestone-view-project" data-milestone-id="${m.id}" required></select>
          </div>
          <div class="form-group">
            <label for="edit-milestone-view-title-${m.id}">Milestone Title *</label>
            <input type="text" id="edit-milestone-view-title-${m.id}" class="edit-title-milestone-view" value="${escapeHtml(m.title)}" data-milestone-id="${m.id}" required placeholder="Enter milestone title">
          </div>
          <div class="form-group">
            <label for="edit-milestone-view-description-${m.id}">Description (optional)</label>
            <textarea id="edit-milestone-view-description-${m.id}" class="edit-description-milestone-view" data-milestone-id="${m.id}" rows="3" placeholder="Enter milestone description">${escapeHtml(m.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label for="edit-milestone-view-target-date-${m.id}">Target Date (optional)</label>
            <input type="text" id="edit-milestone-view-target-date-${m.id}" class="edit-target-date-milestone-view" value="${targetDateValue}" data-milestone-id="${m.id}" placeholder="Select target date">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-primary save-milestone-view" data-milestone-id="${m.id}" data-project-id="${m.projectId}">Save Milestone</button>
            <button type="button" class="btn btn-secondary cancel-edit-milestone-view" data-milestone-id="${m.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="milestone-card" data-milestone-id="${m.id}" data-project-id="${m.projectId}">
        <div class="project-card-header">
          <div class="project-card-content">
            <h3>${escapeHtml(m.title)}</h3>
            <p class="text-muted">Project: ${escapeHtml(m.project.title)}</p>
            ${m.description ? `<p>${escapeHtml(m.description)}</p>` : ''}
            ${m.targetDate ? `<p class="text-xs text-muted">Target Date: ${new Date(m.targetDate).toLocaleDateString()}</p>` : ''}
            <p class="text-xs text-muted">${completedTasks}/${totalTasks} tasks completed</p>
            <div class="milestone-progress">
              ${progressBarHtml}
            </div>
          </div>
          <div class="project-card-actions">
            <button class="btn btn-blue btn-xs edit-milestone-view" data-milestone-id="${m.id}" data-project-id="${m.projectId}">Edit</button>
            <button class="btn btn-red btn-xs delete-milestone-view" data-milestone-id="${m.id}" data-project-id="${m.projectId}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners for milestones in the view
  milestones.forEach(milestone => {
    attachMilestoneViewListeners(milestone);
  });
}

function renderTasks() {
  if (!elements.tasksList) return;
  
  const allTasks = storage.getAllTasks();
  
  // Apply filters
  const filteredTasks = filterTasks(allTasks);
  
  if (filteredTasks.length === 0) {
    elements.tasksList.innerHTML = `
      <div class="empty-state">
        <p>No tasks found</p>
        <p class="empty-state-sub">${allTasks.length === 0 ? 'Create your first task to get started!' : 'Try adjusting your search or filters.'}</p>
      </div>
    `;
    return;
  }
  
  // Render table
  elements.tasksList.innerHTML = renderTasksTable(filteredTasks);
  
  // Re-attach event listeners
  filteredTasks.forEach(task => {
    attachTaskListenersForView(task);
  });
  
  // Populate filter dropdowns if not already populated
  populateTaskFilters();
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
        task.milestone.title.toLowerCase().includes(searchLower) ||
        (task.assignedResource && task.assignedResource.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (state.taskFilterStatus && task.status !== state.taskFilterStatus) {
      return false;
    }
    
    // Priority filter
    if (state.taskFilterPriority && task.priority !== state.taskFilterPriority) {
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

function renderTasksTable(tasks) {
  const statuses = storage.getStatuses();
  const priorities = storage.getPriorities();
  const effortLevels = storage.getEffortLevels();
  
  const rows = tasks.map(task => {
    const isEditing = state.editingTasks.has(task.id);
    const isCompleted = task.status === 'completed';
    
    if (isEditing) {
      return renderTaskTableRowEdit(task, statuses, priorities, effortLevels);
    }
    
    const status = statuses.find(s => s.id === task.status);
    const statusColorStyle = status?.color ? getStatusSelectStyle(status.color) : '';
    
    const priority = priorities.find(p => p.id === task.priority);
    const priorityBadgeStyle = priority?.color ? getBadgeStyle(priority.color) : '';
    
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
        <td>
          ${task.priority && priority ? `<span class="badge" style="${priorityBadgeStyle}">${escapeHtml(priority.label)}</span>` : '<span class="text-muted">—</span>'}
        </td>
        <td class="task-title-cell">
          <strong>${escapeHtml(task.title)}</strong>
          ${task.description ? `<div class="task-description-small">${escapeHtml(task.description)}</div>` : ''}
        </td>
        <td class="task-project-cell">${escapeHtml(task.project.title)}</td>
        <td class="task-milestone-cell">${escapeHtml(task.milestone.title)}</td>
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
  
  return `
    <table class="tasks-table">
      <thead>
        <tr>
          <th>Status</th>
          <th>Priority</th>
          <th>Task</th>
          <th>Project</th>
          <th>Milestone</th>
          <th>Effort</th>
          <th>Assigned</th>
          <th>Dates</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderTaskTableRowEdit(task, statuses, priorities, effortLevels) {
  const usersList = storage.getUsers();
  
  const statusOptions = statuses.map(s => 
    `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  
  const priorityOptions = priorities.map(p => 
    `<option value="${p.id}" ${task.priority === p.id ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
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
            <select class="edit-priority" data-task-id="${task.id}">
              <option value="">None</option>
              ${priorityOptions}
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

function populateTaskFilters() {
  const statuses = storage.getStatuses();
  const priorities = storage.getPriorities();
  const projects = storage.getAllProjects();
  const users = storage.getUsers();
  
  // Populate status filter
  const statusFilter = document.getElementById('task-filter-status');
  if (statusFilter && statusFilter.options.length === 1) {
    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status.id;
      option.textContent = status.label;
      statusFilter.appendChild(option);
    });
  }
  
  // Populate priority filter
  const priorityFilter = document.getElementById('task-filter-priority');
  if (priorityFilter && priorityFilter.options.length === 1) {
    priorities.forEach(priority => {
      const option = document.createElement('option');
      option.value = priority.id;
      option.textContent = priority.label;
      priorityFilter.appendChild(option);
    });
  }
  
  // Populate project filter
  const projectFilter = document.getElementById('task-filter-project');
  if (projectFilter && projectFilter.options.length === 1) {
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.title;
      projectFilter.appendChild(option);
    });
  }
  
  // Populate resource filter
  const resourceFilter = document.getElementById('task-filter-resource');
  if (resourceFilter && resourceFilter.options.length === 1) {
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.name;
      option.textContent = user.name;
      resourceFilter.appendChild(option);
    });
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
    
    const priorityOptions = priorities.map(p => 
      `<option value="${p.id}" ${task.priority === p.id ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
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
            <label>Priority</label>
            <select class="edit-priority" data-task-id="${task.id}">
              <option value="">None</option>
              ${priorityOptions}
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
  
  const priorities = storage.getPriorities();
  const priority = priorities.find(p => p.id === task.priority);
  const priorityBadgeStyle = priority?.color ? getBadgeStyle(priority.color) : '';
  
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
          ${task.priority && priority ? `<span class="badge" style="${priorityBadgeStyle}">${escapeHtml(priority.label)}</span>` : ''}
          <h4>${escapeHtml(task.title)}</h4>
          <p class="text-muted">Project: ${escapeHtml(task.project.title)} | Milestone: ${escapeHtml(task.milestone.title)}</p>
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
    const title = document.querySelector(`.edit-title[data-task-id="${taskId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-task-id="${taskId}"]`).value.trim();
    const status = document.querySelector(`.edit-status[data-task-id="${taskId}"]`).value;
    const priority = document.querySelector(`.edit-priority[data-task-id="${taskId}"]`).value;
    const effort = document.querySelector(`.edit-effort[data-task-id="${taskId}"]`).value;
    const resource = document.querySelector(`.edit-resource[data-task-id="${taskId}"]`).value;
    
    if (!title) return;
    
    try {
      storage.updateTask(projectId, milestoneId, taskId, {
        title,
        description: description || undefined,
        status,
        priority: priority || undefined,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
      });
      state.editingTasks.delete(taskId);
      renderTasks();
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
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  });
}

// Helper functions
function renderMilestoneProgressBar(milestone, includeText = false) {
  const statuses = storage.getStatuses();
  const totalTasks = milestone.tasks ? milestone.tasks.length : 0;
  
  // Count tasks by status
  const statusCounts = {};
  statuses.forEach(status => {
    statusCounts[status.id] = milestone.tasks ? milestone.tasks.filter(t => t.status === status.id || (!t.status && status.id === 'not-started')).length : 0;
  });
  
  // Calculate percentages and build segments
  const segments = [];
  const stats = [];
  
  statuses.forEach(status => {
    const count = statusCounts[status.id] || 0;
    if (count > 0) {
      const percent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
      segments.push(`<div class="progress-bar-segment" style="width: ${percent}%; background-color: ${status.color};"></div>`);
      stats.push(`${count} ${status.label.toLowerCase()}`);
    }
  });
  
  const statsText = stats.length > 0 ? stats.join(', ') : '0 tasks';
  const completedCount = statusCounts['completed'] || 0;
  const completedPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  
  if (includeText) {
    return `
      <div class="progress-bar-container">
        ${segments.join('')}
      </div>
      <div class="progress-text">
        <span>${statsText}</span>
        <span class="progress-percentage">${completedPercent}%</span>
      </div>
    `;
  } else {
    return `
      <div class="milestone-progress-item">
        <div class="milestone-progress-header">
          <span class="milestone-progress-title">${escapeHtml(milestone.title)}</span>
          <span class="milestone-progress-stats">${statsText}</span>
        </div>
        <div class="progress-bar-container">
          ${segments.join('')}
        </div>
      </div>
    `;
  }
}
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
  
  select.innerHTML = '<option value="">Select a project</option>' +
    state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
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

function populateEffortSelect(select, selectedValue = '') {
  const effortLevels = storage.getEffortLevels();
  const options = effortLevels.map(e => 
    `<option value="${e.id}" ${selectedValue === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
  ).join('');
  select.innerHTML = '<option value="">None</option>' + options;
}

function populateUserSelect(select, selectedValue = '') {
  const users = storage.getUsers();
  const options = users.map(u => 
    `<option value="${u.name}" ${selectedValue === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
  ).join('');
  select.innerHTML = '<option value="">None</option>' + options;
}

function updateAllSelects() {
  // Update new task form selects
  const taskPrioritySelect = document.getElementById('task-priority');
  const taskEffortSelect = document.getElementById('task-effort');
  const taskResourceSelect = document.getElementById('task-resource');
  
  if (taskPrioritySelect) populatePrioritySelect(taskPrioritySelect);
  if (taskEffortSelect) populateEffortSelect(taskEffortSelect);
  if (taskResourceSelect) populateUserSelect(taskResourceSelect);
  
  // Re-render views to update all dynamic selects
  if (currentView === 'projects') {
    renderProjects();
  } else if (currentView === 'tasks') {
    renderTasks();
    populateTaskFilters();
  }
}

// Attach event listeners to project cards
function attachProjectListeners(project) {
  const projectId = project.id;
  
  // Edit project
  document.querySelector(`.edit-project[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    state.editingProjects.add(projectId);
    renderProjects();
  });
  
  // Save project
  document.querySelector(`.save-project[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-project-id="${projectId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-project-id="${projectId}"]`).value.trim();
    
    if (!title) return;
    
    try {
      storage.updateProject(projectId, { title, description: description || undefined });
      state.editingProjects.delete(projectId);
      loadProjects();
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project');
    }
  });
  
  // Cancel edit project
  document.querySelector(`.cancel-edit-project[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    state.editingProjects.delete(projectId);
    renderProjects();
  });
  
  // Delete project
  document.querySelector(`.delete-project[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${project.title}"?`)) return;
    
    try {
      storage.deleteProject(projectId);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  });
  
  // Cancel add milestone
  document.querySelector(`.cancel-add-milestone[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    state.showAddMilestone.delete(projectId);
    renderProjects();
  });
  
  // Add milestone form
  document.querySelector(`.add-milestone-form[data-project-id="${projectId}"]`)?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = e.target.querySelector('.milestone-title-input').value.trim();
    const description = e.target.querySelector('.milestone-description-input').value.trim();
    const targetDateInput = e.target.querySelector('.milestone-target-date-input');
    const targetDate = targetDateInput ? (targetDateInput.flatpickr ? targetDateInput.flatpickr.input.value : targetDateInput.value) : '';
    
    if (!title) return;
    
    try {
      storage.createMilestone(projectId, { 
        title, 
        description: description || undefined,
        targetDate: targetDate || undefined
      });
      state.showAddMilestone.delete(projectId);
      loadProjects();
    } catch (error) {
      console.error('Failed to create milestone:', error);
      alert('Failed to create milestone');
    }
  });
  
}

function attachMilestoneViewListeners(milestone) {
  const milestoneId = milestone.id;
  const projectId = milestone.projectId;
  
  // Edit milestone
  document.querySelector(`.edit-milestone-view[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.editingMilestones.add(milestoneId);
    renderMilestones();
    // Populate project select and initialize date picker after rendering
    setTimeout(() => {
      const projectSelect = document.querySelector(`.edit-milestone-view-project[data-milestone-id="${milestoneId}"]`);
      if (projectSelect) {
        populateProjectSelectForMilestone(projectSelect.id, projectId);
      }
      
      const targetDateInput = document.querySelector(`.edit-target-date-milestone-view[data-milestone-id="${milestoneId}"]`);
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
  document.querySelector(`.save-milestone-view[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    const titleInput = document.querySelector(`.edit-title-milestone-view[data-milestone-id="${milestoneId}"]`);
    const descriptionInput = document.querySelector(`.edit-description-milestone-view[data-milestone-id="${milestoneId}"]`);
    const projectSelect = document.querySelector(`.edit-milestone-view-project[data-milestone-id="${milestoneId}"]`);
    const targetDateInput = document.querySelector(`.edit-target-date-milestone-view[data-milestone-id="${milestoneId}"]`);
    
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const newProjectId = projectSelect ? projectSelect.value : projectId;
    const targetDate = targetDateInput ? (targetDateInput.flatpickr ? targetDateInput.flatpickr.input.value : targetDateInput.value) : '';
    
    if (!title || !newProjectId) return;
    
    try {
      // If project changed, we need to handle it differently
      // For now, just update within the same project
      storage.updateMilestone(newProjectId, milestoneId, { 
        title, 
        description: description || undefined,
        targetDate: targetDate || undefined
      });
      state.editingMilestones.delete(milestoneId);
      renderMilestones();
      renderProjects(); // Also update projects view if visible
    } catch (error) {
      console.error('Failed to update milestone:', error);
      alert('Failed to update milestone');
    }
  });
  
  // Cancel edit milestone
  document.querySelector(`.cancel-edit-milestone-view[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.editingMilestones.delete(milestoneId);
    renderMilestones();
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
  renderUsers();
  renderPriorities();
  renderStatuses();
  renderEffortLevels();
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
              <input type="text" class="edit-priority-color-text" value="${currentColor}" placeholder="#71717a" class="color-text-input" data-priority-id="${priority.id}">
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
              <input type="text" class="edit-status-color-text" value="${currentColor}" placeholder="#71717a" class="color-text-input" data-status-id="${status.id}">
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
              <input type="text" class="edit-effort-color-text" value="${currentColor}" placeholder="#71717a" class="color-text-input" data-effort-id="${effort.id}">
            </div>
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
          <span class="metadata-item-label">${escapeHtml(effort.label)}</span>
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
  });

  document.getElementById('add-effort-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('effort-label').value.trim();
    const color = document.getElementById('effort-color').value || '#71717a';
    
    if (!label) return;
    
    try {
      storage.addEffortLevel(label, color);
      document.getElementById('effort-label').value = '';
      document.getElementById('effort-color').value = '#71717a';
      document.getElementById('effort-color-text').value = '#71717a';
      document.getElementById('add-effort-form').style.display = 'none';
      document.getElementById('add-effort-btn').style.display = 'block';
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to add effort level:', error);
      alert('Failed to add effort level');
    }
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
    
    if (!label) return;
    
    try {
      storage.updateEffortLevel(effortId, { label, color });
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

