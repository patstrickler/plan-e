import { NextRequest, NextResponse } from 'next/server';
import { updateMilestone, deleteMilestone } from '@/lib/storage';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; milestoneId: string } }
) {
  try {
    const body = await request.json();
    const milestone = updateMilestone(params.id, params.milestoneId, body);
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }
    return NextResponse.json(milestone);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; milestoneId: string } }
) {
  try {
    const deleted = deleteMilestone(params.id, params.milestoneId);
    if (!deleted) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 });
  }
}

