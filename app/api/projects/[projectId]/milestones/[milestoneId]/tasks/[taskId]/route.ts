import { NextRequest, NextResponse } from 'next/server';
import { updateTask, deleteTask } from '@/lib/storage';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; milestoneId: string; taskId: string } }
) {
  try {
    const body = await request.json();
    const task = updateTask(params.projectId, params.milestoneId, params.taskId, body);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; milestoneId: string; taskId: string } }
) {
  try {
    const deleted = deleteTask(params.projectId, params.milestoneId, params.taskId);
    if (!deleted) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

