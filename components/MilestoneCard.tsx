'use client';

import { useState, useEffect } from 'react';
import { Milestone, MilestonePriority } from '@/types';
import TaskCard from './TaskCard';
import { createTask, updateMilestone, deleteMilestone, getProject } from '@/lib/storage-client';

interface MilestoneCardProps {
  projectId: string;
  milestone: Milestone;
  onUpdate: () => void;
}

export default function MilestoneCard({ projectId, milestone, onUpdate }: MilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(milestone.title);
  const [editDescription, setEditDescription] = useState(milestone.description || '');
  const [editPriority, setEditPriority] = useState<MilestonePriority | ''>(milestone.priority || '');
  const [editDueDate, setEditDueDate] = useState(milestone.dueDate ? milestone.dueDate.split('T')[0] : '');
  const [editStakeholders, setEditStakeholders] = useState<string[]>(milestone.stakeholders || []);
  const [newStakeholder, setNewStakeholder] = useState('');
  const [currentMilestone, setCurrentMilestone] = useState(milestone);

  // Refresh milestone data
  const refreshMilestone = () => {
    const project = getProject(projectId);
    if (project) {
      const updated = project.milestones.find(m => m.id === milestone.id);
      if (updated) {
        setCurrentMilestone(updated);
      }
    }
    onUpdate();
  };

  // Sync milestone prop changes
  useEffect(() => {
    setCurrentMilestone(milestone);
  }, [milestone]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      createTask(projectId, milestone.id, {
        title: taskTitle,
        description: taskDescription || undefined,
      });
      setTaskTitle('');
      setTaskDescription('');
      setShowAddTask(false);
      refreshMilestone();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleAddStakeholder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStakeholder.trim() && !editStakeholders.includes(newStakeholder.trim())) {
      setEditStakeholders([...editStakeholders, newStakeholder.trim()]);
      setNewStakeholder('');
    }
  };

  const handleRemoveStakeholder = (name: string) => {
    setEditStakeholders(editStakeholders.filter(s => s !== name));
  };

  const handleUpdateMilestone = () => {
    try {
      updateMilestone(projectId, milestone.id, {
        title: editTitle,
        description: editDescription || undefined,
        priority: editPriority || undefined,
        dueDate: editDueDate || undefined,
        stakeholders: editStakeholders.length > 0 ? editStakeholders : undefined,
      });
      setIsEditing(false);
      refreshMilestone();
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  const handleDeleteMilestone = () => {
    if (!confirm(`Are you sure you want to delete "${displayMilestone.title}"?`)) return;

    try {
      deleteMilestone(projectId, milestone.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    }
  };

  const displayMilestone = currentMilestone || milestone;

  const completedTasks = displayMilestone.tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = displayMilestone.tasks.length;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Milestone title"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Description (optional)"
                rows={2}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as MilestonePriority | '')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editStakeholders.map((stakeholder, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md text-sm"
                    >
                      {stakeholder}
                      <button
                        type="button"
                        onClick={() => handleRemoveStakeholder(stakeholder)}
                        className="ml-2 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStakeholder}
                    onChange={(e) => setNewStakeholder(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStakeholder(e);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Enter stakeholder name"
                  />
                  <button
                    type="button"
                    onClick={handleAddStakeholder}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateMilestone}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(displayMilestone.title);
                    setEditDescription(displayMilestone.description || '');
                    setEditPriority(displayMilestone.priority || '');
                    setEditDueDate(displayMilestone.dueDate ? displayMilestone.dueDate.split('T')[0] : '');
                    setEditStakeholders(displayMilestone.stakeholders || []);
                  }}
                  className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {displayMilestone.title}
                </h3>
                {displayMilestone.priority && (
                  <span
                    className={`px-2 py-1 text-xs rounded font-medium ${
                      displayMilestone.priority === 'high'
                        ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                        : displayMilestone.priority === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    }`}
                  >
                    {displayMilestone.priority.toUpperCase()}
                  </span>
                )}
              </div>
              {displayMilestone.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                  {displayMilestone.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {displayMilestone.dueDate && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Due: {new Date(displayMilestone.dueDate).toLocaleDateString()}
                  </p>
                )}
                {displayMilestone.stakeholders && displayMilestone.stakeholders.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {displayMilestone.stakeholders.map((stakeholder, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {stakeholder}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {completedTasks}/{totalTasks} tasks completed
              </p>
            </>
          )}
        </div>
        {!isEditing && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
            <button
              onClick={() => {
                setIsEditing(true);
                setEditTitle(displayMilestone.title);
                setEditDescription(displayMilestone.description || '');
                setEditPriority(displayMilestone.priority || '');
                setEditDueDate(displayMilestone.dueDate ? displayMilestone.dueDate.split('T')[0] : '');
                setEditStakeholders(displayMilestone.stakeholders || []);
              }}
              className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteMilestone}
              className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isExpanded && !isEditing && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            {!showAddTask ? (
              <button
                onClick={() => setShowAddTask(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                + Add Task
              </button>
            ) : (
              <form onSubmit={handleAddTask} className="space-y-2">
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Task title"
                  autoFocus
                />
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Description (optional)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Add Task
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTask(false);
                      setTaskTitle('');
                      setTaskDescription('');
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="space-y-2">
            {displayMilestone.tasks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                No tasks yet. Add one above!
              </p>
            ) : (
              displayMilestone.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  projectId={projectId}
                  milestoneId={displayMilestone.id}
                  task={task}
                  onUpdate={refreshMilestone}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

