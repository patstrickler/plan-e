'use client';

import { useState, useEffect } from 'react';
import { Milestone, Project } from '@/types';
import { getAllMilestones, getAllProjects, createMilestone } from '@/lib/storage-client';
import Link from 'next/link';

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Array<Milestone & { project: Project }>>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const fetchData = () => {
    try {
      const allMilestones = getAllMilestones();
      const allProjects = getAllProjects();
      setMilestones(allMilestones);
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || !selectedProjectId) return;

    try {
      createMilestone(selectedProjectId, {
        title: milestoneTitle,
        description: milestoneDescription || undefined,
      });
      setMilestoneTitle('');
      setMilestoneDescription('');
      setSelectedProjectId('');
      setShowAddMilestone(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add milestone:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Milestones
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View and manage all milestones across projects
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              ← Projects
            </Link>
          </div>
        </header>

        <div className="mb-6">
          {!showAddMilestone ? (
            <button
              onClick={() => setShowAddMilestone(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all"
            >
              + New Milestone
            </button>
          ) : (
            <form onSubmit={handleAddMilestone} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Create New Milestone
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="milestone-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project *
                  </label>
                  <select
                    id="milestone-project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="milestone-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Milestone Title *
                  </label>
                  <input
                    id="milestone-title"
                    type="text"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter milestone title"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label htmlFor="milestone-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    id="milestone-description"
                    value={milestoneDescription}
                    onChange={(e) => setMilestoneDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter milestone description"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Create Milestone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMilestone(false);
                      setMilestoneTitle('');
                      setMilestoneDescription('');
                      setSelectedProjectId('');
                    }}
                    className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="space-y-4">
          {milestones.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                No milestones yet
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Create your first milestone to get started!
              </p>
            </div>
          ) : (
            milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {milestone.title}
                      </h3>
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                        {milestone.project.title}
                      </span>
                    </div>
                    {milestone.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {milestone.description}
                      </p>
                    )}
                    {milestone.dueDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                        Due: {new Date(milestone.dueDate).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {milestone.tasks.filter(t => t.status === 'completed').length}/{milestone.tasks.length} tasks completed
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

