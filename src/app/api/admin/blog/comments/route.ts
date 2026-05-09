import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export async function GET() {
  try {
    const { data, error } = await insforge.database
      .from('blog_comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('DB Error:', error);
      return NextResponse.json(
        { error: 'Error fetching comments' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Error in comments GET:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
